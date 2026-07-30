const { randomUUID } = require('crypto');
const { isValidUuid } = require('../utils/authUtils');
const orderModel = require('../models/orderModel');
const returnRefundModel = require('../models/returnRefundModel');
const voucherModel = require('../models/voucherModel');
const {
  invalidateDashboardCache
} = require('./admin/dashboardController');
const {
  assertRefundTransition,
  assertReturnTransition
} = require('../services/commerceWorkflowService');
const {
  calculateReturnItemRefund,
  createSystemRefund,
  paidAmountForOrder,
  refreshOrderPaymentStatus,
  roundMoney
} = require('../services/refundService');
const {
  notifyOrderStatusChanged,
  notifyRefundAccountSubmitted,
  notifyRefundCompleted,
  notifyRefundPending,
  notifyReturnRequested,
  notifyReturnStatusChanged
} = require('../services/notificationEmailService');
const {
  ACTIVE_RETURN_STATUSES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  REFUND_STATUS,
  RETURN_REASONS,
  RETURN_STATUS,
  REVIEW_PAYMENT_STATUSES
} = require('../constants/domainConstants');

const RETURN_WINDOW_MS = Math.max(1, Number(process.env.RETURN_WINDOW_DAYS || 3)) * 24 * 60 * 60 * 1000;

const getDb = req => req.app.locals.db;
const makeCode = prefix => `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
const textValue = (value, limit = 2000) => String(value || '').trim().slice(0, limit);
const normalizeUpperAscii = (value, limit = 2000) => textValue(value, limit)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toUpperCase()
  .replace(/\s+/g, ' ')
  .trim();
const numberValue = value => Number(value || 0);
const sendError = (res, error, fallbackStatus = 400) => {
  if (error && error.code === '23505') {
    return res.status(409).json({ message: 'This operation was already completed.' });
  }
  if (error && error.code === '23514') {
    return res.status(409).json({ message: 'The requested quantities or status are invalid.' });
  }
  return res.status(error.statusCode || fallbackStatus).json({
    message: error.message || 'Unable to complete the request.'
  });
};

const rollbackAndRespond = async (client, res, status, message) => {
  await client.query('ROLLBACK');
  res.status(status).json({ message });
  return null;
};

const serializeRefund = (row, includeFullAccount = false) => row ? {
  id: String(row.id),
  refundCode: row.refund_code,
  orderId: String(row.order_id),
  userId: String(row.user_id),
  returnRequestId: row.return_request_id ? String(row.return_request_id) : null,
  refundType: row.refund_type,
  sourceKey: row.source_key,
  requestedAmount: numberValue(row.requested_amount),
  approvedAmount: row.approved_amount == null ? null : numberValue(row.approved_amount),
  status: row.status,
  reason: row.reason || '',
  adminNote: row.admin_note || '',
  transactionReference: row.transaction_reference || '',
  failureReason: row.failure_reason || '',
  customerName: row.customer_name || '',
  customerEmail: row.customer_email || '',
  orderStatus: row.order_status || '',
  paymentStatus: row.payment_status || '',
  createdAt: row.created_at,
  processingAt: row.processing_at,
  completedAt: row.completed_at,
  failedAt: row.failed_at,
  updatedAt: row.updated_at,
  refundAccount: serializeRefundAccount(row, includeFullAccount)
} : null;

const serializeOrder = row => row ? {
  id: String(row.id),
  userId: String(row.user_id),
  subtotal: numberValue(row.subtotal),
  shippingFee: numberValue(row.shipping_fee),
  discountAmount: numberValue(row.discount_amount),
  voucherCode: row.voucher_code || '',
  totalAmount: numberValue(row.total_amount),
  paymentMethod: row.payment_method,
  paymentStatus: row.payment_status,
  paymentReceivedAmount: row.payment_received_amount == null ? null : numberValue(row.payment_received_amount),
  orderStatus: row.order_status,
  customerName: row.customer_name || '',
  customerEmail: row.customer_email || '',
  shippingFullName: row.shipping_full_name || '',
  shippingPhone: row.shipping_phone || '',
  shippingCity: row.shipping_city || '',
  shippingDistrict: row.shipping_district || '',
  shippingWard: row.shipping_ward || '',
  shippingAddressLine: row.shipping_address_line || '',
  shippingNote: row.shipping_note || '',
  cancelReason: row.cancel_reason || '',
  cancelledBy: row.cancelled_by || '',
  cancelledAt: row.cancelled_at,
  deliveredAt: row.delivered_at,
  completedAt: row.completed_at,
  refundedAt: row.refunded_at,
  refundAmount: row.refund_amount == null ? null : numberValue(row.refund_amount),
  createdAt: row.created_at,
  updatedAt: row.updated_at
} : null;

const serializeReturnItem = row => ({
  id: String(row.id),
  returnRequestId: String(row.return_request_id),
  orderItemId: String(row.order_item_id),
  productId: row.product_id ? String(row.product_id) : '',
  variantId: row.variant_id ? String(row.variant_id) : '',
  colorVariantId: row.color_variant_id ? String(row.color_variant_id) : '',
  productName: row.product_name || '',
  productImage: row.product_image || '',
  colorName: row.color_name || '',
  sizeLabel: row.size_label || '',
  priceAtPurchase: numberValue(row.price_at_purchase || row.product_price),
  netLineTotal: numberValue(row.net_line_total),
  purchasedQuantity: numberValue(row.purchased_quantity),
  requestedQuantity: numberValue(row.requested_quantity),
  approvedQuantity: numberValue(row.approved_quantity),
  receivedQuantity: numberValue(row.received_quantity),
  acceptedQuantity: numberValue(row.accepted_quantity),
  rejectedQuantity: numberValue(row.rejected_quantity),
  reason: row.reason,
  customerNote: row.customer_note || '',
  evidenceUrls: Array.isArray(row.evidence_urls) ? row.evidence_urls : [],
  conditionCode: row.condition_code || '',
  inspectionNote: row.inspection_note || '',
  rejectionReason: row.rejection_reason || '',
  restockable: row.restockable,
  refundAmount: numberValue(row.refund_amount),
  inventoryRestoredQuantity: numberValue(row.inventory_restored_quantity)
});

const maskAccountNumber = value => {
  const normalized = String(value || '').replace(/\s+/g, '');
  return normalized ? `${'*'.repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}` : '';
};

const serializeRefundAccount = (row, includeFullAccount = false) => ({
  bankCode: row.refund_bank_code || '',
  bankName: normalizeUpperAscii(row.refund_bank_name, 120),
  accountNumber: includeFullAccount ? row.refund_account_number || '' : '',
  maskedAccountNumber: maskAccountNumber(row.refund_account_number),
  accountHolder: normalizeUpperAscii(row.refund_account_holder, 160),
  status: row.refund_account_status || 'not_provided',
  submittedAt: row.refund_account_submitted_at || null,
  verifiedAt: row.refund_account_verified_at || null,
  rejectionReason: row.refund_account_rejection_reason || ''
});

const serializeReturn = (row, items = [], refunds = [], includeFullAccount = false) => row ? {
  id: String(row.id),
  returnCode: row.return_code,
  orderId: String(row.order_id),
  userId: String(row.user_id),
  status: row.return_status,
  returnStatus: row.return_status,
  reason: row.reason,
  note: row.note || '',
  adminNote: row.admin_note || '',
  rejectionReason: row.rejection_reason || '',
  customerName: row.customer_name || '',
  customerEmail: row.customer_email || '',
  orderStatus: row.order_status || '',
  paymentStatus: row.payment_status || '',
  requestedAt: row.requested_at,
  approvedAt: row.approved_at,
  rejectedAt: row.rejected_at,
  receivedAt: row.received_at,
  inspectionStartedAt: row.inspection_started_at,
  inspectedAt: row.inspected_at,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  refundAccount: serializeRefundAccount(row, includeFullAccount),
  items,
  refunds
} : null;

const fetchReturnPayload = async (db, returnRequestId, userId = null) => {
  const rows = await returnRefundModel.fetchReturnPayloadRows(db, returnRequestId, userId);
  if (!rows.request) return null;
  return serializeReturn(
    rows.request,
    rows.items.map(serializeReturnItem),
    rows.refunds.map(serializeRefund),
    !userId
  );
};

const fetchLatestAdminReturnPayloadByOrderId = async (db, orderId) => {
  const result = await returnRefundModel.listReturnPayloadRows(db, {
    userId: null,
    orderId,
    status: '',
    search: '',
    limit: 1,
    offset: 0
  });
  const request = result.requests[0];
  if (!request) return null;

  return serializeReturn(
    request,
    result.items.map(serializeReturnItem),
    result.refunds.map(row => serializeRefund(row, true)),
    true
  );
};

const normalizeRefundAccount = body => {
  const bankCode = textValue(body && body.bankCode, 30).toUpperCase();
  const bankName = normalizeUpperAscii(body && body.bankName, 120);
  const accountNumber = textValue(body && body.accountNumber, 40);
  const accountHolder = normalizeUpperAscii(body && body.accountHolder, 160);

  if (!bankName) {
    const error = new Error('Bank name is required.');
    error.statusCode = 400;
    throw error;
  }
  if (!/^\d{6,30}$/.test(accountNumber)) {
    const error = new Error('Account number must contain 6 to 30 digits.');
    error.statusCode = 400;
    throw error;
  }
  if (!/^[A-Z\s.'-]{2,160}$/.test(accountHolder)) {
    const error = new Error('Account holder name is invalid.');
    error.statusCode = 400;
    throw error;
  }

  return { bankCode, bankName, accountNumber, accountHolder };
};

const loadOrderForEmail = async (db, orderId) => {
  return orderModel.findAdminOrder(db, orderId);
};

const releaseCancelledInventory = async (client, orderId, actorId) => {
  const items = await orderModel.listInventoryRowsForUpdate(client, orderId);

  for (const item of items) {
    const quantity = Math.max(0, numberValue(item.reserved_quantity));
    if (!item.variant_id || quantity <= 0) continue;
    await orderModel.releaseInventoryItem(client, item.variant_id, quantity);
    await orderModel.updateOrderItemReservedQuantity(client, item.id, -quantity);
    await orderModel.insertInventoryLog(client, {
      item: {
        productId: item.product_id,
        variantId: item.variant_id
      },
      type: 'release_hold',
      quantity,
      note: `Released by cancellation of order ${orderId}`,
      userId: actorId
    });
  }
};

const refundRemainingAmount = async (client, order) => {
  const reservedAmount = await returnRefundModel.sumReservedRefundAmount(client, order.id);
  return roundMoney(paidAmountForOrder(order) - reservedAmount);
};

const cancelOrder = async (
  req,
  res,
  adminAction,
  extraStatuses = [],
  allowPaymentReviewRejection = false
) => {
  const db = getDb(req);
  const orderId = textValue(req.params.orderId, 80);
  const reason = textValue(req.body && (req.body.reason || req.body.cancelReason), 1000);
  if (!isValidUuid(orderId)) return res.status(400).json({ message: 'Order id is required.' });
  if (!reason) return res.status(400).json({ message: 'Cancellation reason is required.' });
  const client = await db.connect();
  let refund = null;
  let createdRefund = false;
  let voucherReleased = false;
  try {
    await client.query('BEGIN');
    const order = await orderModel.findLockedOrder(
      client,
      orderId,
      adminAction ? null : req.authUser.id
    );
    if (!order) return rollbackAndRespond(client, res, 404, 'Order not found.');
    const orderStatus = String(order.order_status || '').toLowerCase();
    const paymentStatus = String(order.payment_status || '').toLowerCase();
    const paymentMethod = String(order.payment_method || '').toLowerCase();

    if (
      allowPaymentReviewRejection &&
      (
        !adminAction ||
        paymentMethod !== 'bank_transfer' ||
        !REVIEW_PAYMENT_STATUSES.has(paymentStatus)
      )
    ) {
      return rollbackAndRespond(
        client,
        res,
        409,
        'Only a bank transfer that is under review can be rejected.'
      );
    }
    if (REVIEW_PAYMENT_STATUSES.has(paymentStatus) && !allowPaymentReviewRejection) {
      return rollbackAndRespond(client, res, 409, 'This order cannot be cancelled while its bank transfer is under review.');
    }
    if (
      orderStatus !== ORDER_STATUS.CANCELLED &&
      ![
        ORDER_STATUS.PENDING,
        ORDER_STATUS.CONFIRMED,
        ORDER_STATUS.PROCESSING,
        ...extraStatuses
      ].includes(orderStatus)
    ) {
      return rollbackAndRespond(client, res, 409, 'This order can no longer be cancelled.');
    }

    if (orderStatus !== ORDER_STATUS.CANCELLED) {
      await releaseCancelledInventory(client, orderId, req.authUser.id);
      if ([ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING].includes(orderStatus)) {
        const voucherRelease = await voucherModel.releaseRedemptionForOrder(client, orderId);
        voucherReleased = Boolean(voucherRelease.rowCount);
      }
      const actorRole = adminAction ? 'admin' : 'user';
      await orderModel.cancelOrder(client, {
        orderId,
        reason,
        cancelledBy: actorRole,
        reviewedBy: req.authUser.id
      });
      await orderModel.appendStatusHistory(client, {
        orderId,
        oldStatus: orderStatus,
        newStatus: ORDER_STATUS.CANCELLED,
        changedBy: req.authUser.id,
        changedByRole: actorRole,
        note: reason
      });
    }

    if ([
      PAYMENT_STATUS.PAID,
      PAYMENT_STATUS.REFUND_PENDING,
      PAYMENT_STATUS.PARTIALLY_REFUNDED
    ].includes(paymentStatus)) {
      const amount = await refundRemainingAmount(client, order);
      if (amount > 0) {
        const result = await createSystemRefund(client, {
          order,
          refundType: 'cancellation',
          amount,
          reason: `Paid order cancelled: ${reason}`,
          createdBy: req.authUser.id,
          sourceKey: `order_cancellation:${orderId}`
        });
        refund = result.refund;
        createdRefund = result.created;
      } else {
        refund = await returnRefundModel.findRefundBySourceKey(client, `order_cancellation:${orderId}`);
      }
      await refreshOrderPaymentStatus(client, orderId);
    }
    await client.query('COMMIT');
    invalidateDashboardCache();

    const orderPayload = await loadOrderForEmail(db, orderId);
    const response = res.json({
      order: serializeOrder(orderPayload),
      refund: serializeRefund(refund),
      voucherReleased
    });
    notifyOrderStatusChanged(req, db, orderPayload, 'cancelled', reason).catch(() => null);
    if (refund && createdRefund) notifyRefundPending(req, db, orderPayload, refund).catch(() => null);
    return response;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    return sendError(res, error);
  } finally {
    client.release();
  }
};

const normalizeRequestedItems = body => {
  const commonReason = textValue(body && body.reason, 80).toLowerCase();
  const commonNote = textValue(body && (body.note || body.customerNote), 1000);
  const source = Array.isArray(body && body.items) ? body.items : [];
  const seen = new Set();
  return source.map(item => {
    const orderItemId = textValue(item.orderItemId || item.order_item_id, 80);
    const quantity = Number(item.quantity ?? item.requestedQuantity ?? item.requested_quantity);
    const reason = textValue(item.reason || commonReason, 80).toLowerCase();
    if (!isValidUuid(orderItemId) || seen.has(orderItemId)) {
      const error = new Error('Each selected order item must be unique and valid.');
      error.statusCode = 400;
      throw error;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      const error = new Error('Return quantity must be a positive whole number.');
      error.statusCode = 400;
      throw error;
    }
    if (!RETURN_REASONS.has(reason)) {
      const error = new Error('Select a valid return reason for every item.');
      error.statusCode = 400;
      throw error;
    }
    seen.add(orderItemId);
    const evidenceUrls = Array.isArray(item.evidenceUrls || item.evidence_urls)
      ? (item.evidenceUrls || item.evidence_urls)
        .map(value => textValue(value, 1000))
        .filter(value => /^https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\/image\/upload\//i.test(value))
        .slice(0, 8)
      : [];
    return {
      orderItemId,
      quantity,
      reason,
      note: textValue(item.note || item.customerNote || commonNote, 1000),
      evidenceUrls
    };
  });
};

const createReturn = async (req, res) => {
  const db = getDb(req);
  const orderId = textValue(req.params.orderId, 80);
  if (!isValidUuid(orderId)) return res.status(400).json({ message: 'Order id is required.' });
  let items;
  try {
    items = normalizeRequestedItems(req.body || {});
  } catch (error) {
    return sendError(res, error);
  }
  if (!items.length) return res.status(400).json({ message: 'Select at least one order item to return.' });

  const client = await db.connect();
  let returnRequestId;
  try {
    await client.query('BEGIN');
    const order = await orderModel.findLockedOrder(client, orderId, req.authUser.id);
    if (!order) return rollbackAndRespond(client, res, 404, 'Order not found.');
    if (![
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.COMPLETED
    ].includes(String(order.order_status).toLowerCase())) {
      return rollbackAndRespond(client, res, 409, 'Returns can only be requested after delivery.');
    }
    const deliveredAt = new Date(order.delivered_at || order.updated_at || 0).getTime();
    if (!Number.isFinite(deliveredAt) || Date.now() >= deliveredAt + RETURN_WINDOW_MS) {
      return rollbackAndRespond(client, res, 409, 'The return request window has expired.');
    }

    const ids = items.map(item => item.orderItemId);
    const orderItems = await returnRefundModel.findReturnableOrderItems(
      client,
      orderId,
      ids,
      ACTIVE_RETURN_STATUSES
    );
    if (orderItems.length !== ids.length) {
      return rollbackAndRespond(client, res, 404, 'One or more selected order items do not belong to this order.');
    }
    const byId = new Map(orderItems.map(row => [String(row.id), row]));
    for (const item of items) {
      const orderItem = byId.get(item.orderItemId);
      const remaining = numberValue(orderItem.quantity) - numberValue(orderItem.already_requested_quantity);
      if (item.quantity > remaining) {
        return rollbackAndRespond(client, res, 409, `${orderItem.product_name} only has ${Math.max(0, remaining)} returnable item(s) remaining.`);
      }
    }

    const first = items[0];
    const returnRequest = await returnRefundModel.createReturnRequest(client, {
      code: makeCode('RET'),
      orderId,
      userId: req.authUser.id,
      reason: first.reason,
      note: textValue(req.body.note || first.note, 1000) || null
    });
    returnRequestId = returnRequest.id;
    await returnRefundModel.createReturnItems(client, returnRequestId, items);
    await client.query('COMMIT');
    const payload = await fetchReturnPayload(db, returnRequestId, req.authUser.id);
    const response = res.status(201).json({ returnRequest: payload });
    notifyReturnRequested(req, db, payload).catch(() => null);
    return response;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    return sendError(res, error);
  } finally {
    client.release();
  }
};

const saveCustomerRefundAccount = async (req, res) => {
  const db = getDb(req);
  const id = textValue(req.params.returnRequestId, 80);
  if (!isValidUuid(id)) return res.status(400).json({ message: 'Return request id is required.' });

  let account;
  try {
    account = normalizeRefundAccount(req.body || {});
  } catch (error) {
    return sendError(res, error);
  }

  try {
    const updated = await returnRefundModel.updateCustomerRefundAccount(db, {
      returnRequestId: id,
      userId: req.authUser.id,
      ...account
    });
    if (!updated) {
      return res.status(409).json({
        message: 'Refund account details can only be updated for your approved return before refund processing starts.'
      });
    }
    await returnRefundModel.syncReturnRefundAccount(db, {
      returnRequestId: id,
      ...account
    });
    const payload = await fetchReturnPayload(db, id, req.authUser.id);
    notifyRefundAccountSubmitted(req, db, id).catch(() => null);
    return res.json({ returnRequest: payload });
  } catch (error) {
    return sendError(res, error);
  }
};

const saveRefundAccount = async (req, res) => {
  const db = getDb(req);
  const id = textValue(req.params.refundId, 80);
  if (!isValidUuid(id)) return res.status(400).json({ message: 'Refund id is required.' });
  let account;
  try { account = normalizeRefundAccount(req.body || {}); } catch (error) { return sendError(res, error); }
  try {
    const updated = await returnRefundModel.updateRefundAccount(db, {
      refundId: id,
      userId: req.authUser.id,
      ...account
    });
    if (!updated) {
      return res.status(409).json({ message: 'The refund account can only be changed before processing starts.' });
    }
    const refund = await returnRefundModel.findCustomerRefund(db, id, req.authUser.id);
    notifyRefundAccountSubmitted(req, db, updated.return_request_id || id).catch(() => null);
    return res.json({ refund: serializeRefund(refund) });
  } catch (error) { return sendError(res, error); }
};

const listReturns = async (req, res, adminView) => {
  try {
    const db = getDb(req);
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10)));
    const status = textValue(req.query.status, 40).toLowerCase();
    const search = textValue(req.query.search || req.query.q, 120);
    const result = await returnRefundModel.listReturnPayloadRows(db, {
      userId: adminView ? null : req.authUser.id,
      status,
      search,
      limit,
      offset: (page - 1) * limit
    });
    const itemsByRequestId = result.items.reduce((groups, row) => {
      const id = String(row.return_request_id);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(serializeReturnItem(row));
      return groups;
    }, new Map());
    const refundsByRequestId = result.refunds.reduce((groups, row) => {
      const id = String(row.return_request_id);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(serializeRefund(row));
      return groups;
    }, new Map());
    const items = result.requests.map(row => {
      const id = String(row.id);
      return serializeReturn(
        row,
        itemsByRequestId.get(id) || [],
        refundsByRequestId.get(id) || [],
        adminView
      );
    });
    return res.json({
      items,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const readReturn = async (req, res, adminView) => {
  const id = textValue(req.params.returnRequestId, 80);
  if (!isValidUuid(id)) return res.status(400).json({ message: 'Return request id is required.' });
  try {
    const payload = await fetchReturnPayload(getDb(req), id, adminView ? null : req.authUser.id);
    if (!payload) return res.status(404).json({ message: 'Return request not found.' });
    return res.json({ returnRequest: payload });
  } catch (error) {
    return sendError(res, error);
  }
};

const parseAdminQuantities = (body, key) => {
  const source = Array.isArray(body && body.items) ? body.items : [];
  const map = new Map();
  for (const item of source) {
    const id = textValue(item.returnItemId || item.id, 80);
    const quantity = Number(item[key] ?? item.quantity);
    if (!isValidUuid(id) || map.has(id) || !Number.isInteger(quantity) || quantity < 0) {
      const error = new Error('Provide one valid non-negative quantity decision for each return item.');
      error.statusCode = 400;
      throw error;
    }
    map.set(id, quantity);
  }
  return map;
};

const updateReturnStatusEmail = async (req, db, id, status, note) => {
  const payload = await fetchReturnPayload(db, id);
  await notifyReturnStatusChanged(req, db, payload, status, note).catch(() => null);
  return payload;
};

const approveReturn = async (req, res) => {
  const db = getDb(req);
  const id = textValue(req.params.returnRequestId, 80);
  let decisions;
  try { decisions = parseAdminQuantities(req.body, 'approvedQuantity'); } catch (error) { return sendError(res, error); }
  if (!decisions.size) return res.status(400).json({ message: 'Approve or reject a quantity for every return item.' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const returnRequest = await returnRefundModel.findReturnForUpdate(client, id);
    if (!returnRequest) return rollbackAndRespond(client, res, 404, 'Return request not found.');
    assertReturnTransition(returnRequest.return_status, RETURN_STATUS.AWAITING_RETURN);
    const returnItems = await returnRefundModel.listReturnItemsForUpdate(client, id);
    if (returnItems.length !== decisions.size || returnItems.some(item => !decisions.has(String(item.id)))) {
      return rollbackAndRespond(client, res, 400, 'A quantity decision is required for every return item.');
    }
    let approvedTotal = 0;
    for (const item of returnItems) {
      const quantity = decisions.get(String(item.id));
      if (quantity > numberValue(item.requested_quantity)) {
        return rollbackAndRespond(client, res, 409, 'Approved quantity cannot exceed requested quantity.');
      }
      approvedTotal += quantity;
      await returnRefundModel.updateReturnItemQuantity(client, item.id, 'approved_quantity', quantity);
    }
    if (approvedTotal <= 0) return rollbackAndRespond(client, res, 400, 'Use Reject with a reason when no quantity is approved.');
    await returnRefundModel.updateReturnStatus(client, id, RETURN_STATUS.AWAITING_RETURN, {
      actorId: req.authUser.id,
      adminNote: textValue(req.body.adminNote, 1000) || null
    });
    await client.query('COMMIT');
    return res.json({
      returnRequest: await updateReturnStatusEmail(
        req,
        db,
        id,
        RETURN_STATUS.AWAITING_RETURN,
        req.body.adminNote
      )
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    return sendError(res, error);
  } finally { client.release(); }
};

const rejectReturn = async (req, res) => {
  const db = getDb(req);
  const id = textValue(req.params.returnRequestId, 80);
  const reason = textValue(req.body && (req.body.rejectionReason || req.body.reason), 1000);
  if (!reason) return res.status(400).json({ message: 'Rejection reason is required.' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const returnRequest = await returnRefundModel.findReturnForUpdate(client, id);
    if (!returnRequest) return rollbackAndRespond(client, res, 404, 'Return request not found.');
    assertReturnTransition(returnRequest.return_status, RETURN_STATUS.REJECTED);
    await returnRefundModel.updateReturnStatus(client, id, RETURN_STATUS.REJECTED, {
      reason,
      adminNote: textValue(req.body.adminNote, 1000) || null
    });
    await client.query('COMMIT');
    return res.json({
      returnRequest: await updateReturnStatusEmail(req, db, id, RETURN_STATUS.REJECTED, reason)
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    return sendError(res, error);
  } finally { client.release(); }
};

const receiveReturn = async (req, res) => {
  const db = getDb(req);
  const id = textValue(req.params.returnRequestId, 80);
  let decisions;
  try { decisions = parseAdminQuantities(req.body, 'receivedQuantity'); } catch (error) { return sendError(res, error); }
  if (!decisions.size) return res.status(400).json({ message: 'Received quantities are required.' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const returnRequest = await returnRefundModel.findReturnForUpdate(client, id);
    if (!returnRequest) return rollbackAndRespond(client, res, 404, 'Return request not found.');
    if (returnRequest.return_status !== RETURN_STATUS.AWAITING_RETURN) {
      return rollbackAndRespond(client, res, 409, 'Products can only be received for an approved return awaiting shipment.');
    }
    const returnItems = await returnRefundModel.listReturnItemsForUpdate(client, id);
    if (returnItems.length !== decisions.size || returnItems.some(item => !decisions.has(String(item.id)))) {
      return rollbackAndRespond(client, res, 400, 'A received quantity is required for every return item.');
    }
    let totalReceived = 0;
    for (const item of returnItems) {
      const quantity = decisions.get(String(item.id));
      if (quantity !== numberValue(item.approved_quantity)) {
        return rollbackAndRespond(client, res, 409, 'Received quantities must account for every approved unit before inspection.');
      }
      totalReceived += quantity;
      await returnRefundModel.updateReturnItemQuantity(client, item.id, 'received_quantity', quantity);
    }
    if (totalReceived <= 0) return rollbackAndRespond(client, res, 400, 'At least one product must be received.');
    assertReturnTransition(RETURN_STATUS.AWAITING_RETURN, RETURN_STATUS.RECEIVED);
    await returnRefundModel.updateReturnStatus(client, id, RETURN_STATUS.RECEIVED, {
      actorId: req.authUser.id,
      adminNote: textValue(req.body.adminNote, 1000) || null
    });
    await client.query('COMMIT');
    return res.json({
      returnRequest: await updateReturnStatusEmail(req, db, id, RETURN_STATUS.RECEIVED, req.body.adminNote)
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    return sendError(res, error);
  } finally { client.release(); }
};

const startInspection = async (req, res) => {
  const db = getDb(req);
  const id = textValue(req.params.returnRequestId, 80);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const returnRequest = await returnRefundModel.findReturnForUpdate(client, id);
    if (!returnRequest) return rollbackAndRespond(client, res, 404, 'Return request not found.');
    assertReturnTransition(returnRequest.return_status, RETURN_STATUS.INSPECTING);
    await returnRefundModel.updateReturnStatus(client, id, RETURN_STATUS.INSPECTING, {
      actorId: req.authUser.id
    });
    await client.query('COMMIT');
    return res.json({
      returnRequest: await updateReturnStatusEmail(
        req,
        db,
        id,
        RETURN_STATUS.INSPECTING,
        req.body && req.body.adminNote
      )
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    return sendError(res, error);
  } finally { client.release(); }
};

const inspectReturn = async (req, res) => {
  const db = getDb(req);
  const id = textValue(req.params.returnRequestId, 80);
  const decisions = Array.isArray(req.body && req.body.items) ? req.body.items : [];
  if (!decisions.length) return res.status(400).json({ message: 'Inspection decisions are required for every received item.' });
  const byId = new Map();
  for (const decision of decisions) {
    const itemId = textValue(decision.returnItemId || decision.id, 80);
    const accepted = Number(decision.acceptedQuantity ?? 0);
    const rejected = Number(decision.rejectedQuantity ?? 0);
    if (!isValidUuid(itemId) || byId.has(itemId) || !Number.isInteger(accepted) || accepted < 0 || !Number.isInteger(rejected) || rejected < 0) {
      return res.status(400).json({ message: 'Inspection quantities must be valid non-negative whole numbers.' });
    }
    if (rejected > 0 && !textValue(decision.rejectionReason, 1000)) {
      return res.status(400).json({ message: 'A rejection reason is required for every rejected quantity.' });
    }
    if (accepted > 0 && typeof decision.restockable !== 'boolean') {
      return res.status(400).json({ message: 'Restockable must be selected for every accepted item.' });
    }
    byId.set(itemId, { ...decision, accepted, rejected });
  }

  const client = await db.connect();
  let refund = null;
  let createdRefund = false;
  try {
    await client.query('BEGIN');
    const request = await returnRefundModel.findReturnForUpdate(client, id, true);
    if (!request) return rollbackAndRespond(client, res, 404, 'Return request not found.');
    if (request.return_status === RETURN_STATUS.RECEIVED) {
      assertReturnTransition(RETURN_STATUS.RECEIVED, RETURN_STATUS.INSPECTING);
      await returnRefundModel.updateReturnStatus(client, id, RETURN_STATUS.INSPECTING, {
        actorId: req.authUser.id
      });
      request.return_status = RETURN_STATUS.INSPECTING;
    }
    if (request.return_status !== RETURN_STATUS.INSPECTING) {
      return rollbackAndRespond(client, res, 409, 'Only received products under inspection can be inspected.');
    }
    const returnItems = await returnRefundModel.listReturnItemsForUpdate(client, id, true);
    if (returnItems.length !== byId.size || returnItems.some(item => !byId.has(String(item.id)))) {
      return rollbackAndRespond(client, res, 400, 'An inspection decision is required for every return item.');
    }
    let acceptedTotal = 0;
    let refundAmount = 0;
    for (const item of returnItems) {
      const decision = byId.get(String(item.id));
      if (decision.accepted + decision.rejected !== numberValue(item.received_quantity)) {
        return rollbackAndRespond(client, res, 409, 'Accepted and rejected quantities must account for every received unit.');
      }
      let itemRefund = 0;
      let restored = 0;
      if (decision.accepted > 0) {
        itemRefund = calculateReturnItemRefund(item, decision.accepted);
        restored = await returnRefundModel.applyInspectionInventory(client, {
          order: request,
          item,
          acceptedQuantity: decision.accepted,
          restockable: decision.restockable,
          actorId: req.authUser.id,
          returnRequestId: id
        });
        await returnRefundModel.updateOrderItemRefund(
          client,
          item.order_item_id,
          decision.accepted,
          itemRefund
        );
      }
      acceptedTotal += decision.accepted;
      refundAmount = roundMoney(refundAmount + itemRefund);
      await returnRefundModel.updateInspectionItem(client, item.id, {
        accepted: decision.accepted,
        rejected: decision.rejected,
        restockable: decision.accepted > 0 ? Boolean(decision.restockable) : null,
        conditionCode: textValue(decision.conditionCode, 60) || null,
        inspectionNote: textValue(decision.inspectionNote, 1000) || null,
        rejectionReason: textValue(decision.rejectionReason, 1000) || null,
        refundAmount: itemRefund,
        inventoryRestoredQuantity: restored
      });
    }

    if (acceptedTotal <= 0) {
      assertReturnTransition(RETURN_STATUS.INSPECTING, RETURN_STATUS.INSPECTION_REJECTED);
      await returnRefundModel.updateReturnStatus(client, id, RETURN_STATUS.INSPECTION_REJECTED, {
        actorId: req.authUser.id,
        reason: textValue(req.body.rejectionReason, 1000) || 'Returned products did not pass inspection.'
      });
    } else {
      assertReturnTransition(RETURN_STATUS.INSPECTING, RETURN_STATUS.INSPECTION_APPROVED);
      await returnRefundModel.updateReturnStatus(client, id, RETURN_STATUS.INSPECTION_APPROVED, {
        actorId: req.authUser.id
      });
      const result = await createSystemRefund(client, {
        order: { ...request, id: request.order_id },
        refundType: 'product_return',
        returnRequestId: id,
        amount: refundAmount,
        reason: `Accepted inspected products for return ${request.return_code}`,
        createdBy: req.authUser.id,
        sourceKey: `product_return:${id}`
      });
      refund = result.refund;
      createdRefund = result.created;
      assertReturnTransition(RETURN_STATUS.INSPECTION_APPROVED, RETURN_STATUS.REFUND_PENDING);
      await returnRefundModel.updateReturnStatus(client, id, RETURN_STATUS.REFUND_PENDING);
      await refreshOrderPaymentStatus(client, request.order_id);
    }
    await client.query('COMMIT');
    const payload = await updateReturnStatusEmail(
      req,
      db,
      id,
      acceptedTotal > 0 ? RETURN_STATUS.INSPECTION_APPROVED : RETURN_STATUS.INSPECTION_REJECTED,
      req.body.adminNote
    );
    if (refund && createdRefund) {
      const order = await loadOrderForEmail(db, request.order_id);
      await notifyRefundPending(req, db, order, refund).catch(() => null);
    }
    return res.json({ returnRequest: payload, refund: serializeRefund(refund) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    return sendError(res, error);
  } finally { client.release(); }
};

const listRefunds = async (req, res) => {
  try {
    const db = getDb(req);
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10)));
    const status = textValue(req.query.status, 40).toLowerCase();
    const type = textValue(req.query.type, 40).toLowerCase();
    const search = textValue(req.query.search || req.query.q, 120);
    const result = await returnRefundModel.listRefundRows(db, {
      status,
      type,
      search,
      limit,
      offset: (page - 1) * limit
    });
    return res.json({
      items: result.rows.map(row => serializeRefund(row, true)),
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
    });
  } catch (error) { return sendError(res, error); }
};

const readRefund = async (req, res) => {
  const id = textValue(req.params.refundId, 80);
  try {
    const refund = await returnRefundModel.findRefund(getDb(req), id);
    if (!refund) return res.status(404).json({ message: 'Refund not found.' });
    return res.json({ refund: serializeRefund(refund, true) });
  } catch (error) { return sendError(res, error); }
};

const changeRefundStatus = async (req, res, nextStatus) => {
  const db = getDb(req);
  const id = textValue(req.params.refundId, 80);
  const transactionReference = textValue(req.body && req.body.transactionReference, 160);
  const failureReason = textValue(req.body && req.body.failureReason, 1000);
  if (nextStatus === REFUND_STATUS.COMPLETED && !transactionReference) {
    return res.status(400).json({ message: 'Manual bank transaction reference is required.' });
  }
  if (nextStatus === REFUND_STATUS.FAILED && !failureReason) {
    return res.status(400).json({ message: 'Failure reason is required.' });
  }
  const client = await db.connect();
  let updatedRefund;
  try {
    await client.query('BEGIN');
    const refund = await returnRefundModel.findRefund(client, id, true);
    if (!refund) return rollbackAndRespond(client, res, 404, 'Refund not found.');
    if (nextStatus === REFUND_STATUS.PROCESSING && (
      String(refund.refund_account_status || '').toLowerCase() !== 'ready' ||
      !textValue(refund.refund_bank_name, 120) ||
      !textValue(refund.refund_account_number, 40) ||
      !textValue(refund.refund_account_holder, 160)
    )) {
      return rollbackAndRespond(
        client,
        res,
        409,
        'The customer must provide a refund bank account before processing can start.'
      );
    }
    assertRefundTransition(refund.status, nextStatus);
    updatedRefund = await returnRefundModel.updateRefundStatus(client, {
      id,
      status: nextStatus,
      transactionReference,
      failureReason,
      actorId: req.authUser.id,
      adminNote: textValue(req.body.adminNote, 1000) || null
    });
    if (nextStatus === REFUND_STATUS.COMPLETED && refund.return_request_id) {
      const returnRequest = await returnRefundModel.findReturnForUpdate(client, refund.return_request_id);
      if (returnRequest) {
        assertReturnTransition(returnRequest.return_status, RETURN_STATUS.COMPLETED);
        await returnRefundModel.updateReturnStatus(
          client,
          refund.return_request_id,
          RETURN_STATUS.COMPLETED
        );
      }
    }
    await refreshOrderPaymentStatus(client, refund.order_id);
    await client.query('COMMIT');
    if (nextStatus === REFUND_STATUS.COMPLETED) {
      invalidateDashboardCache();
    }
    const order = await loadOrderForEmail(db, refund.order_id);
    const response = res.json({ refund: serializeRefund(updatedRefund, true), order: serializeOrder(order) });
    if (nextStatus === REFUND_STATUS.COMPLETED) {
      notifyRefundCompleted(req, db, order, updatedRefund).catch(() => null);
    }
    if (nextStatus === REFUND_STATUS.COMPLETED && updatedRefund.return_request_id) {
      fetchReturnPayload(db, updatedRefund.return_request_id)
        .then(returnPayload => notifyReturnStatusChanged(req, db, returnPayload, RETURN_STATUS.COMPLETED))
        .catch(() => null);
    }
    return response;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    return sendError(res, error);
  } finally { client.release(); }
};

module.exports = {
  approveReturn,
  cancelAdminOrder: (req, res) => cancelOrder(req, res, true),
  cancelCustomerOrder: (req, res) => cancelOrder(req, res, false),
  completeRefund: (req, res) => changeRefundStatus(req, res, REFUND_STATUS.COMPLETED),
  createReturn,
  failRefund: (req, res) => changeRefundStatus(req, res, REFUND_STATUS.FAILED),
  fetchLatestAdminReturnPayloadByOrderId,
  inspectReturn,
  listAdminReturns: (req, res) => listReturns(req, res, true),
  listCustomerReturns: (req, res) => listReturns(req, res, false),
  listRefunds,
  readAdminReturn: (req, res) => readReturn(req, res, true),
  readCustomerReturn: (req, res) => readReturn(req, res, false),
  readRefund,
  receiveReturn,
  rejectAdminBankTransferPayment: (req, res) => cancelOrder(req, res, true, [], true),
  rejectReturn,
  retryRefund: (req, res) => changeRefundStatus(req, res, REFUND_STATUS.PROCESSING),
  returnFailedDelivery: (req, res) => {
    req.body = {
      ...(req.body || {}),
      reason: textValue(req.body && req.body.reason, 1000) || 'Delivery failed and package returned to warehouse.'
    };
    return cancelOrder(req, res, true, [ORDER_STATUS.DELIVERY_FAILED]);
  },
  saveCustomerRefundAccount,
  saveRefundAccount,
  startInspection,
  startRefund: (req, res) => changeRefundStatus(req, res, REFUND_STATUS.PROCESSING),
};
