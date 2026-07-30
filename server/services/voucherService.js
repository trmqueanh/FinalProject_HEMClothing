const voucherModel = require('../models/voucherModel');

const VOUCHER_MESSAGES = {
  invalid: 'Voucher code is invalid.',
  inactive: 'Voucher is inactive.',
  notStarted: 'Voucher has not started yet.',
  expired: 'Voucher has expired.',
  fullyUsed: 'Voucher usage limit has been reached.',
  userLimit: 'You have reached the usage limit for this voucher.',
  minimum: 'Order does not meet the minimum amount required for this voucher.'
};

const toNumber = value => Number(value || 0);

const roundMoney = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizeVoucherCode = value => String(value || '').trim().toUpperCase();

const createVoucherError = message => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const calculateVoucherDiscount = (voucher, subtotalValue) => {
  const subtotal = Math.max(0, toNumber(subtotalValue));
  const discountValue = Math.max(0, toNumber(voucher && voucher.discount_value));
  const discountType = String((voucher && voucher.discount_type) || '').toLowerCase();
  let discountAmount = discountType === 'percent'
    ? subtotal * discountValue / 100
    : discountValue;

  if (discountType === 'percent' && voucher && voucher.max_discount_amount !== null) {
    discountAmount = Math.min(discountAmount, toNumber(voucher.max_discount_amount));
  }

  return roundMoney(Math.min(subtotal, Math.max(0, discountAmount)));
};

const getVoucherAvailability = (voucher, nowValue = new Date()) => {
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  const startDate = voucher && voucher.start_date ? new Date(voucher.start_date) : null;
  const endDate = voucher && voucher.end_date ? new Date(voucher.end_date) : null;
  const usageLimit = voucher && voucher.usage_limit !== null ? Number(voucher.usage_limit) : null;
  const usedCount = Number((voucher && voucher.used_count) || 0);

  if (startDate && now < startDate) {
    return 'not_started';
  }

  if (endDate && now > endDate) {
    return 'expired';
  }

  if (usageLimit !== null && usedCount >= usageLimit) {
    return 'fully_used';
  }

  return 'active';
};

const serializePublicVoucher = (voucher, nowValue = new Date()) => {
  const usageLimit = voucher.usage_limit === null ? null : Number(voucher.usage_limit || 0);
  const usedCount = Number(voucher.used_count || 0);

  return {
    id: String(voucher.id || ''),
    code: String(voucher.code || ''),
    discountType: String(voucher.discount_type || ''),
    discountValue: toNumber(voucher.discount_value),
    minOrderAmount: toNumber(voucher.min_order_amount),
    maxDiscountAmount: voucher.max_discount_amount === null ? null : toNumber(voucher.max_discount_amount),
    startDate: voucher.start_date || null,
    endDate: voucher.end_date || null,
    usageLimit,
    usedCount,
    remainingUses: usageLimit === null ? null : Math.max(0, usageLimit - usedCount),
    status: getVoucherAvailability(voucher, nowValue),
    createdAt: voucher.created_at || null,
    updatedAt: voucher.updated_at || null
  };
};

const voucherRedemptionsAvailable = async db => {
  const result = await voucherModel.redemptionsAvailable(db);

  return Boolean(result.rows[0] && result.rows[0].available);
};

const getVoucherPerUserLimit = voucher => {
  const value = voucher && voucher.per_user_limit;
  return value === null || value === undefined || value === '' ? null : Number(value);
};

const getUserVoucherUsageCount = async (db, voucherId, userId) => {
  if (!userId || !(await voucherRedemptionsAvailable(db))) {
    return 0;
  }

  const result = await voucherModel.getUserUsageCount(db, voucherId, userId);

  return Number((result.rows[0] && result.rows[0].usage_count) || 0);
};

const validateVoucher = async (db, { code, subtotal, userId = null, lock = false }) => {
  const normalizedCode = normalizeVoucherCode(code);
  const normalizedSubtotal = Number(subtotal);

  if (!normalizedCode) {
    throw createVoucherError(VOUCHER_MESSAGES.invalid);
  }

  if (!Number.isFinite(normalizedSubtotal) || normalizedSubtotal < 0) {
    throw createVoucherError(VOUCHER_MESSAGES.minimum);
  }

  const result = await voucherModel.findByCode(db, normalizedCode, { lock });

  if (!result.rowCount) {
    throw createVoucherError(VOUCHER_MESSAGES.invalid);
  }

  const voucher = result.rows[0];
  const currentTime = new Date(voucher.current_time);

  if (String(voucher.status || '').toLowerCase() !== 'active') {
    throw createVoucherError(VOUCHER_MESSAGES.inactive);
  }

  if (voucher.start_date && currentTime < new Date(voucher.start_date)) {
    throw createVoucherError(VOUCHER_MESSAGES.notStarted);
  }

  if (voucher.end_date && currentTime > new Date(voucher.end_date)) {
    throw createVoucherError(VOUCHER_MESSAGES.expired);
  }

  if (voucher.usage_limit !== null && Number(voucher.used_count || 0) >= Number(voucher.usage_limit)) {
    throw createVoucherError(VOUCHER_MESSAGES.fullyUsed);
  }

  if (normalizedSubtotal < toNumber(voucher.min_order_amount)) {
    throw createVoucherError(VOUCHER_MESSAGES.minimum);
  }

  const userUsedCount = await getUserVoucherUsageCount(db, voucher.id, userId);
  const perUserLimit = getVoucherPerUserLimit(voucher);

  if (perUserLimit !== null && userUsedCount >= perUserLimit) {
    throw createVoucherError(VOUCHER_MESSAGES.userLimit);
  }

  return {
    voucher,
    response: {
      voucherCode: String(voucher.code || ''),
      discountType: String(voucher.discount_type || ''),
      discountValue: toNumber(voucher.discount_value),
      discountAmount: calculateVoucherDiscount(voucher, normalizedSubtotal),
      perUserLimit,
      userUsedCount
    }
  };
};

const listEligibleVouchers = async (db, { subtotal, userId }) => {
  const normalizedSubtotal = Math.max(0, Number(subtotal || 0));

  if (!userId || !Number.isFinite(normalizedSubtotal) || normalizedSubtotal <= 0) {
    return [];
  }

  const result = await voucherModel.listEligible(db);
  const redemptionCounts = new Map();

  if (result.rows.length && await voucherRedemptionsAvailable(db)) {
    const usageResult = await voucherModel.listUsageCounts(
      db,
      userId,
      result.rows.map(voucher => voucher.id)
    );

    usageResult.rows.forEach(row => redemptionCounts.set(String(row.voucher_id), Number(row.usage_count || 0)));
  }

  return result.rows
    .map(voucher => {
      const perUserLimit = getVoucherPerUserLimit(voucher);
      const userUsedCount = redemptionCounts.get(String(voucher.id)) || 0;
      const minOrderAmount = toNumber(voucher.min_order_amount);
      const missingAmount = roundMoney(Math.max(0, minOrderAmount - normalizedSubtotal));
      const discountAmount = calculateVoucherDiscount(voucher, normalizedSubtotal);
      const hasUserUsesRemaining = perUserLimit === null || userUsedCount < perUserLimit;

      return {
        ...serializePublicVoucher(voucher, new Date(voucher.current_time)),
        voucherCode: String(voucher.code || ''),
        discountAmount,
        perUserLimit,
        userUsedCount,
        missingAmount,
        isEligible: missingAmount === 0 && discountAmount > 0 && hasUserUsesRemaining,
        unavailableReason: !hasUserUsesRemaining
          ? 'user_limit'
          : missingAmount > 0
            ? 'minimum_order'
            : discountAmount <= 0
              ? 'no_discount'
              : ''
      };
    })
    .sort((left, right) => {
      if (left.isEligible !== right.isEligible) return left.isEligible ? -1 : 1;

      if (!left.isEligible && left.missingAmount !== right.missingAmount) {
        return left.missingAmount - right.missingAmount;
      }

      if (right.discountAmount !== left.discountAmount) {
        return right.discountAmount - left.discountAmount;
      }

      const leftExpiry = left.endDate ? new Date(left.endDate).getTime() : Number.POSITIVE_INFINITY;
      const rightExpiry = right.endDate ? new Date(right.endDate).getTime() : Number.POSITIVE_INFINITY;
      if (leftExpiry !== rightExpiry) return leftExpiry - rightExpiry;
      if (left.minOrderAmount !== right.minOrderAmount) return left.minOrderAmount - right.minOrderAmount;

      const codeOrder = left.code.localeCompare(right.code);
      return codeOrder || left.id.localeCompare(right.id);
    });
};

const createVoucherRedemption = async (db, {
  voucherId,
  voucherCode,
  userId,
  orderId,
  subtotal,
  discountAmount
}) => {
  if (!(await voucherRedemptionsAvailable(db))) {
    return null;
  }

  const result = await voucherModel.createRedemption(db, {
    voucherId,
    voucherCode,
    userId,
    orderId,
    subtotal,
    discountAmount
  });

  return result.rows[0] || null;
};

module.exports = {
  VOUCHER_MESSAGES,
  calculateVoucherDiscount,
  createVoucherRedemption,
  getVoucherAvailability,
  listEligibleVouchers,
  normalizeVoucherCode,
  roundMoney,
  serializePublicVoucher,
  validateVoucher
};
