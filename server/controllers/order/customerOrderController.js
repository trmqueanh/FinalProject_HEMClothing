const { ORDER_STATUS } = require('../../constants/domainConstants');
const cartModel = require('../../models/cartModel');

module.exports = ({
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
  fetchReturnRequestByOrderId,
  fetchReturnRequestsByOrderIds,
  getDb,
  isValidUuid,
  normalizeOrderStatusValue,
  notifyOrderStatusChanged,
  orderModel,
  parsePaginationQuery,
  resolveOrderStatusForDb,
  sendError,
  serializeOrderRow,
  writeOrderStatusHistory
}) => {
  const controller = {};
  const deliveryConfirmationWindowMs = 3 * 24 * 60 * 60 * 1000;
  const isDeliveryWindowOpen = order => {
    const deliveredAt = new Date(order && (order.delivered_at || order.updated_at) || 0).getTime();
    return Number.isFinite(deliveredAt) && deliveredAt > 0 &&
      Date.now() < deliveredAt + deliveryConfirmationWindowMs;
  };

  controller.listUserOrders = async (req, res) => {
    try {
      ensureCustomerAccount(req);
      const db = getDb(req);
      const pagination = parsePaginationQuery(req.query || {});
      const searchTerm = String(req.query.search || req.query.q || '').trim();
      const orderStatuses = String(req.query.statuses || '')
        .split(',')
        .map(normalizeOrderStatusValue)
        .filter(status => ORDER_STATUSES.has(status));
      const requestsFilter = String(req.query.requests || '').trim().toLowerCase();
      const result = await orderModel.listCustomerOrders(db, {
        userId: req.authUser.id,
        searchTerm,
        orderStatuses: [...new Set(orderStatuses)],
        requestsFilter,
        pagination
      });
      const summary = {
        totalOrders: Number(result.summary && result.summary.total_orders || 0),
        totalSpent: Number(result.summary && result.summary.total_spent || 0)
      };

      if (!result.rows.length) {
        return res.json(pagination
          ? { items: [], pagination: buildPaginationPayload(pagination, 0), summary }
          : []);
      }

      const orderIds = result.rows.map(row => row.id);
      const [itemsByOrderId, returnRequestsByOrderId, refundRequestsByOrderId] = await Promise.all([
        fetchOrderItemSummariesByOrderIds(db, orderIds),
        fetchReturnRequestsByOrderIds(db, orderIds),
        fetchRefundRequestsByOrderIds(db, orderIds)
      ]);
      const items = result.rows.map(row => ({
        ...serializeOrderRow({
          ...row,
          customer_name: req.authUser.name,
          customer_email: req.authUser.email
        }),
        returnRequest: returnRequestsByOrderId.get(String(row.id)) || null,
        refundRequest: refundRequestsByOrderId.get(String(row.id)) || null,
        items: itemsByOrderId.get(String(row.id)) || []
      }));

      return res.json(pagination
        ? { items, pagination: buildPaginationPayload(pagination, result.total), summary }
        : items);
    } catch (error) {
      return sendError(res, error, 400);
    }
  };

  controller.readUserOrder = async (req, res) => {
    try {
      ensureCustomerAccount(req);
      const db = getDb(req);
      const orderId = String(req.params.orderId || '').trim();
      if (!isValidUuid(orderId)) return res.status(400).json({ message: 'Order id is required.' });

      const orderRow = await orderModel.findCustomerOrder(db, {
        orderId,
        userId: req.authUser.id,
        customerName: req.authUser.name,
        customerEmail: req.authUser.email
      });
      if (!orderRow) return res.status(404).json({ message: 'Order not found.' });

      const [items, timeline, returnRequest, refundRequest] = await Promise.all([
        fetchOrderItemsByOrderId(db, orderId),
        fetchOrderTimeline(db, orderId),
        fetchReturnRequestByOrderId(db, orderId),
        fetchRefundRequestByOrderId(db, orderId)
      ]);
      return res.json({
        order: serializeOrderRow(orderRow),
        bankTransfer: buildBankTransferPaymentDetails(orderRow),
        items,
        timeline,
        returnRequest,
        refundRequest
      });
    } catch (error) {
      return sendError(res, error, 400);
    }
  };

  controller.buyAgainOrderItem = async (req, res) => {
    try {
      ensureCustomerAccount(req);
      const db = getDb(req);
      const orderId = String(req.params.orderId || '').trim();
      const orderItemId = String(req.params.orderItemId || '').trim();
      if (!isValidUuid(orderId) || !isValidUuid(orderItemId)) {
        return res.status(400).json({ message: 'Order item id is required.' });
      }

      const client = await db.connect();
      let message = 'Added to cart successfully.';
      let addedQuantity = 0;
      let availableQuantity = 0;
      try {
        await client.query('BEGIN');
        const item = await orderModel.findBuyAgainItem(client, {
          orderId,
          userId: req.authUser.id,
          orderItemId
        });
        if (!item) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: 'Order item not found.' });
        }
        if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(normalizeOrderStatusValue(item.order_status))) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Buy Again is only available after the order is completed or cancelled.' });
        }
        if (!item.active_product_id) {
          await client.query('ROLLBACK');
          return res.status(409).json({ message: 'This product is no longer available.' });
        }
        if (!item.variant_id) {
          await client.query('ROLLBACK');
          return res.status(409).json({ message: 'This color or size is no longer available.' });
        }

        const variant = await orderModel.findInventoryVariantForUpdate(client, item.variant_id);
        if (!variant) {
          await client.query('ROLLBACK');
          return res.status(409).json({ message: 'This color or size is no longer available.' });
        }
        availableQuantity = Math.max(
          0,
          Number(variant.stock_quantity || 0) - Number(variant.reserved_quantity || 0)
        );
        if (availableQuantity <= 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({ message: 'This item is currently out of stock.' });
        }

        const cart = await cartModel.ensureUserCart(client, req.authUser.id);
        const existingItem = await cartModel.findMatchingItemForUpdate(client, {
          cartId: cart.id,
          productId: item.product_id,
          sizeLabel: variant.size_label || 'One Size',
          colorName: variant.color_name || 'Default'
        });
        const orderQuantity = Math.max(1, Number(item.order_quantity || 1));
        const existingQuantity = existingItem ? Number(existingItem.quantity || 0) : 0;
        const targetQuantity = Math.min(availableQuantity, existingQuantity + orderQuantity);
        addedQuantity = Math.max(0, targetQuantity - existingQuantity);

        if (addedQuantity <= 0) {
          message = 'You already have the maximum available quantity in your cart.';
        } else if (existingItem) {
          await cartModel.updateMatchingItem(client, {
            id: existingItem.id,
            quantity: targetQuantity,
            colorVariantId: item.order_color_variant_id || variant.color_variant_id || null
          });
          if (targetQuantity < existingQuantity + orderQuantity) {
            message = `Only ${availableQuantity} items available. Your cart has been updated to the maximum available quantity.`;
          }
        } else {
          await cartModel.insertMatchingItem(client, {
            cartId: cart.id,
            productId: item.product_id,
            quantity: addedQuantity,
            sizeLabel: variant.size_label || 'One Size',
            colorName: variant.color_name || 'Default',
            colorVariantId: item.order_color_variant_id || variant.color_variant_id || null
          });
          if (addedQuantity < orderQuantity) {
            message = `Only ${availableQuantity} items available. We added ${addedQuantity} to your cart.`;
          }
        }

        if (addedQuantity > 0) await cartModel.touch(client, cart.id);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      return res.json({
        cart: await fetchCartPayloadForOrderResponse(db, req.authUser.id),
        message,
        addedQuantity,
        availableQuantity
      });
    } catch (error) {
      return sendError(res, error, 400);
    }
  };

  controller.buyAgainOrderItems = async (req, res) => {
    try {
      ensureCustomerAccount(req);
      const db = getDb(req);
      const orderId = String(req.params.orderId || '').trim();
      const rawItems = Array.isArray(req.body && req.body.items) ? req.body.items : [];

      if (!isValidUuid(orderId)) {
        return res.status(400).json({ message: 'Order id is required.' });
      }
      if (!rawItems.length || rawItems.length > 50) {
        return res.status(400).json({ message: 'Select between 1 and 50 order items.' });
      }

      const seenItemIds = new Set();
      const requestedItems = [];
      for (const rawItem of rawItems) {
        const orderItemId = String(rawItem && (rawItem.orderItemId || rawItem.order_item_id) || '').trim();
        const quantity = Number(rawItem && rawItem.quantity);
        if (!isValidUuid(orderItemId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
          return res.status(400).json({ message: 'Each selected item must have a valid id and quantity.' });
        }
        if (!seenItemIds.has(orderItemId)) {
          seenItemIds.add(orderItemId);
          requestedItems.push({ orderItemId, quantity });
        }
      }

      const client = await db.connect();
      const results = [];
      let cart = null;
      let addedQuantity = 0;
      try {
        await client.query('BEGIN');

        for (const requestedItem of requestedItems) {
          const result = {
            orderItemId: requestedItem.orderItemId,
            requestedQuantity: requestedItem.quantity,
            addedQuantity: 0,
            availableQuantity: 0,
            message: ''
          };
          const item = await orderModel.findBuyAgainItem(client, {
            orderId,
            userId: req.authUser.id,
            orderItemId: requestedItem.orderItemId
          });

          if (!item) {
            result.message = 'Order item not found.';
            results.push(result);
            continue;
          }
          if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(normalizeOrderStatusValue(item.order_status))) {
            result.message = 'Buy Again is only available after the order is completed or cancelled.';
            results.push(result);
            continue;
          }
          if (!item.active_product_id) {
            result.message = 'This product is no longer available.';
            results.push(result);
            continue;
          }
          if (!item.variant_id) {
            result.message = 'This color or size is no longer available.';
            results.push(result);
            continue;
          }

          const variant = await orderModel.findInventoryVariantForUpdate(client, item.variant_id);
          if (!variant) {
            result.message = 'This color or size is no longer available.';
            results.push(result);
            continue;
          }

          result.availableQuantity = Math.max(
            0,
            Number(variant.stock_quantity || 0) - Number(variant.reserved_quantity || 0)
          );
          if (result.availableQuantity <= 0) {
            result.message = 'This item is currently out of stock.';
            results.push(result);
            continue;
          }

          if (!cart) cart = await cartModel.ensureUserCart(client, req.authUser.id);
          const existingItem = await cartModel.findMatchingItemForUpdate(client, {
            cartId: cart.id,
            productId: item.product_id,
            sizeLabel: variant.size_label || 'One Size',
            colorName: variant.color_name || 'Default'
          });
          const existingQuantity = existingItem ? Number(existingItem.quantity || 0) : 0;
          const targetQuantity = Math.min(
            result.availableQuantity,
            existingQuantity + requestedItem.quantity
          );
          result.addedQuantity = Math.max(0, targetQuantity - existingQuantity);

          if (result.addedQuantity <= 0) {
            result.message = 'Your bag already has the maximum available quantity.';
            results.push(result);
            continue;
          }

          if (existingItem) {
            await cartModel.updateMatchingItem(client, {
              id: existingItem.id,
              quantity: targetQuantity,
              colorVariantId: item.order_color_variant_id || variant.color_variant_id || null
            });
          } else {
            await cartModel.insertMatchingItem(client, {
              cartId: cart.id,
              productId: item.product_id,
              quantity: result.addedQuantity,
              sizeLabel: variant.size_label || 'One Size',
              colorName: variant.color_name || 'Default',
              colorVariantId: item.order_color_variant_id || variant.color_variant_id || null
            });
          }

          addedQuantity += result.addedQuantity;
          result.message = result.addedQuantity < requestedItem.quantity
            ? `Only ${result.availableQuantity} items are available. The maximum available quantity was added.`
            : 'Added to your shopping bag.';
          results.push(result);
        }

        if (cart && addedQuantity > 0) await cartModel.touch(client, cart.id);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      const addedItemCount = results.filter(result => result.addedQuantity > 0).length;
      return res.json({
        cart: await fetchCartPayloadForOrderResponse(db, req.authUser.id),
        results,
        addedItemCount,
        addedQuantity,
        message: addedItemCount > 0
          ? `${addedItemCount} product${addedItemCount === 1 ? '' : 's'} added to your shopping bag.`
          : 'None of the selected products could be added.'
      });
    } catch (error) {
      return sendError(res, error, 400);
    }
  };

  controller.confirmReceived = async (req, res) => {
    try {
      ensureCustomerAccount(req);
      const db = getDb(req);
      const orderId = String(req.params.orderId || '').trim();
      if (!isValidUuid(orderId)) return res.status(400).json({ message: 'Order id is required.' });

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const order = await orderModel.findLockedOrder(client, orderId, req.authUser.id);
        if (!order) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: 'Order not found.' });
        }
        if (normalizeOrderStatusValue(order.order_status) !== ORDER_STATUS.DELIVERED) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'You can confirm receipt only after the order is delivered.' });
        }
        if (!isDeliveryWindowOpen(order)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            message: 'The confirmation window has expired and this order is being completed automatically.'
          });
        }

        const completedStatus = await resolveOrderStatusForDb(client, ORDER_STATUS.COMPLETED);
        await applyOrderStatusInventoryEffects(client, order, ORDER_STATUS.COMPLETED, req.authUser.id);
        await writeOrderStatusHistory(
          client,
          orderId,
          order.order_status,
          completedStatus,
          req.authUser.id,
          'Customer confirmed received',
          'user'
        );
        await orderModel.completeOrder(client, orderId);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      const items = await fetchOrderItemsByOrderId(db, orderId);
      const orderRow = await orderModel.findCustomerOrder(db, {
        orderId,
        userId: req.authUser.id,
        customerName: req.authUser.name,
        customerEmail: req.authUser.email
      });
      const serializedOrder = serializeOrderRow(orderRow);
      const response = res.json({ order: serializedOrder, items });
      notifyOrderStatusChanged(
        req,
        db,
        serializedOrder,
        ORDER_STATUS.COMPLETED,
        'Customer confirmed received'
      ).catch(() => null);
      return response;
    } catch (error) {
      return sendError(res, error, 400);
    }
  };

  return controller;
};
