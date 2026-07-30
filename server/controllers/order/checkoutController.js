// Checkout order handlers: turns cart items into orders and prepares manual bank transfer details.
const { performance } = require('node:perf_hooks');

module.exports = ({
  BANK_TRANSFER_ACTIVATION_WINDOW_MINUTES,
  BANK_TRANSFER_PAYMENT_WINDOW_MINUTES,
  buildBankTransferPaymentDetails,
  calculateCheckoutTotals,
  checkoutModel,
  createVoucherRedemption,
  ensureCheckoutAddressOwnership,
  ensureCustomerAccount,
  fetchCartContext,
  fetchCartPayloadForOrderResponse,
  getDb,
  incrementVoucherUsage,
  normalizeCheckoutPayload,
  normalizeCartItemIds,
  listEligibleVouchers,
  notifyOrderCreated,
  notifyBankTransferReported,
  expirePendingBankTransfers,
  resolveOrderInsertPaymentValues,
  saveCheckoutAddress,
  sendError,
  serializeOrderRow,
  validateVoucher,
  writeOrderStatusHistory
}) => {
  const controller = {};
  const ensureSelectedCartItems = (items, cartItemIds) => {
    if (items.length !== cartItemIds.length) {
      const error = new Error('One or more selected cart items are not available in your cart.');
      error.statusCode = 403;
      throw error;
    }
  };
  const loadSelectedCartContext = async (db, userId, body, options = {}) => {
    const cartItemIds = normalizeCartItemIds(body || {});
    const context = await fetchCartContext(db, userId, {
      cartItemIds,
      lock: Boolean(options.lock)
    });

    ensureSelectedCartItems(context.items, cartItemIds);
    return {
      ...context,
      cartItemIds
    };
  };
  const defaultCheckoutSchemaCapabilities = {
    hasOrderItemVariantId: true,
    hasOrderItemPriceAtPurchase: true,
    hasOrderItemOriginalPriceAtPurchase: true,
    hasOrderItemPricingModeAtPurchase: true,
    hasOrderItemColorVariantId: true,
    hasOrderItemProductCodeAtPurchase: true,
    hasOrderItemArticleNumberAtPurchase: true,
    hasOrderItemReservedQuantity: true,
    hasInventoryReservedQuantity: true,
    hasInventoryLogs: true
  };
  let checkoutSchemaCapabilities = null;
  let checkoutSchemaPromise = null;

  const getCheckoutSchemaCapabilities = async db => {
    if (String(process.env.CHECKOUT_SCHEMA_PROBE || '').toLowerCase() !== 'true') {
      return defaultCheckoutSchemaCapabilities;
    }

    if (checkoutSchemaCapabilities) {
      return checkoutSchemaCapabilities;
    }

    if (checkoutSchemaPromise) {
      return checkoutSchemaPromise;
    }

    checkoutSchemaPromise = checkoutModel.probeSchemaCapabilities(db).then(row => {
      checkoutSchemaCapabilities = {
        hasOrderItemVariantId: Boolean(row.has_order_item_variant_id),
        hasOrderItemPriceAtPurchase: Boolean(row.has_order_item_price_at_purchase),
        hasOrderItemOriginalPriceAtPurchase: Boolean(row.has_order_item_original_price_at_purchase),
        hasOrderItemPricingModeAtPurchase: Boolean(row.has_order_item_pricing_mode_at_purchase),
        hasOrderItemColorVariantId: Boolean(row.has_order_item_color_variant_id),
        hasOrderItemProductCodeAtPurchase: Boolean(row.has_order_item_product_code_at_purchase),
        hasOrderItemArticleNumberAtPurchase: Boolean(row.has_order_item_article_number_at_purchase),
        hasOrderItemReservedQuantity: Boolean(row.has_order_item_reserved_quantity),
        hasInventoryReservedQuantity: Boolean(row.has_inventory_reserved_quantity),
        hasInventoryLogs: Boolean(row.has_inventory_logs)
      };
      checkoutSchemaPromise = null;
      return checkoutSchemaCapabilities;
    }).catch(error => {
      checkoutSchemaPromise = null;
      throw error;
    });

    return checkoutSchemaPromise;
  };

  const shouldExposeCheckoutTiming = req => {
    const headerValue = String((req.get && req.get('x-debug-timing')) || '').toLowerCase();
    const queryValue = String((req.query && req.query.debugTiming) || '').toLowerCase();
    const envValue = String(process.env.CHECKOUT_TIMING || '').toLowerCase();

    return headerValue === 'checkout' || headerValue === 'true' || queryValue === 'checkout' || queryValue === 'true' || envValue === 'true';
  };

  const createCheckoutTimer = req => {
    const enabled = shouldExposeCheckoutTiming(req);
    const startedAt = performance.now();
    let lastAt = startedAt;
    const steps = [];

    const buildPayload = () => ({
      totalMs: Number((performance.now() - startedAt).toFixed(2)),
      steps
    });

    return {
      enabled,
      mark(label) {
        if (!enabled) {
          return;
        }

        const now = performance.now();
        steps.push({
          label,
          durationMs: Number((now - lastAt).toFixed(2)),
          totalMs: Number((now - startedAt).toFixed(2))
        });
        lastAt = now;
      },
      attach(res) {
        if (!enabled) {
          return null;
        }

        const payload = buildPayload();
        res.setHeader('X-Checkout-Timing', JSON.stringify(payload));
        return payload;
      }
    };
  };

  const getPriceLabel = pricingMode => {
    if (pricingMode === 'sale') return 'Sale';
    return '';
  };

  const serializeCheckoutOrderItem = (item, insertedItem, orderId) => {
    const variantId = item.inventoryContext && item.inventoryContext.variantId
      ? item.inventoryContext.variantId
      : '';
    const availableQuantity = item.inventoryContext
      ? Math.max(0, Number(item.inventoryContext.availableInventory || 0) - Number(item.quantity || 0))
      : 0;
    const productImage = item.productImage || null;
    const department = String(item.department || '');

    return {
      id: insertedItem && insertedItem.id ? String(insertedItem.id) : String(item.cartItemId || ''),
      orderId: String(orderId),
      productId: String(item.productId),
      variantId,
      productSlug: String(item.productSlug || ''),
      productName: String(item.productName || ''),
      productPrice: Number(item.productPrice || 0),
      priceAtPurchase: Number(item.productPrice || 0),
      originalPrice: Number(item.originalPrice || item.productPrice || 0),
      pricingMode: String(item.pricingMode || 'regular'),
      priceLabel: getPriceLabel(item.pricingMode),
      quantity: Number(item.quantity || 0),
      reservedQuantity: variantId ? Number(item.quantity || 0) : 0,
      sizeLabel: String(item.sizeLabel || ''),
      colorName: String(item.colorName || ''),
      colorVariantId: String(item.colorVariantId || ''),
      productCode: String(item.productCode || item.articleNumber || ''),
      articleNumber: String(item.articleNumber || item.productCode || ''),
      productImage,
      category: String(item.category || ''),
      collection: String(item.collection || ''),
      department,
      reviewId: '',
      hasReview: false,
      buyAgainAvailable: availableQuantity > 0,
      productAvailable: true,
      variantAvailable: Boolean(variantId),
      availableQuantity,
      createdAt: insertedItem && insertedItem.createdAt ? insertedItem.createdAt : null,
      updatedAt: insertedItem && insertedItem.updatedAt ? insertedItem.updatedAt : null,
      product: {
        id: String(item.productId),
        slug: String(item.productSlug || ''),
        name: String(item.productName || ''),
        category: String(item.category || ''),
        collection: String(item.collection || ''),
        gender: department.toLowerCase() === 'men' ? 'men' : 'women',
        imageUrl: productImage || '',
        images: productImage ? [productImage] : [],
        palette: {
          base: '#efe8df',
          accent: '#1f2430',
          glow: '#faf5ef'
        }
      }
    };
  };

  const reserveCheckoutItems = async (client, {
    orderId,
    items,
    schema,
    userId,
    discountAmount,
    cartId,
    cartItemIds,
    checkoutPayload
  }) => {
    const row = await checkoutModel.reserveItems(client, {
      orderId,
      items,
      schema,
      userId,
      discountAmount,
      cartId,
      cartItemIds,
      checkoutPayload
    });
    const expectedCount = items.length;

    if (
      Number(row.input_count || 0) !== expectedCount ||
      Number(row.inserted_count || 0) !== expectedCount ||
      Number(row.updated_count || 0) !== expectedCount ||
      Number(row.refund_snapshot_count || 0) !== expectedCount ||
      Number(row.deleted_cart_item_count || 0) !== expectedCount ||
      Number(row.touched_cart_count || 0) !== 1 ||
      Number(row.profile_count || 0) !== 1
    ) {
      const error = new Error('Unable to reserve stock for one or more checkout items.');
      error.statusCode = 409;
      throw error;
    }

    const insertedItems = Array.isArray(row.order_items) ? row.order_items : [];
    const insertedByItemKey = insertedItems.reduce((map, insertedItem) => {
      map.set(`${insertedItem.productId || ''}:${insertedItem.variantId || ''}`, insertedItem);
      return map;
    }, new Map());
    const serializedItems = items.map(item =>
      serializeCheckoutOrderItem(
        item,
        insertedByItemKey.get(`${item.productId}:${item.inventoryContext.variantId || ''}`),
        orderId
      )
    );

    return {
      orderItems: serializedItems,
      productIds: Array.isArray(row.product_ids) ? row.product_ids.map(String) : [],
      logCount: Number(row.log_count || 0),
      remainingCartItemCount: Number(row.remaining_cart_item_count || 0)
    };
  };

controller.listEligibleVouchers = async (req, res) => {
  try {
    ensureCustomerAccount(req);
    const db = getDb(req);
    const { items } = await loadSelectedCartContext(db, req.authUser.id, req.body);
    const { subtotal } = calculateCheckoutTotals(items);
    const eligibleVouchers = await listEligibleVouchers(db, {
      subtotal,
      userId: req.authUser.id
    });

    return res.json({
      subtotal,
      items: eligibleVouchers
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.validateSelectedVoucher = async (req, res) => {
  try {
    ensureCustomerAccount(req);
    const db = getDb(req);
    const { items } = await loadSelectedCartContext(db, req.authUser.id, req.body);
    const { subtotal } = calculateCheckoutTotals(items);
    const result = await validateVoucher(db, {
      code: req.body && (req.body.code || req.body.voucherCode || req.body.voucher_code),
      subtotal,
      userId: req.authUser.id
    });

    return res.json(result.response);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      message: error.message || 'Voucher code is invalid.'
    });
  }
};

controller.checkout = async (req, res) => {
  const timer = createCheckoutTimer(req);
  let transactionStarted = false;

  try {
    ensureCustomerAccount(req);
    const db = getDb(req);
    const checkoutPayload = normalizeCheckoutPayload(req.body);
    const paymentStatus = 'pending_payment';
    const orderStatus = 'pending';

    timer.mark('validate input');

    timer.mark('skip external payment');

    const client = await db.connect();
    timer.mark('connect database');

    try {
      await client.query('BEGIN');
      transactionStarted = true;
      timer.mark('begin transaction');

      await ensureCheckoutAddressOwnership(client, req.authUser.id, checkoutPayload);
      timer.mark('check address ownership');

      const { cartId, items } = await fetchCartContext(client, req.authUser.id, {
        lock: true,
        cartItemIds: checkoutPayload.cartItemIds
      });
      timer.mark('load cart and product variants/inventory');

      if (!cartId) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return res.status(400).json({
          message: 'Select at least one item to checkout.'
        });
      }

      ensureSelectedCartItems(items, checkoutPayload.cartItemIds);

      for (const item of items) {
        const inventoryContext = item.inventoryContext;
        const availableInventory = inventoryContext ? inventoryContext.availableInventory : 0;

        if (availableInventory < item.quantity) {
          await client.query('ROLLBACK');
          transactionStarted = false;
          return res.status(409).json({
            message: `${item.productName} (${item.colorName}, ${item.sizeLabel}) only has ${availableInventory} item(s) left in stock.`
          });
        }
      }
      timer.mark('validate inventory availability');

      const checkoutSchemaPromise = getCheckoutSchemaCapabilities(db);
      const orderPaymentValuesPromise = resolveOrderInsertPaymentValues(
        db,
        checkoutPayload.paymentMethod,
        paymentStatus
      );

      const baseTotals = calculateCheckoutTotals(items);
      const voucherValidation = checkoutPayload.voucherCode
        ? await validateVoucher(client, {
            code: checkoutPayload.voucherCode,
            subtotal: baseTotals.subtotal,
            userId: req.authUser.id,
            lock: true
          })
        : null;
      const { subtotal, shippingFee, discountAmount, totalAmount } = calculateCheckoutTotals(
        items,
        voucherValidation ? voucherValidation.response.discountAmount : 0
      );
      const voucherCode = voucherValidation ? voucherValidation.response.voucherCode : '';
      timer.mark('check voucher and totals');

      timer.mark('validate payment amount');

      const orderPaymentValues = await orderPaymentValuesPromise;
      timer.mark('resolve payment columns');

      let order = await checkoutModel.createOrderWithHistory(client, {
        userId: req.authUser.id,
        totals: { subtotal, shippingFee, discountAmount, totalAmount },
        voucherCode,
        paymentMethod: orderPaymentValues.paymentMethod,
        paymentStatus: orderPaymentValues.paymentStatus,
        orderStatus,
        shipping: {
          fullName: checkoutPayload.shippingFullName,
          phone: checkoutPayload.shippingPhone,
          city: checkoutPayload.shippingCity,
          district: checkoutPayload.shippingDistrict,
          ward: checkoutPayload.shippingWard,
          addressLine: checkoutPayload.shippingAddressLine,
          note: checkoutPayload.shippingNote
        },
        paymentExpiresAt: checkoutPayload.paymentMethod === 'bank_transfer'
          ? new Date(Date.now() + BANK_TRANSFER_ACTIVATION_WINDOW_MINUTES * 60 * 1000)
          : null,
        historyNote: checkoutPayload.paymentMethod === 'bank_transfer'
          ? 'Order placed with manual bank transfer pending payment.'
          : 'Order placed with Cash on Delivery.'
      });
      timer.mark('create order with initial status history');

      const {
        hasOrderItemVariantId,
        hasOrderItemPriceAtPurchase,
        hasOrderItemOriginalPriceAtPurchase,
        hasOrderItemPricingModeAtPurchase,
        hasOrderItemColorVariantId,
        hasOrderItemProductCodeAtPurchase,
        hasOrderItemArticleNumberAtPurchase,
        hasOrderItemReservedQuantity,
        hasInventoryReservedQuantity,
        hasInventoryLogs
      } = await checkoutSchemaPromise;
      const canHoldInventory = hasInventoryReservedQuantity && hasOrderItemVariantId && hasOrderItemReservedQuantity;

      if (!canHoldInventory) {
        const error = new Error('Inventory reservation columns are required before checkout.');
        error.statusCode = 500;
        throw error;
      }
      timer.mark('load checkout schema capabilities');

      const reservation = await reserveCheckoutItems(client, {
        orderId: order.id,
        items,
        discountAmount,
        schema: {
          hasOrderItemVariantId,
          hasOrderItemPriceAtPurchase,
          hasOrderItemOriginalPriceAtPurchase,
          hasOrderItemPricingModeAtPurchase,
          hasOrderItemColorVariantId,
          hasOrderItemProductCodeAtPurchase,
          hasOrderItemArticleNumberAtPurchase,
          hasOrderItemReservedQuantity,
          hasInventoryLogs
        },
        userId: req.authUser.id,
        cartId,
        cartItemIds: checkoutPayload.cartItemIds,
        checkoutPayload
      });
      timer.mark('create items, reserve inventory, snapshot refund, clean cart and save profile');

      timer.mark('skip legacy product inventory summary sync');
      const remainingCartItemCount = reservation.remainingCartItemCount;

      await saveCheckoutAddress(client, req.authUser.id, checkoutPayload);
      timer.mark('save checkout address');

      if (voucherValidation) {
        const voucherUpdate = await incrementVoucherUsage(client, voucherValidation.voucher.id);

        if (!voucherUpdate.rowCount) {
          const error = new Error('Voucher usage limit has been reached.');
          error.statusCode = 409;
          throw error;
        }

        await createVoucherRedemption(client, {
          voucherId: voucherValidation.voucher.id,
          voucherCode,
          userId: req.authUser.id,
          orderId: order.id,
          subtotal,
          discountAmount
        });
      }
      timer.mark('update voucher usage and redemption');

      timer.mark('set bank transfer activation deadline');

      await client.query('COMMIT');
      transactionStarted = false;
      timer.mark('commit transaction');

      const remainingCart = remainingCartItemCount > 0
        ? await fetchCartPayloadForOrderResponse(db, req.authUser.id)
        : { id: String(cartId), items: [] };
      timer.mark('load remaining cart items');

      const responsePayload = {
        order: serializeOrderRow({
          ...order,
          item_count: items.reduce((total, item) => total + item.quantity, 0),
          customer_name: req.authUser.name,
          customer_email: req.authUser.email
        }),
        items: reservation.orderItems,
        cart: remainingCart,
        bankTransfer: buildBankTransferPaymentDetails(order)
      };
      timer.mark('build order response');
      const debugTiming = timer.attach(res);

      if (debugTiming) {
        responsePayload.debugTiming = debugTiming;
      }

      const response = res.status(201).json(responsePayload);

      if (checkoutPayload.paymentMethod !== 'bank_transfer' && typeof notifyOrderCreated === 'function') {
        setImmediate(() => {
          notifyOrderCreated(req, db, responsePayload.order, responsePayload.items).catch(() => null);
        });
      }

      return response;
    } catch (error) {
      if (transactionStarted) {
        await client.query('ROLLBACK');
        transactionStarted = false;
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.activateBankTransferPayment = async (req, res) => {
  try {
    ensureCustomerAccount(req);
    const db = getDb(req);
    const orderId = String(req.params.orderId || '').trim();
    if (!orderId) return res.status(400).json({ message: 'Order id is required.' });

    const orderRow = await checkoutModel.activateBankTransferPayment(
      db,
      orderId,
      req.authUser.id,
      BANK_TRANSFER_PAYMENT_WINDOW_MINUTES
    );
    if (!orderRow) {
      return res.status(409).json({ message: 'This QR payment can no longer be activated.' });
    }

    return res.json({
      order: serializeOrderRow(orderRow),
      bankTransfer: buildBankTransferPaymentDetails(orderRow)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.markBankTransferPaid = async (req, res) => {
  const responseStartedAt = performance.now();
  try {
    ensureCustomerAccount(req);

    const db = getDb(req);
    const orderId = String(req.params.orderId || '').trim();

    if (!orderId) {
      return res.status(400).json({
        message: 'Order id is required.'
      });
    }

    const orderRow = await checkoutModel.reportBankTransfer(db, orderId, req.authUser.id);

    if (!orderRow) {
      return res.status(404).json({
        message: 'Bank transfer payment is not available for this order.'
      });
    }

    const orderWithCustomer = {
      ...orderRow,
      customer_name: req.authUser.name,
      customer_email: req.authUser.email
    };
    const serializedOrder = serializeOrderRow(orderWithCustomer);

    await writeOrderStatusHistory(
      db,
      orderId,
      'pending',
      'pending',
      req.authUser.id,
      `Customer reported a bank transfer of ${orderRow.total_amount}. Payment verification is pending.`,
      'user'
    ).catch(() => null);

    const responsePayload = {
      order: serializedOrder,
      bankTransfer: buildBankTransferPaymentDetails(orderRow)
    };

    res.set('Server-Timing', `bank-transfer-report;dur=${(performance.now() - responseStartedAt).toFixed(1)}`);
    res.json(responsePayload);

    if (typeof notifyBankTransferReported === 'function') {
      setImmediate(() => {
        notifyBankTransferReported(req, db, orderWithCustomer).catch(() => null);
      });
    }

    return undefined;
  } catch (error) {
    return sendError(res, error);
  }
};

controller.expireBankTransferPayment = async (req, res) => {
  try {
    ensureCustomerAccount(req);
    const db = getDb(req);
    const orderId = String(req.params.orderId || '').trim();
    const expired = await expirePendingBankTransfers(db, {
      orderId,
      userId: req.authUser.id,
      limit: 1
    });

    if (expired.length) {
      return res.json({ order: serializeOrderRow(expired[0]) });
    }

    const currentOrder = await checkoutModel.findOwnedOrder(db, orderId, req.authUser.id);

    if (!currentOrder) {
      return res.status(404).json({ message: 'Order was not found.' });
    }

    return res.json({ order: serializeOrderRow(currentOrder) });
  } catch (error) {
    return sendError(res, error);
  }
};

  return controller;
};
