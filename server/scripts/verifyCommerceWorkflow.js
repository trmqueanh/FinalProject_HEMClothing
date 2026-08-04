require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

delete process.env.SMTP_HOST;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

const assert = require('node:assert/strict');
const { pool } = require('../config/database');
const createApp = require('../app');
const { createToken } = require('../utils/authUtils');

const requestJson = async (baseUrl, path, token, method = 'GET', body = null) => {
  process.stdout.write(`[verify] ${method} ${path}\n`);
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    signal: AbortSignal.timeout(30000),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${path} failed (${response.status}): ${payload.message || 'unknown error'}`);
  process.stdout.write(`[verify] ${response.status} ${method} ${path}\n`);
  return payload;
};

const requestJsonWithStatus = async (baseUrl, path, token, method = 'GET', body = null) => {
  process.stdout.write(`[verify] ${method} ${path}\n`);
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    signal: AbortSignal.timeout(30000),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  process.stdout.write(`[verify] ${response.status} ${method} ${path}\n`);
  return { status: response.status, payload };
};

const insertOrder = async (db, userId, amount, status) => {
  const result = await db.query(
    `
      INSERT INTO orders (
        user_id, subtotal, shipping_fee, discount_amount, total_amount,
        payment_method, payment_status, payment_received_amount, order_status,
        shipping_full_name, shipping_phone, shipping_city, shipping_district,
        shipping_ward, shipping_address_line, shipping_note, delivered_at,
        completed_at, created_at, updated_at
      ) VALUES (
        $1, $2, 0, 0, $2, 'bank_transfer', 'paid', $2, $3::varchar,
        'Workflow Verification', '0900000000', 'Ho Chi Minh City', 'District 1',
        'Ben Nghe', 'Verification only', 'COMMERCE WORKFLOW VERIFICATION',
        CASE WHEN $3::varchar IN ('delivered', 'completed') THEN now() ELSE null END,
        CASE WHEN $3::varchar = 'completed' THEN now() ELSE null END,
        now(), now()
      ) RETURNING *
    `,
    [userId, amount, status]
  );
  return result.rows[0];
};

const insertOrderItem = async (db, order, product, quantity, reservedQuantity, unitPrice) => {
  const result = await db.query(
    `
      INSERT INTO order_items (
        order_id, product_id, variant_id, product_name, product_price,
        price_at_purchase, original_price_at_purchase, pricing_mode_at_purchase,
        quantity, reserved_quantity, size_label, color_name,
        gross_line_total, item_discount_amount, voucher_discount_allocated,
        net_line_total, refunded_quantity, refunded_amount, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $5, $5, 'regular', $6, $7, $8, $9,
        $10, 0, 0, $10, 0, 0, now(), now()
      ) RETURNING *
    `,
    [order.id, product.product_id, product.id, product.product_name, unitPrice,
      quantity, reservedQuantity, product.size_label, product.color_name, unitPrice * quantity]
  );
  return result.rows[0];
};

const main = async () => {
  const setup = await pool.connect();
  const orderIds = [];
  const returnRequestIds = [];
  let cancellationVoucherId = null;
  let inventory = null;
  let server = null;

  try {
    const users = await setup.query(
      `SELECT id, name, email, role
       FROM users
       WHERE email_verified = true
         AND LOWER(role) IN ('admin', 'user')
         AND LOWER(COALESCE(status, 'active')) = 'active'`
    );
    const admin = users.rows.find(user => String(user.role).toLowerCase() === 'admin');
    const customer = users.rows.find(user => String(user.role).toLowerCase() === 'user');
    assert.ok(admin && customer, 'Verified admin and customer fixtures are required.');

    const inventoryResult = await setup.query(
      `
        SELECT pi.*, p.name AS product_name, p.price
        FROM product_inventory pi JOIN products p ON p.id = pi.product_id
        WHERE pi.stock_quantity - pi.reserved_quantity >= 3
          AND COALESCE(p.status, 'active') = 'active'
        ORDER BY pi.stock_quantity DESC, pi.id
        LIMIT 1
      `
    );
    assert.ok(inventoryResult.rowCount, 'An inventory variant with three available units is required.');
    inventory = inventoryResult.rows[0];
    const originalInventory = {
      stock: Number(inventory.stock_quantity),
      reserved: Number(inventory.reserved_quantity),
      sold: Number(inventory.sold_quantity)
    };
    const unitPrice = Math.max(10000, Number(inventory.price || 0));

    const cancellationOrder = await insertOrder(setup, customer.id, unitPrice, 'pending');
    orderIds.push(cancellationOrder.id);
    await insertOrderItem(setup, cancellationOrder, inventory, 1, 1, unitPrice);
    await setup.query(`UPDATE product_inventory SET reserved_quantity = reserved_quantity + 1 WHERE id = $1`, [inventory.id]);
    const cancellationVoucherCode = `CANCELVERIFY${Date.now()}`;
    const cancellationVoucher = await setup.query(
      `INSERT INTO vouchers (
         code, discount_type, discount_value, min_order_amount, usage_limit,
         per_user_limit, used_count, status, created_at, updated_at
       ) VALUES ($1, 'fixed', 1000, 0, 1, 1, 1, 'active', now(), now())
       RETURNING id`,
      [cancellationVoucherCode]
    );
    cancellationVoucherId = cancellationVoucher.rows[0].id;
    await setup.query('UPDATE orders SET voucher_code = $2 WHERE id = $1', [cancellationOrder.id, cancellationVoucherCode]);
    await setup.query(
      `INSERT INTO voucher_redemptions (
         voucher_id, user_id, order_id, voucher_code, order_subtotal, discount_amount, created_at
       ) VALUES ($1, $2, $3, $4, $5, 1000, now())`,
      [cancellationVoucherId, customer.id, cancellationOrder.id, cancellationVoucherCode, unitPrice]
    );

    const returnOrder = await insertOrder(setup, customer.id, unitPrice * 3, 'delivered');
    orderIds.push(returnOrder.id);
    const returnOrderItem = await insertOrderItem(setup, returnOrder, inventory, 3, 3, unitPrice);
    await setup.query(
      `UPDATE product_inventory SET reserved_quantity = reserved_quantity + 3 WHERE id = $1`,
      [inventory.id]
    );

    const adminToken = createToken(admin);
    const customerToken = createToken(customer);
    server = createApp(pool).listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const cancelled = await requestJson(baseUrl, `/orders/${cancellationOrder.id}/cancel`, customerToken, 'PUT', { reason: 'Automated workflow verification' });
    assert.equal(cancelled.order.orderStatus, 'cancelled');
    assert.equal(cancelled.order.paymentStatus, 'refund_pending');
    assert.equal(cancelled.refund.refundType, 'cancellation');
    assert.equal(cancelled.refund.status, 'pending');
    assert.equal(cancelled.refund.requestedAmount, unitPrice);
    const duplicateCancel = await requestJson(baseUrl, `/orders/${cancellationOrder.id}/cancel`, customerToken, 'PUT', { reason: 'Idempotency verification' });
    assert.equal(duplicateCancel.refund.id, cancelled.refund.id);
    const duplicateCount = await setup.query(`SELECT COUNT(*)::int AS count FROM refunds WHERE order_id = $1`, [cancellationOrder.id]);
    assert.equal(duplicateCount.rows[0].count, 1);
    const releasedVoucher = await setup.query(
      `SELECT v.used_count,
              EXISTS (SELECT 1 FROM voucher_redemptions vr WHERE vr.order_id = $2) AS redemption_exists
       FROM vouchers v WHERE v.id = $1`,
      [cancellationVoucherId, cancellationOrder.id]
    );
    assert.equal(Number(releasedVoucher.rows[0].used_count), 0);
    assert.equal(releasedVoucher.rows[0].redemption_exists, false);

    const deliveryFailedOrder = await insertOrder(setup, customer.id, unitPrice, 'delivery_failed');
    orderIds.push(deliveryFailedOrder.id);
    await setup.query('UPDATE orders SET voucher_code = $2 WHERE id = $1', [deliveryFailedOrder.id, cancellationVoucherCode]);
    await setup.query('UPDATE vouchers SET used_count = 1 WHERE id = $1', [cancellationVoucherId]);
    await setup.query(
      `INSERT INTO voucher_redemptions (
         voucher_id, user_id, order_id, voucher_code, order_subtotal, discount_amount, created_at
       ) VALUES ($1, $2, $3, $4, $5, 1000, now())`,
      [cancellationVoucherId, customer.id, deliveryFailedOrder.id, cancellationVoucherCode, unitPrice]
    );
    await requestJson(
      baseUrl,
      `/admin/orders/${deliveryFailedOrder.id}/returned-to-warehouse`,
      adminToken,
      'PUT',
      { reason: 'Post-shipping voucher retention verification' }
    );
    const retainedVoucher = await setup.query(
      `SELECT v.used_count,
              EXISTS (SELECT 1 FROM voucher_redemptions vr WHERE vr.order_id = $2) AS redemption_exists
       FROM vouchers v WHERE v.id = $1`,
      [cancellationVoucherId, deliveryFailedOrder.id]
    );
    assert.equal(Number(retainedVoucher.rows[0].used_count), 1);
    assert.equal(retainedVoucher.rows[0].redemption_exists, true);

    const createdReturn = await requestJson(baseUrl, `/orders/${returnOrder.id}/returns`, customerToken, 'POST', {
      items: [{ orderItemId: returnOrderItem.id, quantity: 1, reason: 'wrong_size', note: 'Verification return' }]
    });
    const returnRequestId = createdReturn.returnRequest.id;
    returnRequestIds.push(returnRequestId);
    const returnItemId = createdReturn.returnRequest.items[0].id;
    const blockedConfirmation = await requestJsonWithStatus(
      baseUrl,
      `/orders/${returnOrder.id}/confirm-received`,
      customerToken,
      'PUT'
    );
    assert.equal(blockedConfirmation.status, 409);
    const approved = await requestJson(baseUrl, `/admin/return-requests/${returnRequestId}/approve`, adminToken, 'PUT', {
      items: [{ returnItemId, approvedQuantity: 1 }]
    });
    assert.equal(approved.returnRequest.returnStatus, 'awaiting_return');
    const received = await requestJson(baseUrl, `/admin/return-requests/${returnRequestId}/received`, adminToken, 'PUT', {
      items: [{ returnItemId, receivedQuantity: 1 }]
    });
    assert.equal(received.returnRequest.returnStatus, 'received');
    const beforeInspection = await setup.query(`SELECT stock_quantity, sold_quantity FROM product_inventory WHERE id = $1`, [inventory.id]);
    assert.deepEqual(beforeInspection.rows[0], { stock_quantity: originalInventory.stock, sold_quantity: originalInventory.sold });
    await requestJson(baseUrl, `/admin/return-requests/${returnRequestId}/inspect/start`, adminToken, 'PUT', {});
    const inspected = await requestJson(baseUrl, `/admin/return-requests/${returnRequestId}/inspect`, adminToken, 'PUT', {
      items: [{ returnItemId, acceptedQuantity: 1, rejectedQuantity: 0, restockable: true, conditionCode: 'resellable' }]
    });
    assert.equal(inspected.returnRequest.returnStatus, 'refund_pending');
    assert.equal(inspected.refund.refundType, 'product_return');
    assert.equal(inspected.refund.requestedAmount, unitPrice);
    const afterInspection = await setup.query(`SELECT stock_quantity, sold_quantity FROM product_inventory WHERE id = $1`, [inventory.id]);
    assert.deepEqual(afterInspection.rows[0], { stock_quantity: originalInventory.stock, sold_quantity: originalInventory.sold });

    await requestJson(baseUrl, `/orders/returns/${returnRequestId}/refund-account`, customerToken, 'PUT', {
      bankCode: 'VCB',
      bankName: 'Vietcombank',
      accountNumber: '0123456789',
      accountHolder: 'NGUYEN VAN A'
    });

    await requestJson(baseUrl, `/admin/refunds/${inspected.refund.id}/processing`, adminToken, 'PUT', {});
    const completed = await requestJson(baseUrl, `/admin/refunds/${inspected.refund.id}/complete`, adminToken, 'PUT', {
      transactionReference: `VERIFY-${Date.now()}`
    });
    assert.equal(completed.refund.status, 'completed');
    assert.equal(completed.order.orderStatus, 'completed');
    assert.equal(completed.order.paymentStatus, 'partially_refunded');
    const inventoryAfterReturnCompletion = await setup.query(
      `SELECT stock_quantity, reserved_quantity, sold_quantity FROM product_inventory WHERE id = $1`,
      [inventory.id]
    );
    assert.deepEqual(inventoryAfterReturnCompletion.rows[0], {
      stock_quantity: originalInventory.stock - 2,
      reserved_quantity: originalInventory.reserved,
      sold_quantity: originalInventory.sold + 2
    });
    const completedReturn = await requestJson(baseUrl, `/orders/returns/${returnRequestId}`, customerToken);
    assert.equal(completedReturn.returnRequest.returnStatus, 'completed');

    const secondReturn = await requestJson(baseUrl, `/orders/${returnOrder.id}/returns`, customerToken, 'POST', {
      items: [{ orderItemId: returnOrderItem.id, quantity: 1, reason: 'defective', note: 'Non-restockable verification' }]
    });
    const secondReturnId = secondReturn.returnRequest.id;
    const secondReturnItemId = secondReturn.returnRequest.items[0].id;
    returnRequestIds.push(secondReturnId);
    await requestJson(baseUrl, `/admin/return-requests/${secondReturnId}/approve`, adminToken, 'PUT', {
      items: [{ returnItemId: secondReturnItemId, approvedQuantity: 1 }]
    });
    await requestJson(baseUrl, `/admin/return-requests/${secondReturnId}/received`, adminToken, 'PUT', {
      items: [{ returnItemId: secondReturnItemId, receivedQuantity: 1 }]
    });
    const beforeNonRestockable = await setup.query(`SELECT stock_quantity, sold_quantity FROM product_inventory WHERE id = $1`, [inventory.id]);
    const secondInspection = await requestJson(baseUrl, `/admin/return-requests/${secondReturnId}/inspect`, adminToken, 'PUT', {
      items: [{ returnItemId: secondReturnItemId, acceptedQuantity: 1, rejectedQuantity: 0, restockable: false, conditionCode: 'damaged' }]
    });
    assert.equal(secondInspection.returnRequest.returnStatus, 'refund_pending');
    const afterNonRestockable = await setup.query(`SELECT stock_quantity, sold_quantity FROM product_inventory WHERE id = $1`, [inventory.id]);
    assert.equal(afterNonRestockable.rows[0].stock_quantity, beforeNonRestockable.rows[0].stock_quantity);
    assert.equal(afterNonRestockable.rows[0].sold_quantity, beforeNonRestockable.rows[0].sold_quantity - 1);
    await requestJson(baseUrl, `/orders/returns/${secondReturnId}/refund-account`, customerToken, 'PUT', {
      bankCode: 'VCB',
      bankName: 'Vietcombank',
      accountNumber: '0123456789',
      accountHolder: 'NGUYEN VAN A'
    });
    await requestJson(baseUrl, `/admin/refunds/${secondInspection.refund.id}/processing`, adminToken, 'PUT', {});
    const secondCompleted = await requestJson(baseUrl, `/admin/refunds/${secondInspection.refund.id}/complete`, adminToken, 'PUT', {
      transactionReference: `VERIFY-NONRESTOCK-${Date.now()}`
    });
    assert.equal(secondCompleted.order.paymentStatus, 'partially_refunded');

    const rejectedReturn = await requestJson(baseUrl, `/orders/${returnOrder.id}/returns`, customerToken, 'POST', {
      items: [{ orderItemId: returnOrderItem.id, quantity: 1, reason: 'not_as_expected', note: 'Inspection rejection verification' }]
    });
    const rejectedReturnId = rejectedReturn.returnRequest.id;
    const rejectedReturnItemId = rejectedReturn.returnRequest.items[0].id;
    returnRequestIds.push(rejectedReturnId);
    await requestJson(baseUrl, `/admin/return-requests/${rejectedReturnId}/approve`, adminToken, 'PUT', {
      items: [{ returnItemId: rejectedReturnItemId, approvedQuantity: 1 }]
    });
    await requestJson(baseUrl, `/admin/return-requests/${rejectedReturnId}/received`, adminToken, 'PUT', {
      items: [{ returnItemId: rejectedReturnItemId, receivedQuantity: 1 }]
    });
    const beforeRejection = await setup.query(`SELECT stock_quantity, sold_quantity FROM product_inventory WHERE id = $1`, [inventory.id]);
    const rejectedInspection = await requestJson(baseUrl, `/admin/return-requests/${rejectedReturnId}/inspect`, adminToken, 'PUT', {
      items: [{ returnItemId: rejectedReturnItemId, acceptedQuantity: 0, rejectedQuantity: 1, rejectionReason: 'Item does not meet return condition' }]
    });
    assert.equal(rejectedInspection.returnRequest.returnStatus, 'inspection_rejected');
    assert.equal(rejectedInspection.refund, null);
    const afterRejection = await setup.query(`SELECT stock_quantity, sold_quantity FROM product_inventory WHERE id = $1`, [inventory.id]);
    assert.deepEqual(afterRejection.rows[0], beforeRejection.rows[0]);
    const returnCount = await setup.query(`SELECT COUNT(*)::int AS count FROM return_requests WHERE order_id = $1`, [returnOrder.id]);
    const refundCount = await setup.query(`SELECT COUNT(*)::int AS count FROM refunds WHERE order_id = $1`, [returnOrder.id]);
    assert.equal(returnCount.rows[0].count, 3);
    assert.equal(refundCount.rows[0].count, 2);

    console.log(JSON.stringify({
      paidCancellationRefund: true,
      preShippingVoucherReleased: true,
      postShippingVoucherRetained: true,
      cancellationIdempotency: true,
      noInventoryBeforeInspection: true,
      returnBlocksReceivedConfirmation: true,
      refundCompletionCompletesDeliveredOrder: true,
      partialReturnRefund: true,
      manualRefundCompletion: true,
      partialPaymentStatus: true,
      multipleReturnsAndRefunds: true,
      acceptedNonRestockable: true,
      inspectionRejectionNoRefundOrStock: true
    }));
  } finally {
    if (server) {
      const closed = new Promise(resolve => server.close(resolve));
      if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
      await closed;
    }
    if (orderIds.length) {
      await setup.query(`DELETE FROM transactional_email_logs WHERE metadata->>'orderId' = ANY($1::text[])`, [orderIds.map(String)]).catch(() => null);
      await setup.query(`DELETE FROM refunds WHERE order_id = ANY($1::uuid[])`, [orderIds]).catch(() => null);
      await setup.query(`DELETE FROM return_requests WHERE order_id = ANY($1::uuid[])`, [orderIds]).catch(() => null);
      await setup.query(`DELETE FROM inventory_logs WHERE note ILIKE ANY($1::text[])`, [
        [...orderIds.map(id => `%${id}%`), ...returnRequestIds.map(id => `%${id}%`)]
      ]).catch(() => null);
      await setup.query(`DELETE FROM orders WHERE id = ANY($1::uuid[])`, [orderIds]).catch(() => null);
    }
    if (cancellationVoucherId) {
      await setup.query('DELETE FROM vouchers WHERE id = $1', [cancellationVoucherId]).catch(() => null);
    }
    if (inventory) {
      await setup.query(
        `UPDATE product_inventory SET stock_quantity = $2, reserved_quantity = $3, sold_quantity = $4, updated_at = now() WHERE id = $1`,
        [inventory.id, inventory.stock_quantity, inventory.reserved_quantity, inventory.sold_quantity]
      ).catch(() => null);
    }
    setup.release();
    await pool.end();
  }
};

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
