const { pool } = require('../config/database');
const createApp = require('../app');
const { createToken } = require('../utils/authUtils');
const { expirePendingBankTransfers } = require('../services/bankTransferExpirationService');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  let orderId = null;
  let voucherId = null;
  let variantId = null;
  let server = null;

  try {
    const userResult = await pool.query(
      "SELECT id, name, email, role FROM users WHERE LOWER(role) <> 'admin' AND LOWER(COALESCE(status, 'active')) = 'active' ORDER BY created_at ASC LIMIT 1"
    );
    const variantResult = await pool.query(
      `
        SELECT pi.id, pi.product_id, pi.color_name, pi.size_label, pi.reserved_quantity, p.name
        FROM product_inventory pi
        JOIN products p ON p.id = pi.product_id
        WHERE pi.stock_quantity - pi.reserved_quantity >= 1
          AND COALESCE(p.status, 'active') = 'active'
        ORDER BY pi.stock_quantity - pi.reserved_quantity DESC
        LIMIT 1
      `
    );

    assert(userResult.rowCount, 'No customer account is available for verification.');
    assert(variantResult.rowCount, 'No available inventory variant is available for verification.');

    const userId = userResult.rows[0].id;
    const variant = variantResult.rows[0];
    variantId = variant.id;
    const initialReserved = Number(variant.reserved_quantity || 0);
    const voucherCode = `QRVERIFY${Date.now()}`;
    const voucherResult = await pool.query(
      `
        INSERT INTO vouchers (
          code, discount_type, discount_value, min_order_amount,
          usage_limit, per_user_limit, used_count, status, created_at, updated_at
        )
        VALUES ($1, 'fixed', 1000, 0, 1, 1, 1, 'active', now(), now())
        RETURNING id
      `,
      [voucherCode]
    );
    voucherId = voucherResult.rows[0].id;

    const orderResult = await pool.query(
      `
        INSERT INTO orders (
          user_id, subtotal, shipping_fee, discount_amount, voucher_code, total_amount,
          payment_method, payment_status, order_status,
          shipping_full_name, shipping_phone, shipping_city, shipping_district,
          shipping_ward, shipping_address_line, payment_expires_at, created_at, updated_at
        )
        VALUES (
          $1, 10000, 0, 1000, $2, 9000,
          'bank_transfer', 'pending_payment', 'pending',
          'QR Verification', '0900000000', 'Ho Chi Minh City', 'District 1',
          'Ben Nghe', 'Verification address', now() + interval '1 hour', now(), now()
        )
        RETURNING id
      `,
      [userId, voucherCode]
    );
    orderId = orderResult.rows[0].id;

    await pool.query(
      `
        INSERT INTO order_items (
          order_id, product_id, variant_id, product_name, product_price,
          price_at_purchase, original_price_at_purchase, pricing_mode_at_purchase,
          quantity, reserved_quantity, size_label, color_name, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 10000, 10000, 10000, 'regular', 1, 1, $5, $6, now(), now())
      `,
      [orderId, variant.product_id, variant.id, variant.name, variant.size_label, variant.color_name]
    );
    await pool.query(
      'UPDATE product_inventory SET reserved_quantity = reserved_quantity + 1, updated_at = now() WHERE id = $1',
      [variant.id]
    );
    await pool.query(
      `
        INSERT INTO voucher_redemptions (
          voucher_id, user_id, order_id, voucher_code, order_subtotal, discount_amount, created_at
        )
        VALUES ($1, $2, $3, $4, 10000, 1000, now())
      `,
      [voucherId, userId, orderId, voucherCode]
    );

    server = createApp(pool).listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const customerToken = createToken(userResult.rows[0]);
    const activationResponse = await fetch(
      `http://127.0.0.1:${server.address().port}/orders/${orderId}/bank-transfer/activate`,
      { method: 'PUT', headers: { Authorization: `Bearer ${customerToken}` } }
    );
    const activationPayload = await activationResponse.json();
    assert(activationResponse.ok, `QR activation failed: ${activationPayload.message || activationResponse.status}`);
    assert(Boolean(activationPayload.bankTransfer.activatedAt), 'QR activation timestamp was not stored.');
    const activatedDurationMs = new Date(activationPayload.bankTransfer.expiresAt).getTime()
      - new Date(activationPayload.bankTransfer.activatedAt).getTime();
    assert(activatedDurationMs >= 599000 && activatedDurationMs <= 601000, 'QR activation did not grant ten minutes.');

    await pool.query(
      "UPDATE orders SET payment_expires_at = now() - interval '1 minute' WHERE id = $1",
      [orderId]
    );

    // A running app worker may expire this fixture between insertion and this
    // explicit call. The persisted state below is the source of truth.
    await expirePendingBankTransfers(pool, { orderId, userId, limit: 1 });

    const readVerificationState = () => pool.query(
      `
        SELECT
          o.payment_status,
          o.order_status,
          o.cancelled_by,
          pi.reserved_quantity,
          v.used_count,
          EXISTS (SELECT 1 FROM voucher_redemptions vr WHERE vr.order_id = o.id) AS redemption_exists,
          EXISTS (
            SELECT 1 FROM order_status_history osh
            WHERE osh.order_id = o.id
              AND osh.new_status = 'cancelled'
              AND osh.changed_by_role = 'system'
          ) AS history_exists
        FROM orders o
        JOIN product_inventory pi ON pi.id = $2
        JOIN vouchers v ON v.id = $3
        WHERE o.id = $1
      `,
      [orderId, variant.id, voucherId]
    );
    const verificationDeadline = Date.now() + 5000;
    let verificationResult = await readVerificationState();
    while (
      verificationResult.rows[0]
      && verificationResult.rows[0].payment_status !== 'payment_expired'
      && Date.now() < verificationDeadline
    ) {
      await new Promise(resolve => setTimeout(resolve, 100));
      verificationResult = await readVerificationState();
    }
    const row = verificationResult.rows[0];

    assert(row.payment_status === 'payment_expired', 'Payment status did not become payment_expired.');
    assert(row.order_status === 'cancelled', 'Order status did not become cancelled.');
    assert(row.cancelled_by === 'system', 'Expired order was not marked as system-cancelled.');
    assert(Number(row.reserved_quantity) === initialReserved, 'Reserved inventory was not restored.');
    assert(Number(row.used_count) === 0, 'Voucher usage was not restored.');
    assert(row.redemption_exists === false, 'Voucher redemption was not removed.');
    assert(row.history_exists === true, 'System cancellation history was not recorded.');

    console.log('QR activation and expiry verified with inventory, voucher, and history consistency.');
  } finally {
    if (server) {
      const closed = new Promise(resolve => server.close(resolve));
      if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
      await closed;
    }
    if (orderId) {
      const reservedResult = await pool.query(
        'SELECT COALESCE(reserved_quantity, 0)::int AS quantity FROM order_items WHERE order_id = $1',
        [orderId]
      ).catch(() => ({ rows: [] }));
      const remainingReserved = Number(reservedResult.rows[0] && reservedResult.rows[0].quantity || 0);
      if (variantId && remainingReserved > 0) {
        await pool.query(
          'UPDATE product_inventory SET reserved_quantity = GREATEST(reserved_quantity - $2, 0), updated_at = now() WHERE id = $1',
          [variantId, remainingReserved]
        ).catch(() => null);
      }
      await pool.query('DELETE FROM orders WHERE id = $1', [orderId]).catch(() => null);
    }
    if (voucherId) {
      await pool.query('DELETE FROM vouchers WHERE id = $1', [voucherId]).catch(() => null);
    }
    await pool.end();
  }
};

run().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
