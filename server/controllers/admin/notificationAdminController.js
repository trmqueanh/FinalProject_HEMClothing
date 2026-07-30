const adminNotificationModel = require('../../models/adminNotificationModel');

const shortCode = value => String(value || '').replace(/-/g, '').slice(0, 8).toUpperCase();
const text = value => String(value || '').trim();
const compactText = (value, maxLength = 92) => {
  const normalized = text(value).replace(/\s+/g, ' ');
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
};
const formatCurrency = value => `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} ₫`;
const itemId = (type, entityId, timestamp) => {
  const time = timestamp ? new Date(timestamp).getTime() : 0;
  return `${type}:${entityId}:${Number.isFinite(time) ? time : 0}`;
};
const notification = ({
  type,
  entityId,
  title,
  message,
  severity,
  target,
  createdAt,
  searchCode = ''
}) => ({
  id: itemId(type, entityId, createdAt),
  type,
  entityId: String(entityId || ''),
  title,
  message,
  count: 1,
  severity,
  target,
  searchCode: String(searchCode || ''),
  createdAt: createdAt || null
});

const orderItems = rows => rows.map(row => {
  const code = shortCode(row.id);
  const customer = text(row.customer_name) || 'Customer';
  const updatedAt = row.updated_at || row.created_at;

  if (text(row.order_status) === 'delivery_failed') {
    return notification({
      type: 'delivery_failed',
      entityId: row.id,
      title: `Delivery failed · #${code}`,
      message: `${customer} · ${formatCurrency(row.total_amount)} · Follow-up required`,
      severity: 'danger',
      target: `/studio/orders/${encodeURIComponent(row.id)}`,
      searchCode: code,
      createdAt: updatedAt
    });
  }

  if (text(row.payment_status) === 'payment_under_review') {
    return notification({
      type: 'payment_reviews',
      entityId: row.id,
      title: `Payment review · #${code}`,
      message: `${customer} · ${formatCurrency(row.total_amount)} · ${text(row.payment_status).replace(/_/g, ' ')}`,
      severity: 'warning',
      target: `/studio/payments?search=${encodeURIComponent(code)}&status=${encodeURIComponent(row.payment_status)}`,
      searchCode: code,
      createdAt: updatedAt
    });
  }

  return notification({
    type: 'new_orders',
    entityId: row.id,
    title: `New COD order · #${code}`,
    message: `${customer} · ${formatCurrency(row.total_amount)} · Waiting for confirmation`,
    severity: 'info',
    target: `/studio/orders/${encodeURIComponent(row.id)}`,
    searchCode: code,
    createdAt: row.created_at
  });
});

const returnItems = rows => rows.map(row => {
  const code = text(row.return_code) || shortCode(row.id);
  const orderCode = shortCode(row.order_id);
  const product = compactText(row.product_names, 42) || 'Returned product';
  return notification({
    type: 'return_requests',
    entityId: row.id,
    title: `Return request · ${code}`,
    message: `Order #${orderCode} · ${text(row.customer_name) || 'Customer'} · ${product}`,
    severity: 'warning',
    target: `/studio/requests?mode=returns&search=${encodeURIComponent(orderCode)}`,
    searchCode: orderCode,
    createdAt: row.updated_at || row.created_at
  });
});

const refundItems = rows => rows.map(row => {
  const code = text(row.refund_code) || shortCode(row.id);
  const orderCode = shortCode(row.order_id);
  const amount = row.approved_amount == null ? row.requested_amount : row.approved_amount;
  return notification({
    type: 'refund_requests',
    entityId: row.id,
    title: `Refund · ${code}`,
    message: `Order #${orderCode} · ${formatCurrency(amount)} · ${text(row.status)}`,
    severity: text(row.status) === 'failed' ? 'danger' : 'warning',
    target: `/studio/requests?mode=refunds&search=${encodeURIComponent(orderCode)}`,
    searchCode: orderCode,
    createdAt: row.updated_at || row.created_at
  });
});

const reviewItems = rows => rows.map(row => {
  const reviewSearch = text(row.comment).replace(/\s+/g, ' ').slice(0, 60) || text(row.product_name);
  const comment = compactText(row.comment, 76) || 'No written comment';
  return notification({
    type: 'product_reviews',
    entityId: row.id,
    title: `${Number(row.rating || 0)}★ review · ${text(row.product_name) || 'Product'}`,
    message: `${text(row.customer_name) || 'Customer'} · ${comment}`,
    severity: 'info',
    target: `/studio/products/reviews?search=${encodeURIComponent(reviewSearch)}&reviewId=${encodeURIComponent(row.id)}`,
    searchCode: reviewSearch,
    createdAt: row.created_at
  });
});

const inventoryItems = rows => rows.map(row => {
  const available = Math.max(0, Number(row.available_quantity || 0));
  const isOut = available === 0;
  const code = text(row.product_code || row.article_number) || String(row.id || '');
  return notification({
    type: isOut ? 'out_of_stock' : 'low_stock',
    entityId: row.id,
    title: `${isOut ? 'Out of stock' : 'Low stock'} · ${text(row.product_name) || 'Product'}`,
    message: `${code} · ${text(row.color_name) || 'Default'} / ${text(row.size_label) || 'One Size'} · ${available} available`,
    severity: isOut ? 'danger' : 'warning',
    target: `/studio/inventory?search=${encodeURIComponent(code)}&stockRange=${isOut ? 'out' : 'low'}`,
    searchCode: code,
    createdAt: row.updated_at
  });
});

module.exports = ({ LOW_STOCK_THRESHOLD, getDb, sendError }) => async (req, res) => {
  try {
    const rows = await adminNotificationModel.loadActionItems(getDb(req), LOW_STOCK_THRESHOLD);
    const allItems = [
      ...orderItems(rows.orders),
      ...returnItems(rows.returns),
      ...refundItems(rows.refunds),
      ...reviewItems(rows.reviews),
      ...inventoryItems(rows.inventory)
    ].sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });
    const search = text(req.query.search || req.query.q).toLowerCase();
    const type = text(req.query.type).toLowerCase();
    const filteredItems = allItems.filter(item => {
      if (type && item.type !== type) return false;
      if (!search) return true;
      return [item.title, item.message, item.searchCode, item.entityId]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    return res.json({
      items: filteredItems.slice(offset, offset + limit),
      totalActions: allItems.length,
      pagination: {
        page,
        limit,
        totalItems: filteredItems.length,
        totalPages: Math.max(1, Math.ceil(filteredItems.length / limit))
      }
    });
  } catch (error) {
    return sendError(res, error);
  }
};
