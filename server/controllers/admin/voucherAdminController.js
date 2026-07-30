// Admin voucher handlers: validation, uniqueness checks, listing, create/update, and soft delete.
module.exports = ({
  buildPaginationPayload,
  getDb,
  parseListQuery,
  sendError,
  serializeVoucher,
  voucherModel
}) => {
  const controller = {};

const normalizeVoucherPayload = body => {
  const code = String(body.code || '').trim().toUpperCase();
  const discountType = String(body.discountType || body.discount_type || '').trim().toLowerCase();
  const discountValue = Number(body.discountValue ?? body.discount_value);
  const minOrderAmount = Number(body.minOrderAmount ?? body.min_order_amount ?? 0);
  const maxDiscountInput = body.maxDiscountAmount ?? body.max_discount_amount;
  const usageLimitInput = body.usageLimit ?? body.usage_limit;
  const maxDiscountAmount = maxDiscountInput === null || maxDiscountInput === ''
    ? null
    : Number(maxDiscountInput);
  const usageLimit = usageLimitInput === null || usageLimitInput === ''
    ? null
    : Number(usageLimitInput);
  const startDate = body.startDate || body.start_date;
  const endDate = body.endDate || body.end_date;
  const status = String(body.status || '').trim().toLowerCase();

  if (!code) {
    const error = new Error('Voucher code is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!['percent', 'fixed'].includes(discountType)) {
    const error = new Error('Discount type must be percent or fixed.');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    const error = new Error('Discount value must be greater than 0.');
    error.statusCode = 400;
    throw error;
  }

  if (discountType === 'percent' && discountValue > 100) {
    const error = new Error('Percent discount value cannot exceed 100.');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
    const error = new Error('Minimum order amount must be 0 or greater.');
    error.statusCode = 400;
    throw error;
  }

  if (maxDiscountAmount !== null && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0)) {
    const error = new Error('Maximum discount amount must be empty or greater than 0.');
    error.statusCode = 400;
    throw error;
  }

  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 0)) {
    const error = new Error('Usage limit must be empty or a whole number 0 or greater.');
    error.statusCode = 400;
    throw error;
  }

  if (!startDate || !endDate || Number.isNaN(new Date(startDate).getTime()) || Number.isNaN(new Date(endDate).getTime())) {
    const error = new Error('Start date and end date are required.');
    error.statusCode = 400;
    throw error;
  }

  if (new Date(endDate) <= new Date(startDate)) {
    const error = new Error('End date must be after start date.');
    error.statusCode = 400;
    throw error;
  }

  if (!['active', 'inactive'].includes(status)) {
    const error = new Error('Status must be active or inactive.');
    error.statusCode = 400;
    throw error;
  }

  return {
    code,
    discountType,
    discountValue,
    minOrderAmount,
    maxDiscountAmount,
    startDate,
    endDate,
    usageLimit,
    status
  };
};

const ensureVoucherCodeUnique = async (db, code, excludedId = null) => {
  const result = await voucherModel.findDuplicateCode(db, code, excludedId);

  if (result.rowCount) {
    const error = new Error('Voucher code already exists.');
    error.statusCode = 409;
    throw error;
  }
};

controller.listVouchers = async (req, res) => {
  try {
    const db = getDb(req);
    const pagination = parseListQuery(req.query, { limit: 10 });
    const result = await voucherModel.listAdmin(db, pagination);

    return res.json({
      items: result.rows.map(serializeVoucher),
      pagination: buildPaginationPayload(pagination, result.total)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.readVoucher = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await voucherModel.findById(db, req.params.voucherId);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Voucher not found.' });
    }

    return res.json({ voucher: serializeVoucher(result.rows[0]) });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.createVoucher = async (req, res) => {
  try {
    const db = getDb(req);
    const payload = normalizeVoucherPayload(req.body);
    await ensureVoucherCodeUnique(db, payload.code);
    const result = await voucherModel.create(db, payload);

    return res.status(201).json({ voucher: serializeVoucher(result.rows[0]) });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.updateVoucher = async (req, res) => {
  try {
    const db = getDb(req);
    const payload = normalizeVoucherPayload(req.body);
    await ensureVoucherCodeUnique(db, payload.code, req.params.voucherId);
    const result = await voucherModel.update(db, req.params.voucherId, payload);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Voucher not found.' });
    }

    return res.json({ voucher: serializeVoucher(result.rows[0]) });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.deleteVoucher = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await voucherModel.softDelete(db, req.params.voucherId);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Voucher not found.' });
    }

    return res.json({ message: 'Voucher deleted successfully.', id: String(result.rows[0].id) });
  } catch (error) {
    return sendError(res, error);
  }
};

  return controller;
};
