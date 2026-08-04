const {
  BANK_TRANSFER_FILTER_PAYMENT_STATUSES,
  MAX_DELIVERY_RETRIES,
  ORDER_STATUS,
  PAYMENT_STATUS
} = require('../../constants/domainConstants');

module.exports = ({
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  applyOrderStatusInventoryEffects,
  buildBankTransferPaymentDetails,
  buildPaginationPayload,
  ensureOrderStatusTransition,
  fetchReturnPayloadsByOrderId,
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
}) => {
  const controller = {};
  const serializeBankTransferPaymentRow = row => ({
    ...serializeOrderRow(row),
    bankTransfer: buildBankTransferPaymentDetails(row)
  });
  const fetchAdminOrderPayloadById = async (db, orderId) => {
    const row = await orderModel.findAdminOrder(db, orderId);
    return row ? serializeOrderRow(row) : null;
  };

  controller.listAdminBankTransferPayments = async (req, res) => {
    try {
      const db = getDb(req);
      const status = String(req.query.status || PAYMENT_STATUS.UNDER_REVIEW).trim().toLowerCase();
      const paymentStatus = BANK_TRANSFER_FILTER_PAYMENT_STATUSES.has(status)
        ? status
        : PAYMENT_STATUS.UNDER_REVIEW;
      const searchTerm = String(req.query.search || req.query.q || '').trim();
      const rows = await orderModel.listBankTransferPayments(db, paymentStatus, searchTerm);
      return res.json({ items: rows.map(serializeBankTransferPaymentRow) });
    } catch (error) {
      return sendError(res, error, 400);
    }
  };

  controller.confirmAdminBankTransferPayment = async (req, res) => {
    try {
      const db = getDb(req);
      const orderId = String(req.params.orderId || '').trim();
      if (!isValidUuid(orderId)) return res.status(400).json({ message: 'Order id is required.' });

      const result = await orderModel.confirmBankTransferPayment(db, {
        orderId,
        reviewedBy: req.authUser.id
      });
      if (!result.rowCount) {
        return res.status(400).json({
          message: 'The payment must be under review, the order must still be pending, and the received amount must match the order total.'
        });
      }
      await writeOrderStatusHistory(
        db,
        orderId,
        ORDER_STATUS.PENDING,
        ORDER_STATUS.PROCESSING,
        req.authUser.id,
        'Bank transfer payment confirmed manually.',
        'admin'
      ).catch(() => null);
      const order = await fetchAdminOrderPayloadById(db, orderId) || serializeOrderRow(result.rows[0]);
      const response = res.json({ order });
      notifyBankTransferConfirmed(req, db, order).catch(() => null);
      return response;
    } catch (error) {
      return sendError(res, error, 400);
    }
  };

  controller.listAdminOrders = async (req, res) => {
    try {
      const db = getDb(req);
      const pagination = parsePaginationQuery(req.query || {});
      const searchTerm = String(req.query.search || req.query.q || '').trim();
      const requestedOrderStatus = normalizeOrderStatusValue(req.query.status || req.query.orderStatus || '');
      const requestedPaymentStatus = serializePaymentStatus(req.query.paymentStatus || '');
      const orderStatus = ORDER_STATUSES.has(requestedOrderStatus) ? requestedOrderStatus : '';
      const paymentStatus = PAYMENT_STATUSES.has(requestedPaymentStatus)
        ? await resolvePaymentStatusForDb(db, requestedPaymentStatus)
        : '';
      const result = await orderModel.listAdminOrders(db, {
        searchTerm,
        orderStatus,
        paymentStatus,
        dateRange: String(req.query.dateRange || req.query.range || '').trim().toLowerCase(),
        sort: String(req.query.sort || '').trim().toLowerCase(),
        pagination
      });
      const orderIds = result.rows.map(row => row.id);
      const [returnRequestsByOrderId, refundRequestsByOrderId] = await Promise.all([
        fetchReturnRequestsByOrderIds(db, orderIds),
        fetchRefundRequestsByOrderIds(db, orderIds)
      ]);
      const items = result.rows.map(row => ({
        ...serializeOrderRow(row),
        returnRequest: returnRequestsByOrderId.get(String(row.id)) || null,
        refundRequest: refundRequestsByOrderId.get(String(row.id)) || null
      }));
      if (!pagination) return res.json(items);
      const stats = result.stats || {};
      return res.json({
        items,
        pagination: buildPaginationPayload(pagination, result.total),
        stats: {
          totalOrders: Number(stats.total_orders || 0),
          pending: Number(stats.pending || 0),
          confirmed: Number(stats.confirmed || 0),
          processing: Number(stats.processing || 0),
          shipping: Number(stats.shipping || 0),
          deliveryFailed: Number(stats.delivery_failed || 0),
          delivered: Number(stats.delivered || 0),
          completed: Number(stats.completed || 0),
          returnOrders: Number(stats.return_orders || 0),
          cancelled: Number(stats.cancelled || 0)
        }
      });
    } catch (error) {
      return sendError(res, error);
    }
  };

  controller.updateAdminOrder = async (req, res) => {
    try {
      const db = getDb(req);
      const orderId = String(req.params.orderId || '').trim();
      if (!isValidUuid(orderId)) return res.status(400).json({ message: 'Order id is required.' });
      const payload = normalizeAdminOrderUpdatePayload(req.body);
      const client = await db.connect();
      let updatedOrderRow = null;
      try {
        await client.query('BEGIN');
        const currentOrder = await orderModel.findLockedOrder(client, orderId);
        if (!currentOrder) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: 'Order not found.' });
        }
        if (
          currentOrder.payment_method === 'bank_transfer' &&
          currentOrder.payment_status !== PAYMENT_STATUS.PAID &&
          [
            ORDER_STATUS.CONFIRMED,
            ORDER_STATUS.PROCESSING,
            ORDER_STATUS.SHIPPING,
            ORDER_STATUS.DELIVERED,
            ORDER_STATUS.COMPLETED
          ]
            .includes(payload.orderStatus)
        ) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            message: 'Confirm the bank transfer payment before confirming or processing this order.'
          });
        }
        if (payload.orderStatus === ORDER_STATUS.COMPLETED) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            message: 'Customers complete orders by confirming receipt after delivery.'
          });
        }
        if (payload.orderStatus === ORDER_STATUS.CANCELLED) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Use the cancel order action to cancel an order.' });
        }

        const nextOrderStatus = await resolveOrderStatusForDb(client, payload.orderStatus);
        ensureOrderStatusTransition(currentOrder.order_status, nextOrderStatus);
        if (
          normalizeOrderStatusValue(currentOrder.order_status) === ORDER_STATUS.DELIVERY_FAILED &&
          nextOrderStatus === ORDER_STATUS.SHIPPING
        ) {
          const retryCount = await orderModel.countDeliveryRetries(client, orderId);
          if (retryCount >= MAX_DELIVERY_RETRIES) {
            await client.query('ROLLBACK');
            return res.status(409).json({
              message: 'This order has already used its one delivery retry. Return the package to the warehouse.'
            });
          }
        }
        await applyOrderStatusInventoryEffects(client, currentOrder, payload.orderStatus, req.authUser.id);
        await writeOrderStatusHistory(
          client,
          orderId,
          currentOrder.order_status,
          nextOrderStatus,
          req.authUser.id,
          String(req.body.note || '').trim(),
          'admin'
        );
        updatedOrderRow = await orderModel.updateStatus(client, orderId, nextOrderStatus);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      const serializedOrder = serializeOrderRow(updatedOrderRow);
      const response = res.json(serializedOrder);
      notifyOrderStatusChanged(
        req,
        db,
        serializedOrder,
        serializedOrder.orderStatus,
        String(req.body.note || '').trim()
      ).catch(() => null);
      return response;
    } catch (error) {
      return sendError(res, error, 400);
    }
  };

  controller.markAdminDeliveryFailed = async (req, res) => {
    try {
      const db = getDb(req);
      const orderId = String(req.params.orderId || '').trim();
      const note = String(req.body.note || req.body.reason || 'Delivery failed.').trim().slice(0, 1000) || 'Delivery failed.';
      if (!isValidUuid(orderId)) return res.status(400).json({ message: 'Order id is required.' });
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const order = await orderModel.findLockedOrder(client, orderId);
        if (!order) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: 'Order not found.' });
        }
        if (normalizeOrderStatusValue(order.order_status) !== ORDER_STATUS.SHIPPING) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Only shipping orders can be marked as delivery failed.' });
        }
        ensureOrderStatusTransition(order.order_status, ORDER_STATUS.DELIVERY_FAILED);
        await applyOrderStatusInventoryEffects(client, order, ORDER_STATUS.DELIVERY_FAILED, req.authUser.id);
        await writeOrderStatusHistory(
          client,
          orderId,
          order.order_status,
          ORDER_STATUS.DELIVERY_FAILED,
          req.authUser.id,
          note,
          'admin'
        );
        await orderModel.updateStatus(client, orderId, ORDER_STATUS.DELIVERY_FAILED);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      const serializedOrder = serializeOrderRow(await orderModel.findAdminOrder(db, orderId));
      const response = res.json(serializedOrder);
      notifyOrderStatusChanged(
        req,
        db,
        serializedOrder,
        ORDER_STATUS.DELIVERY_FAILED,
        note
      ).catch(() => null);
      return response;
    } catch (error) {
      return sendError(res, error, 400);
    }
  };

  controller.readAdminOrder = async (req, res) => {
    try {
      const db = getDb(req);
      const orderId = String(req.params.orderId || '').trim();
      if (!isValidUuid(orderId)) return res.status(400).json({ message: 'Order id is required.' });
      const [orderRow, items, timeline, returnRequests, refundRequest] = await Promise.all([
        orderModel.findAdminOrder(db, orderId),
        fetchOrderItemsByOrderId(db, orderId),
        fetchOrderTimeline(db, orderId),
        fetchReturnPayloadsByOrderId(db, orderId),
        fetchRefundRequestByOrderId(db, orderId)
      ]);
      if (!orderRow) return res.status(404).json({ message: 'Order not found.' });
      const returnRequest = returnRequests[0] || null;
      return res.json({
        order: serializeOrderRow({
          ...orderRow,
          item_count: items.reduce((total, item) => total + Number(item.quantity || 0), 0)
        }),
        items,
        timeline,
        returnRequest,
        returnRequests,
        refundRequest
      });
    } catch (error) {
      return sendError(res, error);
    }
  };

  return controller;
};
