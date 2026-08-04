const { isValidUuid } = require('../utils/authUtils');
const voucherModel = require('../models/voucherModel');
const orderModel = require('../models/orderModel');
const checkoutModel = require('../models/checkoutModel');
const cartModel = require('../models/cartModel');
const returnRefundModel = require('../models/returnRefundModel');
const userAddressModel = require('../models/userAddressModel');
const { syncProductInventorySummary } = require('../utils/inventoryUtils');
const {
  createVoucherRedemption,
  listEligibleVouchers,
  normalizeVoucherCode,
  roundMoney,
  validateVoucher
} = require('../services/voucherService');
const { columnExists, tableExists } = require('../utils/databaseSchema');
const { createErrorResponder } = require('../utils/http');
const { normalizeVietnamPhone } = require('../utils/vietnamPhone');
const { buildPaginationPayload, parseOptionalPagination } = require('../utils/pagination');
const createAdminOrderController = require('./order/adminOrderController');
const createCustomerOrderController = require('./order/customerOrderController');
const createCheckoutOrderController = require('./order/checkoutController');
const returnRefundController = require('./returnRefundController');
const {
  notifyBankTransferConfirmed,
  notifyBankTransferReported,
  notifyOrderCreated,
  notifyOrderStatusChanged
} = require('../services/notificationEmailService');
const { expirePendingBankTransfers } = require('../services/bankTransferExpirationService');
const {
  INVENTORY_HOLD_ORDER_STATUSES: INVENTORY_HOLD_STATUSES,
  OPEN_RETURN_STATUSES,
  ORDER_STATUS,
  ORDER_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_METHOD,
  PAYMENT_METHODS,
  PAYMENT_METHOD_ALIASES,
  PAYMENT_STATUSES,
  REFUND_STATUSES: REFUND_REQUEST_STATUSES,
  RETURN_STATUSES: RETURN_REQUEST_STATUSES,
  USER_ROLE
} = require('../constants/domainConstants');

// Order controller root:
// shared checkout/order/inventory helpers stay here; route handlers are grouped in controllers/order/*.
const INVENTORY_LOG_TABLE = 'inventory_logs';

const SHIPPING_FREE_THRESHOLD = 500000;
const DEFAULT_SHIPPING_FEE = 30000;
const DELIVERY_CONFIRMATION_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const DEFAULT_PREVIEW_PALETTE = {
  base: '#efe8df',
  accent: '#1f2430',
  glow: '#faf5ef'
};
const BANK_TRANSFER_CONFIG = {
  bankName: String(process.env.BANK_TRANSFER_BANK_NAME || 'MB Bank').trim(),
  bankId: String(process.env.BANK_TRANSFER_BANK_ID || 'MB').trim(),
  bankBin: String(process.env.BANK_TRANSFER_BANK_BIN || '970422').trim(),
  accountNumber: String(process.env.BANK_TRANSFER_ACCOUNT_NUMBER || '0123456789').trim(),
  accountHolder: String(process.env.BANK_TRANSFER_ACCOUNT_HOLDER || 'HEM CLOTHING').trim(),
  paymentWindowMinutes: Math.max(1, Number(process.env.BANK_TRANSFER_PAYMENT_WINDOW_MINUTES || 10)),
  activationWindowMinutes: Math.max(1, Number(process.env.BANK_TRANSFER_ACTIVATION_WINDOW_MINUTES || 2))
};
let orderStatusHistoryTableAvailable = true;

const getDb = req => req.app.locals.db;

const resolveOrderInsertPaymentValues = async (db, paymentMethod, paymentStatus) => {
  if (paymentMethod !== PAYMENT_METHOD.BANK_TRANSFER) {
    return {
      paymentMethod: PAYMENT_METHOD.COD,
      paymentStatus: serializePaymentStatus(paymentStatus)
    };
  }

  return {
    paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
    paymentStatus: serializePaymentStatus(paymentStatus)
  };
};

const serializePaymentMethod = value => {
  const paymentMethod = String(value || '').toLowerCase();

  return PAYMENT_METHOD_ALIASES[paymentMethod] || paymentMethod;
};

const serializePaymentStatus = value => {
  const paymentStatus = String(value || '').toLowerCase();
  if (paymentStatus === 'pending' || paymentStatus === 'unpaid') return 'pending_payment';
  if (paymentStatus === 'under_review') return 'payment_under_review';
  if (paymentStatus === 'failed') return 'payment_expired';
  if (paymentStatus === 'refund-pending') return 'refund_pending';
  return paymentStatus;
};

const normalizeOrderStatusValue = value => {
  const orderStatus = String(value || '').trim().toLowerCase();

  if (orderStatus === 'shipped') return ORDER_STATUS.SHIPPING;
  if (orderStatus === 'refunded') return ORDER_STATUS.CANCELLED;
  return orderStatus;
};

const serializeOrderStatus = value => normalizeOrderStatusValue(value);

const resolvePaymentStatusForDb = async (db, paymentStatus) => serializePaymentStatus(paymentStatus);

const resolveOrderStatusForDb = async (db, preferredStatus) => serializeOrderStatus(preferredStatus);

const ensureOrderStatusTransition = (currentStatus, nextStatus) => {
  const current = normalizeOrderStatusValue(currentStatus);
  const next = normalizeOrderStatusValue(nextStatus);
  const allowedStatuses = ORDER_STATUS_TRANSITIONS[current] || new Set([current]);

  if (!allowedStatuses.has(next)) {
    const error = new Error(`Order status cannot move from ${current || 'unknown'} to ${next || 'unknown'}.`);
    error.statusCode = 400;
    throw error;
  }
};

const sendError = createErrorResponder('Unexpected order error.');

const toNumber = value => Number(value || 0);

const buildBankTransferPaymentDetails = order => {
  if (!order || serializePaymentMethod(order.payment_method || order.paymentMethod) !== 'bank_transfer') {
    return null;
  }

  const orderId = String(order.id || order.orderId || '').trim();
  const description = `HEM ${orderId.slice(0, 8).toUpperCase() || 'PENDING'}`;
  const amount = toNumber(order.total_amount || order.totalAmount);
  const query = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo: description,
    accountName: BANK_TRANSFER_CONFIG.accountHolder
  });
  const qrImageUrl = `https://img.vietqr.io/image/${encodeURIComponent(BANK_TRANSFER_CONFIG.bankId)}-${encodeURIComponent(BANK_TRANSFER_CONFIG.accountNumber)}-compact2.png?${query.toString()}`;

  return {
    bankName: BANK_TRANSFER_CONFIG.bankName,
    bankId: BANK_TRANSFER_CONFIG.bankId,
    bankBin: BANK_TRANSFER_CONFIG.bankBin,
    accountNumber: BANK_TRANSFER_CONFIG.accountNumber,
    accountHolder: BANK_TRANSFER_CONFIG.accountHolder,
    amount,
    description,
    qrImageUrl,
    activatedAt: order.payment_activated_at || order.paymentActivatedAt || null,
    expiresAt: order.payment_expires_at || order.paymentExpiresAt || null,
    serverTime: new Date().toISOString(),
    paymentWindowMinutes: BANK_TRANSFER_CONFIG.paymentWindowMinutes
  };
};

const parsePaginationQuery = query =>
  parseOptionalPagination(query, { defaultLimit: 10, maxLimit: 50 });

const ensureCustomerAccount = req => {
  if (!req.authUser) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }

  if (req.authUser.role === USER_ROLE.ADMIN) {
    const error = new Error('Admin accounts cannot place orders.');
    error.statusCode = 403;
    throw error;
  }
};

const normalizeCartItemIds = body => {
  const rawCartItemIds = body && (body.cartItemIds || body.cart_item_ids);
  const cartItemIds = [...new Set(
    (Array.isArray(rawCartItemIds) ? rawCartItemIds : [])
      .map(value => String(value || '').trim())
      .filter(Boolean)
  )];

  if (!cartItemIds.length) {
    const error = new Error('Select at least one item to checkout.');
    error.statusCode = 400;
    throw error;
  }

  if (cartItemIds.some(cartItemId => !isValidUuid(cartItemId))) {
    const error = new Error('One or more selected cart items are invalid.');
    error.statusCode = 400;
    throw error;
  }

  return cartItemIds;
};

const normalizeCheckoutPayload = (body = {}) => {
  const cartItemIds = normalizeCartItemIds(body);
  const paymentMethodInput = String(body.paymentMethod || '').trim().toLowerCase();
  const paymentMethod = PAYMENT_METHOD_ALIASES[paymentMethodInput] || paymentMethodInput;
  const rawShippingPhone = String(body.receiverPhone || body.receiver_phone || body.shippingPhone || '').trim();
  const shippingPhone = normalizeVietnamPhone(rawShippingPhone);

  if (!PAYMENT_METHODS.has(paymentMethod)) {
    const error = new Error('Please choose a valid payment method.');
    error.statusCode = 400;
    throw error;
  }

  const payload = {
    cartItemIds,
    paymentMethod,
    addressId: String(body.addressId || body.address_id || '').trim(),
    shippingFullName: String(body.receiverName || body.receiver_name || body.shippingFullName || '').trim(),
    shippingPhone,
    shippingCountry: String(body.country || 'Vietnam').trim() || 'Vietnam',
    shippingCity: String(body.city || body.shippingCity || '').trim(),
    shippingDistrict: String(body.district || body.shippingDistrict || '').trim(),
    shippingWard: String(body.ward || body.shippingWard || '').trim(),
    shippingAddressLine: String(body.addressLine || body.address_line || body.shippingAddressLine || '').trim(),
    addressLabel: String(body.addressLabel || body.address_label || '').trim().slice(0, 50),
    saveAddress: Boolean(body.saveAddress || body.save_address),
    updateSavedAddress: Boolean(body.updateSavedAddress || body.update_saved_address),
    setDefaultAddress: Boolean(body.setDefaultAddress || body.set_default_address),
    shippingNote: String(body.shippingNote || '').trim(),
    voucherCode: normalizeVoucherCode(body.voucherCode || body.voucher_code)
  };

  if (
    !payload.shippingFullName ||
    !payload.shippingCity ||
    !payload.shippingDistrict ||
    !payload.shippingWard ||
    !payload.shippingAddressLine
  ) {
    const error = new Error('Please complete the shipping information before checkout.');
    error.statusCode = 400;
    throw error;
  }

  if (!shippingPhone) {
    const error = new Error('Please enter a valid Vietnamese mobile phone number.');
    error.statusCode = 400;
    throw error;
  }

  return payload;
};

const ensureCheckoutAddressOwnership = async (db, userId, checkoutPayload) => {
  if (!checkoutPayload.addressId) {
    return null;
  }

  if (!isValidUuid(checkoutPayload.addressId)) {
    const error = new Error('Please choose a valid saved address.');
    error.statusCode = 400;
    throw error;
  }

  const result = await userAddressModel.findOwnedById(db, userId, checkoutPayload.addressId);

  if (!result.rowCount) {
    const error = new Error('Saved address not found.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

const fetchCartContext = async (db, userId, options = {}) => {
  const shouldLock = Boolean(options.lock);
  const cartItemIds = Array.isArray(options.cartItemIds) ? options.cartItemIds : null;
  const rows = await checkoutModel.loadCartContextRows(db, userId, {
    cartItemIds,
    lock: shouldLock
  });
  const cartId = rows[0] && rows[0].cart_id;

  return {
    cartId: cartId || null,
    items: rows.filter(row => row.cart_item_id).map(row => ({
      cartItemId: String(row.cart_item_id),
      productId: String(row.product_id),
      productSlug: String(row.product_slug || ''),
      productName: String(row.product_name || ''),
      productPrice: toNumber(row.product_price),
      originalPrice: toNumber(row.original_price || row.product_price),
      pricingMode: String(row.pricing_mode || 'regular'),
      quantity: Number(row.quantity || 0),
      sizeLabel: String(row.size_label || 'One Size'),
      colorName: String(row.color_name || 'Default'),
      colorVariantId: row.color_variant_id ? String(row.color_variant_id) : '',
      productCode: String(row.product_code || row.article_number || ''),
      articleNumber: String(row.article_number || row.product_code || ''),
      productImage: row.product_image || null,
      category: String(row.category_label || row.category_name || ''),
      collection: String(row.collection_name || row.style_name || ''),
      department: String(row.department_label || row.department_name || ''),
      inventoryContext: {
        productId: String(row.product_id),
        productName: String(row.product_name || ''),
        hasVariants: Boolean(row.has_variants),
        variantId: row.variant_id ? String(row.variant_id) : '',
        availableInventory: row.variant_id
          ? Math.max(0, Number(row.stock_quantity || 0) - Number(row.reserved_quantity || 0))
          : 0
      }
    }))
  };
};

const calculateCheckoutTotals = (items, discountAmountValue = 0) => {
  const subtotal = roundMoney(items.reduce((total, item) => total + item.productPrice * item.quantity, 0));
  const shippingFee = subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
  const discountAmount = roundMoney(Math.min(subtotal, Math.max(0, Number(discountAmountValue || 0))));

  return {
    subtotal,
    shippingFee,
    discountAmount,
    totalAmount: roundMoney(subtotal + shippingFee - discountAmount)
  };
};

const getDeliveredAt = row => {
  if (row && row.delivered_at) return row.delivered_at;
  return String(row && row.order_status || '').toLowerCase() === 'delivered'
    ? row.updated_at || null
    : null;
};

const serializeOrderRow = row => ({
  id: String(row.id),
  userId: String(row.user_id),
  customerName: String(row.customer_name || ''),
  customerEmail: String(row.customer_email || ''),
  subtotal: toNumber(row.subtotal),
  shippingFee: toNumber(row.shipping_fee),
  discountAmount: toNumber(row.discount_amount),
  voucherCode: String(row.voucher_code || ''),
  totalAmount: toNumber(row.total_amount),
  paymentMethod: serializePaymentMethod(row.payment_method),
  paymentStatus: serializePaymentStatus(row.payment_status),
  orderStatus: serializeOrderStatus(row.order_status),
  shippingFullName: String(row.shipping_full_name || ''),
  shippingPhone: String(row.shipping_phone || ''),
  shippingCity: String(row.shipping_city || ''),
  shippingDistrict: String(row.shipping_district || ''),
  shippingWard: String(row.shipping_ward || ''),
  shippingAddressLine: String(row.shipping_address_line || ''),
  shippingNote: String(row.shipping_note || ''),
  cancelReason: String(row.cancel_reason || ''),
  cancelledBy: String(row.cancelled_by || ''),
  cancelledAt: row.cancelled_at || null,
  deliveredAt: getDeliveredAt(row),
  returnDeadlineAt: getDeliveredAt(row)
    ? new Date(new Date(getDeliveredAt(row)).getTime() + DELIVERY_CONFIRMATION_WINDOW_MS).toISOString()
    : null,
  completedAt: row.completed_at || null,
  refundedAt: row.refunded_at || null,
  refundAmount: row.refund_amount === null || row.refund_amount === undefined ? null : toNumber(row.refund_amount),
  refundMethod: String(row.refund_method || ''),
  returnedToWarehouseAt: row.returned_to_warehouse_at || null,
  paymentActivatedAt: row.payment_activated_at || null,
  paymentExpiresAt: row.payment_expires_at || null,
  paymentReportedAt: row.payment_reported_at || null,
  paymentReviewedAt: row.payment_reviewed_at || null,
  paymentReviewedBy: row.payment_reviewed_by ? String(row.payment_reviewed_by) : '',
  paymentReviewReason: String(row.payment_review_reason || ''),
  paymentReceivedAmount: row.payment_received_amount === null || row.payment_received_amount === undefined
    ? null
    : toNumber(row.payment_received_amount),
  deliveryRetryCount: Number(row.delivery_retry_count || 0),
  itemCount: Number(row.item_count || 0),
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null
});

const normalizeReturnStatus = value => {
  const status = String(value || '').trim().toLowerCase();
  return RETURN_REQUEST_STATUSES.has(status) ? status : '';
};

const serializeReturnRequestRow = row => {
  if (!row || !row.id) {
    return null;
  }

  return {
    id: String(row.id),
    orderId: String(row.order_id || ''),
    userId: String(row.user_id || ''),
    customerName: String(row.customer_name || ''),
    customerEmail: String(row.customer_email || ''),
    reason: String(row.reason || ''),
    note: String(row.note || ''),
    returnStatus: normalizeReturnStatus(row.return_status) || String(row.return_status || ''),
    restock: row.restock === null || row.restock === undefined ? null : Boolean(row.restock),
    adminNote: String(row.admin_note || ''),
    transactionReference: String(row.transaction_reference || ''),
    failureReason: String(row.failure_reason || ''),
    refundCode: String(row.refund_code || ''),
    refundType: String(row.refund_type || ''),
    returnRequestId: row.return_request_id ? String(row.return_request_id) : null,
    requestedAmount: row.requested_amount === null || row.requested_amount === undefined ? null : toNumber(row.requested_amount),
    approvedAmount: row.approved_amount === null || row.approved_amount === undefined ? null : toNumber(row.approved_amount),
    requestedAt: row.requested_at || null,
    approvedAt: row.approved_at || null,
    rejectedAt: row.rejected_at || null,
    receivedAt: row.received_at || null,
    completedAt: row.completed_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
};

const fetchReturnRequestsByOrderIds = async (db, orderIds = []) => {
  if (!Array.isArray(orderIds) || !orderIds.length) {
    return new Map();
  }
  const rows = await returnRefundModel.listLatestReturnRowsByOrderIds(db, orderIds);
  const openReturnOrderIds = new Set(
    rows
      .filter(row => OPEN_RETURN_STATUSES.includes(String(row.return_status || '').toLowerCase()))
      .map(row => String(row.order_id || ''))
      .filter(Boolean)
  );
  return rows.reduce((map, row) => {
    const orderId = String(row.order_id || '');
    if (orderId && !map.has(orderId)) {
      map.set(orderId, {
        ...serializeReturnRequestRow(row),
        hasActiveReturn: openReturnOrderIds.has(orderId)
      });
    }
    return map;
  }, new Map());
};

const normalizeRefundRequestStatus = value => {
  const status = String(value || '').trim().toLowerCase();
  return REFUND_REQUEST_STATUSES.has(status) ? status : '';
};

const serializeRefundRequestRow = row => {
  if (!row || !row.id) {
    return null;
  }

  const accountNumber = String(row.refund_account_number || '');
  return {
    id: String(row.id),
    orderId: String(row.order_id || ''),
    userId: String(row.user_id || ''),
    refundCode: String(row.refund_code || ''),
    refundType: String(row.refund_type || ''),
    returnRequestId: row.return_request_id ? String(row.return_request_id) : null,
    requestedAmount: row.requested_amount === null || row.requested_amount === undefined ? null : toNumber(row.requested_amount),
    approvedAmount: row.approved_amount === null || row.approved_amount === undefined ? null : toNumber(row.approved_amount),
    customerName: String(row.customer_name || ''),
    customerEmail: String(row.customer_email || ''),
    reason: String(row.reason || ''),
    status: normalizeRefundRequestStatus(row.status) || String(row.status || ''),
    adminNote: String(row.admin_note || ''),
    transactionReference: String(row.transaction_reference || ''),
    failureReason: String(row.failure_reason || ''),
    orderStatus: row.order_status ? serializeOrderStatus(row.order_status) : '',
    paymentStatus: row.payment_status ? serializePaymentStatus(row.payment_status) : '',
    paymentMethod: row.payment_method ? serializePaymentMethod(row.payment_method) : '',
    totalAmount: row.total_amount === null || row.total_amount === undefined ? null : toNumber(row.total_amount),
    processingAt: row.processing_at || null,
    completedAt: row.completed_at || null,
    failedAt: row.failed_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
    ,refundAccount: {
      bankCode: String(row.refund_bank_code || ''),
      bankName: String(row.refund_bank_name || ''),
      accountNumber,
      maskedAccountNumber: accountNumber ? `${'*'.repeat(Math.max(0, accountNumber.length - 4))}${accountNumber.slice(-4)}` : '',
      accountHolder: String(row.refund_account_holder || ''),
      status: String(row.refund_account_status || 'not_provided'),
      submittedAt: row.refund_account_submitted_at || null
    }
  };
};

const fetchRefundRequestsByOrderIds = async (db, orderIds = []) => {
  if (!Array.isArray(orderIds) || !orderIds.length) {
    return new Map();
  }
  const rows = await returnRefundModel.listLatestRefundRowsByOrderIds(db, orderIds);
  return rows.reduce((map, row) => {
    const orderId = String(row.order_id || '');
    if (orderId && !map.has(orderId)) {
      map.set(orderId, serializeRefundRequestRow(row));
    }
    return map;
  }, new Map());
};

const fetchRefundRequestByOrderId = async (db, orderId) => {
  const requests = await fetchRefundRequestsByOrderIds(db, [orderId]);
  return requests.get(String(orderId)) || null;
};

const buildOrderItemPreview = row => ({
  id: row.product_id ? String(row.product_id) : '',
  slug: String(row.product_slug || ''),
  name: String(row.product_name || ''),
  category: String(row.category_label || row.category_name || ''),
  collection: String(row.collection_name || row.style_name || ''),
  gender: String(row.department_name || '').toLowerCase() === 'men' ? 'men' : 'women',
  imageUrl: String(row.resolved_product_image || row.product_image || ''),
  images: row.resolved_product_image || row.product_image ? [String(row.resolved_product_image || row.product_image)] : [],
  palette: {
    base: String(row.palette_base || DEFAULT_PREVIEW_PALETTE.base),
    accent: String(row.palette_accent || DEFAULT_PREVIEW_PALETTE.accent),
    glow: String(row.palette_glow || DEFAULT_PREVIEW_PALETTE.glow)
  }
});

const serializeOrderItemRow = row => {
  const availableQuantity = Number(row.available_quantity || 0);
  const productAvailable = Boolean(row.product_buy_again_available);
  const variantAvailable = Boolean(row.variant_buy_again_available);

  return {
    id: String(row.id),
    orderId: String(row.order_id),
    productId: String(row.product_id),
    variantId: row.variant_id ? String(row.variant_id) : '',
    productSlug: String(row.product_slug || ''),
    productName: String(row.product_name || ''),
    productPrice: toNumber(row.product_price),
    colorVariantId: row.color_variant_id ? String(row.color_variant_id) : '',
    productCode: String(row.product_code || row.article_number || ''),
    articleNumber: String(row.article_number || row.product_code || ''),
    priceAtPurchase: toNumber(row.price_at_purchase || row.product_price),
    originalPrice: toNumber(row.original_price || row.product_price),
    pricingMode: String(row.pricing_mode || 'regular'),
    priceLabel: row.pricing_mode === 'sale' ? 'Sale' : '',
    quantity: Number(row.quantity || 0),
    reservedQuantity: Number(row.reserved_quantity || 0),
    grossLineTotal: toNumber(row.gross_line_total),
    itemDiscountAmount: toNumber(row.item_discount_amount),
    voucherDiscountAllocated: toNumber(row.voucher_discount_allocated),
    netLineTotal: toNumber(row.net_line_total),
    refundedQuantity: Number(row.refunded_quantity || 0),
    refundedAmount: toNumber(row.refunded_amount),
    returnableQuantity: Number(row.returnable_quantity || 0),
    sizeLabel: String(row.size_label || ''),
    colorName: String(row.color_name || ''),
    productImage: row.resolved_product_image || row.product_image || null,
    category: String(row.category_label || row.category_name || ''),
    collection: String(row.collection_name || row.style_name || ''),
    department: String(row.department_label || row.department_name || ''),
    reviewId: row.review_id ? String(row.review_id) : '',
    hasReview: Boolean(row.review_id),
    buyAgainAvailable: productAvailable && variantAvailable && availableQuantity > 0,
    productAvailable,
    variantAvailable,
    availableQuantity,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    product: buildOrderItemPreview(row)
  };
};

const fetchOrderItemsByOrderIds = async (db, orderIds = []) => {
  if (!Array.isArray(orderIds) || !orderIds.length) {
    return new Map();
  }

  const rows = await orderModel.listItemRows(db, orderIds);

  return rows.reduce((groups, row) => {
    const orderId = String(row.order_id);

    if (!groups.has(orderId)) {
      groups.set(orderId, []);
    }

    groups.get(orderId).push(serializeOrderItemRow(row));
    return groups;
  }, new Map());
};

const fetchOrderItemSummariesByOrderIds = async (db, orderIds = []) => {
  if (!Array.isArray(orderIds) || !orderIds.length) {
    return new Map();
  }

  const rows = await orderModel.listItemSummaryRows(db, orderIds);

  return rows.reduce((groups, row) => {
    const orderId = String(row.order_id);

    if (!groups.has(orderId)) {
      groups.set(orderId, []);
    }

    groups.get(orderId).push(serializeOrderItemRow(row));
    return groups;
  }, new Map());
};

const fetchOrderItemsByOrderId = async (db, orderId) => {
  const groups = await fetchOrderItemsByOrderIds(db, [orderId]);
  return groups.get(String(orderId)) || [];
};

const serializeOrderTimelineRow = row => ({
  id: String(row.id),
  orderId: String(row.order_id),
  oldStatus: row.old_status ? serializeOrderStatus(row.old_status) : '',
  newStatus: serializeOrderStatus(row.new_status),
  changedBy: row.changed_by ? String(row.changed_by) : '',
  changedByRole: String(row.changed_by_role || ''),
  note: String(row.note || ''),
  createdAt: row.created_at || null
});

const fetchOrderTimeline = async (db, orderId) => {
  if (!orderStatusHistoryTableAvailable) {
    return [];
  }

  try {
    const rows = await orderModel.listTimelineRows(db, orderId);
    return rows.map(serializeOrderTimelineRow);
  } catch (error) {
    if (error && error.code === '42P01') {
      orderStatusHistoryTableAvailable = false;
      return [];
    }

    throw error;
  }
};

const mapCartItemForOrderResponse = row => {
  const quantity = Number(row.quantity || 0);
  const availableQuantity = row.available_inventory === null || row.available_inventory === undefined
    ? quantity
    : Number(row.available_inventory || 0);

  return {
    lineId: String(row.cart_item_id),
    cartItemId: String(row.cart_item_id),
    productId: String(row.product_id),
    productSlug: String(row.slug || ''),
    name: String(row.name || ''),
    category: String(row.category_name || ''),
    collection: String(row.collection_name || row.style_name || ''),
    price: toNumber(row.price),
    originalPrice: toNumber(row.original_price || row.price),
    pricingMode: String(row.pricing_mode || 'regular'),
    priceLabel: row.pricing_mode === 'sale' ? 'Sale' : '',
    quantity,
    availableQuantity,
    maxQuantity: availableQuantity,
    isMaxQuantity: quantity >= availableQuantity,
    size: String(row.size_label || 'One Size'),
    color: String(row.color_name || 'Default'),
    colorVariantId: row.color_variant_id ? String(row.color_variant_id) : '',
    productCode: String(row.product_code || row.article_number || ''),
    articleNumber: String(row.article_number || row.product_code || ''),
    imageUrl: String(row.image_url || ''),
    images: row.image_url ? [String(row.image_url)] : [],
    spotlight: String(row.category_name || row.collection_name || ''),
    palette: {
      base: DEFAULT_PREVIEW_PALETTE.base,
      accent: DEFAULT_PREVIEW_PALETTE.accent,
      glow: DEFAULT_PREVIEW_PALETTE.glow
    }
  };
};

const fetchCartPayloadForOrderResponse = async (db, userId) => {
  const rows = await cartModel.fetchRows(db, userId);
  const cartId = rows[0] && rows[0].cart_id;
  if (!cartId) {
    return {
      id: null,
      items: []
    };
  }

  return {
    id: String(cartId),
    items: rows.filter(row => row.cart_item_id).map(mapCartItemForOrderResponse)
  };
};

const normalizeAdminOrderUpdatePayload = body => {
  const hasPaymentStatus =
    Object.prototype.hasOwnProperty.call(body || {}, 'paymentStatus') ||
    Object.prototype.hasOwnProperty.call(body || {}, 'payment_status');

  if (hasPaymentStatus) {
    const error = new Error('Payment status is managed by the system and cannot be edited manually.');
    error.statusCode = 400;
    throw error;
  }

  const nextPayload = {};
  const orderStatus = normalizeOrderStatusValue(body.nextStatus || body.next_status || body.orderStatus || body.order_status);
  if (orderStatus) {
    if (!ORDER_STATUSES.has(orderStatus)) {
      const error = new Error('Please choose a valid order status.');
      error.statusCode = 400;
      throw error;
    }

    if (orderStatus === 'cancelled') {
      const error = new Error('Use the cancellation action so inventory and any paid-order refund are handled atomically.');
      error.statusCode = 400;
      throw error;
    }

    nextPayload.orderStatus = orderStatus;
  }

  if (!nextPayload.orderStatus) {
    const error = new Error('Please provide the next order status to update.');
    error.statusCode = 400;
    throw error;
  }

  return nextPayload;
};

const saveCheckoutAddress = async (db, userId, checkoutPayload) => {
  const hasSavedAddress = checkoutPayload.addressId && isValidUuid(checkoutPayload.addressId);

  if (hasSavedAddress && !checkoutPayload.updateSavedAddress) {
    return;
  }

  if (!hasSavedAddress && !checkoutPayload.saveAddress) {
    return;
  }

  let addressId = checkoutPayload.addressId;

  if (hasSavedAddress && checkoutPayload.updateSavedAddress) {
    const updateResult = await userAddressModel.update(db, userId, addressId, {
      receiverName: checkoutPayload.shippingFullName,
      receiverPhone: checkoutPayload.shippingPhone,
      country: checkoutPayload.shippingCountry,
      city: checkoutPayload.shippingCity,
      district: checkoutPayload.shippingDistrict,
      ward: checkoutPayload.shippingWard,
      addressLine: checkoutPayload.shippingAddressLine,
      addressLabel: checkoutPayload.addressLabel
    });

    if (!updateResult.rowCount) {
      const error = new Error('Saved address not found.');
      error.statusCode = 404;
      throw error;
    }
  }

  if (!hasSavedAddress) {
    const insertResult = await userAddressModel.create(db, userId, {
      receiverName: checkoutPayload.shippingFullName,
      receiverPhone: checkoutPayload.shippingPhone,
      country: checkoutPayload.shippingCountry,
      city: checkoutPayload.shippingCity,
      district: checkoutPayload.shippingDistrict,
      ward: checkoutPayload.shippingWard,
      addressLine: checkoutPayload.shippingAddressLine,
      addressLabel: checkoutPayload.addressLabel
    });
    addressId = insertResult.rows[0].id;
  }

  const defaultResult = await userAddressModel.hasDefault(db, userId);
  const hasDefault = Boolean(defaultResult.rows[0] && defaultResult.rows[0].has_default);

  if (checkoutPayload.setDefaultAddress || !hasDefault) {
    await userAddressModel.setDefault(db, userId, addressId);
  }
};

const fetchOrderInventoryItems = async (db, orderId) => {
  const rows = await orderModel.listInventoryRowsForUpdate(db, orderId);

  const items = [];

  for (const row of rows) {
    if (!row.variant_id) {
      const error = new Error(`Cannot find inventory variant for ${row.product_name || 'this product'} (${row.color_name || 'color'}, ${row.size_label || 'size'}).`);
      error.statusCode = 409;
      throw error;
    }

    const variantId = String(row.variant_id);

    if (!row.stored_variant_id) {
      await orderModel.storeOrderItemVariant(db, row.id, variantId);
    }

    items.push({
      id: String(row.id),
      productId: String(row.product_id),
      variantId,
      quantity: Number(row.quantity || 0),
      reservedQuantity: Number(row.reserved_quantity || 0),
      productName: String(row.product_name || ''),
      colorName: String(row.color_name || ''),
      sizeLabel: String(row.size_label || '')
    });
  }

  return items;
};

const writeInventoryLog = async (db, item, type, quantity, note, userId) => {
  if (!quantity) {
    return;
  }

  if (!(await tableExists(db, INVENTORY_LOG_TABLE))) {
    return;
  }

  await orderModel.insertInventoryLog(db, { item, type, quantity, note, userId });
};

const finalizeReservedInventory = async (db, orderId, changedBy) => {
  const items = await fetchOrderInventoryItems(db, orderId);

  for (const item of items) {
    const reservedQuantity = Math.min(item.reservedQuantity, item.quantity);

    if (reservedQuantity <= 0) {
      continue;
    }

    const updateResult = await orderModel.finalizeInventoryItem(
      db,
      item.variantId,
      reservedQuantity
    );

    if (!updateResult.rowCount) {
      const error = new Error(`Cannot complete order because inventory is not reserved for ${item.productName}.`);
      error.statusCode = 409;
      throw error;
    }

    await orderModel.updateOrderItemReservedQuantity(db, item.id, -reservedQuantity);
    await writeInventoryLog(db, item, 'sold', reservedQuantity, `Finalized order ${orderId}`, changedBy);
    await syncProductInventorySummary(db, item.productId);
  }
};

const ensureReservedInventoryForOrder = async (db, orderId, changedBy) => {
  const items = await fetchOrderInventoryItems(db, orderId);

  for (const item of items) {
    const missingReserveQuantity = Math.max(0, item.quantity - item.reservedQuantity);

    if (missingReserveQuantity <= 0) {
      continue;
    }

    const updateResult = await orderModel.reserveInventoryItem(
      db,
      item.variantId,
      missingReserveQuantity
    );

    if (!updateResult.rowCount) {
      const error = new Error(`Cannot reserve inventory for ${item.productName}.`);
      error.statusCode = 409;
      throw error;
    }

    await orderModel.updateOrderItemReservedQuantity(db, item.id, missingReserveQuantity);

    await writeInventoryLog(db, item, 'reserve_hold', missingReserveQuantity, `Reserved for order ${orderId}`, changedBy);
    await syncProductInventorySummary(db, item.productId);
  }
};

const releaseReservedInventory = async (db, orderId, changedBy, type = 'release_hold') => {
  const items = await fetchOrderInventoryItems(db, orderId);

  for (const item of items) {
    const reservedQuantity = Math.min(item.reservedQuantity, item.quantity);

    if (reservedQuantity <= 0) {
      continue;
    }

    const updateResult = await orderModel.releaseInventoryItem(
      db,
      item.variantId,
      reservedQuantity
    );

    if (!updateResult.rowCount) {
      const error = new Error(`Cannot release inventory hold for ${item.productName}.`);
      error.statusCode = 409;
      throw error;
    }

    await orderModel.updateOrderItemReservedQuantity(db, item.id, -reservedQuantity);
    await writeInventoryLog(db, item, type, reservedQuantity, `Released hold for order ${orderId}`, changedBy);
    await syncProductInventorySummary(db, item.productId);
  }
};

const applyOrderStatusInventoryEffects = async (db, order, nextStatus, changedBy) => {
  const previousStatus = normalizeOrderStatusValue(order.order_status);
  const normalizedNextStatus = normalizeOrderStatusValue(nextStatus);
  const terminalReleaseStatuses = new Set(['cancelled']);

  if (normalizedNextStatus === previousStatus) {
    return;
  }

  if (normalizedNextStatus === 'completed' && previousStatus !== 'completed') {
    if (INVENTORY_HOLD_STATUSES.has(previousStatus)) {
      await ensureReservedInventoryForOrder(db, order.id, changedBy);
    }
    await finalizeReservedInventory(db, order.id, changedBy);
    return;
  }

  if (
    INVENTORY_HOLD_STATUSES.has(normalizedNextStatus) &&
    !INVENTORY_HOLD_STATUSES.has(previousStatus)
  ) {
    await ensureReservedInventoryForOrder(db, order.id, changedBy);
  }

  if (terminalReleaseStatuses.has(normalizedNextStatus)) {
    if (previousStatus === 'completed') {
      const error = new Error('Completed orders cannot be cancelled from this flow.');
      error.statusCode = 400;
      throw error;
    }

    await releaseReservedInventory(db, order.id, changedBy, 'release_hold');
  }
};

const writeOrderStatusHistory = async (db, orderId, oldStatus, newStatus, changedBy, note = '', changedByRole = null) => {
  if (!newStatus || oldStatus === newStatus) {
    return;
  }

  if (!orderStatusHistoryTableAvailable) {
    return;
  }

  try {
    await orderModel.appendStatusHistory(db, {
      orderId,
      oldStatus,
      newStatus,
      changedBy,
      changedByRole,
      note
    });
  } catch (error) {
    if (error && error.code === '42P01') {
      orderStatusHistoryTableAvailable = false;
      return;
    }

    throw error;
  }
};

const autoCompleteDeliveredOrders = async (db, options = {}) => {
  const limit = Math.min(200, Math.max(1, Number(options.limit || 50)));
  const candidates = await orderModel.listAutoCompleteCandidates(db, limit);
  const completedOrders = [];

  for (const candidate of candidates) {
    const client = await db.connect();
    let serializedOrder;

    try {
      await client.query('BEGIN');
      const order = await orderModel.findAutoCompleteCandidateForUpdate(client, candidate.id);

      if (!order) {
        await client.query('ROLLBACK');
        continue;
      }

      await applyOrderStatusInventoryEffects(client, order, 'completed', null);
      await writeOrderStatusHistory(
        client,
        order.id,
        'delivered',
        'completed',
        null,
        'Automatically completed after the 3-day confirmation window expired.',
        'system'
      );

      const updatedOrder = await orderModel.completeOrder(client, order.id);

      serializedOrder = serializeOrderRow({
        ...updatedOrder,
        customer_name: order.customer_name,
        customer_email: order.customer_email
      });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => null);
      throw error;
    } finally {
      client.release();
    }

    if (serializedOrder) {
      completedOrders.push(serializedOrder);
    }
  }

  return completedOrders;
};

const checkoutOrderController = createCheckoutOrderController({
  buildBankTransferPaymentDetails,
  BANK_TRANSFER_ACTIVATION_WINDOW_MINUTES: BANK_TRANSFER_CONFIG.activationWindowMinutes,
  BANK_TRANSFER_PAYMENT_WINDOW_MINUTES: BANK_TRANSFER_CONFIG.paymentWindowMinutes,
  calculateCheckoutTotals,
  checkoutModel,
  createVoucherRedemption,
  columnExists,
  ensureCheckoutAddressOwnership,
  ensureCustomerAccount,
  fetchCartContext,
  fetchCartPayloadForOrderResponse,
  fetchOrderItemsByOrderId,
  getDb,
  incrementVoucherUsage: voucherModel.incrementUsage,
  normalizeCheckoutPayload,
  normalizeCartItemIds,
  normalizeVoucherCode,
  listEligibleVouchers,
  notifyOrderCreated,
  notifyBankTransferReported,
  expirePendingBankTransfers,
  resolveOrderInsertPaymentValues,
  saveCheckoutAddress,
  sendError,
  serializeOrderRow,
  syncProductInventorySummary,
  tableExists,
  validateVoucher,
  writeOrderStatusHistory
});

exports.checkout = checkoutOrderController.checkout;
exports.activateBankTransferPayment = checkoutOrderController.activateBankTransferPayment;
exports.markBankTransferPaid = checkoutOrderController.markBankTransferPaid;
exports.expireBankTransferPayment = checkoutOrderController.expireBankTransferPayment;
exports.listEligibleVouchers = checkoutOrderController.listEligibleVouchers;
exports.validateSelectedVoucher = checkoutOrderController.validateSelectedVoucher;

const customerOrderController = createCustomerOrderController({
  ORDER_STATUSES,
  applyOrderStatusInventoryEffects,
  buildBankTransferPaymentDetails,
  buildPaginationPayload,
  ensureCustomerAccount,
  fetchCartPayloadForOrderResponse,
  fetchOrderItemsByOrderId,
  fetchOrderItemSummariesByOrderIds,
  fetchOrderTimeline,
  fetchRefundRequestByOrderId,
  fetchRefundRequestsByOrderIds,
  fetchReturnRequestsByOrderIds,
  fetchReturnPayloadsByOrderId: returnRefundController.fetchReturnPayloadsByOrderId,
  getDb,
  hasOpenReturnForOrder: (db, orderId) =>
    returnRefundModel.hasReturnWithStatuses(db, orderId, OPEN_RETURN_STATUSES),
  isValidUuid,
  normalizeOrderStatusValue,
  notifyOrderStatusChanged,
  orderModel,
  parsePaginationQuery,
  resolveOrderStatusForDb,
  sendError,
  serializeOrderRow,
  writeOrderStatusHistory
});

exports.listUserOrders = customerOrderController.listUserOrders;
exports.readUserOrder = customerOrderController.readUserOrder;
exports.buyAgainOrderItem = customerOrderController.buyAgainOrderItem;
exports.buyAgainOrderItems = customerOrderController.buyAgainOrderItems;
exports.confirmReceived = customerOrderController.confirmReceived;

const adminOrderController = createAdminOrderController({
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  applyOrderStatusInventoryEffects,
  buildBankTransferPaymentDetails,
  buildPaginationPayload,
  ensureOrderStatusTransition,
  fetchReturnPayloadsByOrderId: returnRefundController.fetchReturnPayloadsByOrderId,
  fetchOrderItemsByOrderId,
  fetchOrderTimeline,
  fetchRefundRequestByOrderId,
  fetchRefundRequestsByOrderIds,
  fetchReturnRequestsByOrderIds,
  getDb,
  isValidUuid,
  normalizeAdminOrderUpdatePayload,
  normalizeOrderStatusValue,
  notifyBankTransferConfirmed,
  notifyOrderStatusChanged,
  orderModel,
  parsePaginationQuery,
  resolveOrderStatusForDb,
  resolvePaymentStatusForDb,
  sendError,
  serializeOrderRow,
  serializePaymentStatus,
  writeOrderStatusHistory
});

exports.listAdminOrders = adminOrderController.listAdminOrders;
exports.updateAdminOrder = adminOrderController.updateAdminOrder;
exports.readAdminOrder = adminOrderController.readAdminOrder;
exports.listAdminBankTransferPayments = adminOrderController.listAdminBankTransferPayments;
exports.confirmAdminBankTransferPayment = adminOrderController.confirmAdminBankTransferPayment;
exports.markAdminDeliveryFailed = adminOrderController.markAdminDeliveryFailed;
exports.autoCompleteDeliveredOrders = autoCompleteDeliveredOrders;
