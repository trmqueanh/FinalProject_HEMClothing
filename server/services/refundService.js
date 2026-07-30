const { randomUUID } = require('crypto');
const { PAYMENT_STATUS } = require('../constants/domainConstants');

const REFUND_TABLE = 'refunds';

const toMinor = value => Math.round((Number(value) || 0) * 100);
const fromMinor = value => Number((Math.max(0, Number(value) || 0) / 100).toFixed(2));
const roundMoney = value => fromMinor(toMinor(value));

const allocateOrderDiscount = (items, discountAmount) => {
  const normalized = (Array.isArray(items) ? items : []).map((item, position) => ({
    ...item,
    position,
    quantity: Math.max(0, Number(item.quantity) || 0),
    unitPrice: Math.max(0, Number(item.unitPrice ?? item.priceAtPurchase ?? item.price_at_purchase ?? item.product_price) || 0)
  }));
  const grossMinor = normalized.map(item => toMinor(item.unitPrice * item.quantity));
  const totalGrossMinor = grossMinor.reduce((sum, value) => sum + value, 0);
  const requestedDiscountMinor = Math.max(0, toMinor(discountAmount));
  const discountMinor = Math.min(requestedDiscountMinor, totalGrossMinor);
  let allocatedMinor = 0;

  return normalized.map((item, index) => {
    const isLast = index === normalized.length - 1;
    const allocation = totalGrossMinor <= 0
      ? 0
      : isLast
        ? discountMinor - allocatedMinor
        : Math.min(grossMinor[index], Math.floor(discountMinor * grossMinor[index] / totalGrossMinor));
    allocatedMinor += allocation;

    return {
      ...item,
      grossLineTotal: fromMinor(grossMinor[index]),
      voucherDiscountAllocated: fromMinor(allocation),
      netLineTotal: fromMinor(grossMinor[index] - allocation)
    };
  });
};

const calculateReturnItemRefund = (orderItem, acceptedQuantity) => {
  const purchasedQuantity = Math.max(0, Number(orderItem.quantity) || 0);
  const alreadyRefundedQuantity = Math.max(0, Number(orderItem.refunded_quantity ?? orderItem.refundedQuantity) || 0);
  const requestedQuantity = Math.max(0, Number(acceptedQuantity) || 0);
  const remainingQuantity = Math.max(0, purchasedQuantity - alreadyRefundedQuantity);

  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0 || requestedQuantity > remainingQuantity) {
    const error = new Error('Accepted return quantity exceeds the remaining refundable quantity.');
    error.statusCode = 409;
    throw error;
  }

  const netMinor = toMinor(orderItem.net_line_total ?? orderItem.netLineTotal ??
    (Number(orderItem.price_at_purchase ?? orderItem.product_price) || 0) * purchasedQuantity);
  const alreadyRefundedMinor = toMinor(orderItem.refunded_amount ?? orderItem.refundedAmount);
  const remainingMinor = Math.max(0, netMinor - alreadyRefundedMinor);
  const amountMinor = requestedQuantity === remainingQuantity
    ? remainingMinor
    : Math.min(remainingMinor, Math.round(netMinor * requestedQuantity / Math.max(1, purchasedQuantity)));

  return fromMinor(amountMinor);
};

const paidAmountForOrder = order => {
  const received = Number(order.payment_received_amount ?? order.paymentReceivedAmount);
  if (Number.isFinite(received) && received > 0) return roundMoney(received);
  return roundMoney(order.total_amount ?? order.totalAmount);
};

const calculatePaymentStatus = ({ paidAmount, completedAmount, activeAmount }) => {
  const paidMinor = toMinor(paidAmount);
  const completedMinor = toMinor(completedAmount);
  const activeMinor = toMinor(activeAmount);

  if (activeMinor > 0) return PAYMENT_STATUS.REFUND_PENDING;
  if (paidMinor > 0 && completedMinor >= paidMinor) return PAYMENT_STATUS.REFUNDED;
  if (completedMinor > 0) return PAYMENT_STATUS.PARTIALLY_REFUNDED;
  return PAYMENT_STATUS.PAID;
};

const makeCode = prefix => `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;

const createSystemRefund = async (client, {
  order,
  refundType,
  returnRequestId = null,
  amount,
  reason,
  createdBy = null,
  sourceKey
}) => {
  if (!order || !order.id || !sourceKey) {
    throw new Error('Refund source and order are required.');
  }

  const existingResult = await client.query(
    `SELECT * FROM ${REFUND_TABLE} WHERE source_key = $1 LIMIT 1`,
    [sourceKey]
  );
  if (existingResult.rowCount) return { refund: existingResult.rows[0], created: false };

  const totalsResult = await client.query(
    `
      SELECT COALESCE(SUM(requested_amount) FILTER (WHERE status <> 'cancelled'), 0)::numeric AS reserved_amount
      FROM ${REFUND_TABLE}
      WHERE order_id = $1
    `,
    [order.id]
  );
  const paidAmount = paidAmountForOrder(order);
  const remaining = roundMoney(paidAmount - Number(totalsResult.rows[0]?.reserved_amount || 0));
  const requestedAmount = roundMoney(amount);

  if (requestedAmount <= 0 || requestedAmount > remaining) {
    const error = new Error('Refund amount must be positive and cannot exceed the remaining paid amount.');
    error.statusCode = 409;
    throw error;
  }

  let refundAccount = null;
  if (returnRequestId) {
    const accountResult = await client.query(
      `SELECT refund_bank_code, refund_bank_name, refund_account_number,
              refund_account_holder, refund_account_submitted_at
       FROM return_requests WHERE id = $1 LIMIT 1`,
      [returnRequestId]
    );
    refundAccount = accountResult.rows[0] || null;
  }

  const accountReady = Boolean(refundAccount && String(refundAccount.refund_account_number || '').trim());
  const insertResult = await client.query(
    `
      INSERT INTO ${REFUND_TABLE} (
        refund_code, order_id, user_id, return_request_id, refund_type,
        source_key, requested_amount, status, reason, created_by,
        refund_bank_code, refund_bank_name, refund_account_number,
        refund_account_holder, refund_account_status, refund_account_submitted_at,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9,
              $10, $11, $12, $13, $14, $15, now(), now())
      ON CONFLICT (source_key) DO NOTHING
      RETURNING *
    `,
    [
      makeCode('RFD'), order.id, order.user_id, returnRequestId, refundType,
      sourceKey, requestedAmount, String(reason || 'System-created refund'), createdBy,
      refundAccount && refundAccount.refund_bank_code,
      refundAccount && refundAccount.refund_bank_name,
      refundAccount && refundAccount.refund_account_number,
      refundAccount && refundAccount.refund_account_holder,
      accountReady ? 'ready' : 'not_provided',
      refundAccount && refundAccount.refund_account_submitted_at
    ]
  );

  if (insertResult.rowCount) return { refund: insertResult.rows[0], created: true };
  const concurrentResult = await client.query(`SELECT * FROM ${REFUND_TABLE} WHERE source_key = $1 LIMIT 1`, [sourceKey]);
  return { refund: concurrentResult.rows[0], created: false };
};

const refreshOrderPaymentStatus = async (client, orderId) => {
  const result = await client.query(
    `
      SELECT
        o.id,
        o.total_amount,
        o.payment_received_amount,
        COALESCE(SUM(COALESCE(r.approved_amount, r.requested_amount)) FILTER (WHERE r.status = 'completed'), 0)::numeric AS completed_amount,
        COALESCE(SUM(r.requested_amount) FILTER (WHERE r.status IN ('pending', 'processing', 'failed')), 0)::numeric AS active_amount
      FROM orders o
      LEFT JOIN refunds r ON r.order_id = o.id
      WHERE o.id = $1
      GROUP BY o.id
    `,
    [orderId]
  );

  if (!result.rowCount) return null;
  const row = result.rows[0];
  const status = calculatePaymentStatus({
    paidAmount: Number(row.payment_received_amount || row.total_amount || 0),
    completedAmount: Number(row.completed_amount || 0),
    activeAmount: Number(row.active_amount || 0)
  });
  const updated = await client.query(
    `
      UPDATE orders
      SET payment_status = $2::varchar,
          refund_amount = $3::numeric,
          refunded_at = CASE WHEN $2::varchar = 'refunded' THEN COALESCE(refunded_at, now()) ELSE refunded_at END,
          refund_method = CASE WHEN $3::numeric > 0 THEN 'manual' ELSE refund_method END,
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [orderId, status, Number(row.completed_amount || 0)]
  );
  return updated.rows[0];
};

module.exports = {
  REFUND_TABLE,
  allocateOrderDiscount,
  calculatePaymentStatus,
  calculateReturnItemRefund,
  createSystemRefund,
  fromMinor,
  paidAmountForOrder,
  refreshOrderPaymentStatus,
  roundMoney,
  toMinor
};
