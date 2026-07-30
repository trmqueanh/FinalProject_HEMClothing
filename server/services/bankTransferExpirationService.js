const { syncProductInventorySummary } = require('../utils/inventoryUtils');

const DEFAULT_BATCH_SIZE = 50;

const expirePendingBankTransfers = async (db, options = {}) => {
  if (!db || typeof db.connect !== 'function') {
    return [];
  }

  const orderId = options.orderId || null;
  const userId = options.userId || null;
  const limit = Math.min(200, Math.max(1, Number(options.limit || DEFAULT_BATCH_SIZE)));
  const client = await db.connect();
  const expiredOrders = [];

  try {
    await client.query('BEGIN');
    const dueResult = await client.query(
      `
        SELECT id, user_id
        FROM orders
        WHERE payment_method = 'bank_transfer'
          AND payment_status = 'pending_payment'
          AND order_status = 'pending'
          AND payment_expires_at IS NOT NULL
          AND payment_expires_at <= now()
          AND ($1::uuid IS NULL OR id = $1::uuid)
          AND ($2::uuid IS NULL OR user_id = $2::uuid)
        ORDER BY payment_expires_at ASC
        LIMIT $3
        FOR UPDATE SKIP LOCKED
      `,
      [orderId, userId, limit]
    );

    const inventoryLogsResult = await client.query(
      "SELECT to_regclass('public.inventory_logs') IS NOT NULL AS available"
    );
    const historyResult = await client.query(
      "SELECT to_regclass('public.order_status_history') IS NOT NULL AS available"
    );
    const voucherRedemptionsResult = await client.query(
      "SELECT to_regclass('public.voucher_redemptions') IS NOT NULL AS available"
    );
    const inventoryLogsAvailable = Boolean(inventoryLogsResult.rows[0] && inventoryLogsResult.rows[0].available);
    const historyAvailable = Boolean(historyResult.rows[0] && historyResult.rows[0].available);
    const voucherRedemptionsAvailable = Boolean(voucherRedemptionsResult.rows[0] && voucherRedemptionsResult.rows[0].available);

    for (const dueOrder of dueResult.rows) {
      const inventoryResult = await client.query(
        `
          WITH reserved_items AS (
            SELECT
              oi.id AS order_item_id,
              oi.product_id,
              oi.variant_id,
              LEAST(COALESCE(oi.reserved_quantity, 0), oi.quantity)::int AS quantity
            FROM order_items oi
            WHERE oi.order_id = $1
              AND oi.variant_id IS NOT NULL
              AND COALESCE(oi.reserved_quantity, 0) > 0
            FOR UPDATE OF oi
          ),
          released_inventory AS (
            UPDATE product_inventory pi
            SET reserved_quantity = GREATEST(COALESCE(pi.reserved_quantity, 0) - reserved_items.quantity, 0),
                updated_at = now()
            FROM reserved_items
            WHERE pi.id = reserved_items.variant_id
              AND COALESCE(pi.reserved_quantity, 0) >= reserved_items.quantity
            RETURNING pi.product_id, pi.id AS variant_id, reserved_items.quantity
          ),
          released_order_items AS (
            UPDATE order_items oi
            SET reserved_quantity = 0,
                updated_at = now()
            FROM reserved_items
            WHERE oi.id = reserved_items.order_item_id
            RETURNING oi.id
          )
          SELECT DISTINCT product_id, variant_id, quantity
          FROM released_inventory
        `,
        [dueOrder.id]
      );

      if (inventoryLogsAvailable && inventoryResult.rows.length) {
        await client.query(
          `
            INSERT INTO inventory_logs (
              product_id,
              variant_id,
              type,
              quantity,
              note,
              created_by,
              created_at
            )
            SELECT
              released.product_id,
              released.variant_id,
              'release_hold',
              released.quantity,
              $2,
              NULL,
              now()
            FROM jsonb_to_recordset($1::jsonb) AS released(
              product_id uuid,
              variant_id uuid,
              quantity int
            )
          `,
          [JSON.stringify(inventoryResult.rows), `Payment window expired for order ${dueOrder.id}`]
        );
      }

      if (voucherRedemptionsAvailable) {
        await client.query(
          `
            WITH removed_redemption AS (
              DELETE FROM voucher_redemptions
              WHERE order_id = $1
              RETURNING voucher_id
            )
            UPDATE vouchers v
            SET used_count = GREATEST(COALESCE(v.used_count, 0) - 1, 0),
                updated_at = now()
            FROM removed_redemption
            WHERE v.id = removed_redemption.voucher_id
          `,
          [dueOrder.id]
        );
      }

      const updateResult = await client.query(
        `
          UPDATE orders
          SET payment_status = 'payment_expired',
              order_status = 'cancelled',
              cancel_reason = 'Payment window expired',
              cancelled_by = 'system',
              cancelled_at = now(),
              updated_at = now()
          WHERE id = $1
            AND payment_status = 'pending_payment'
            AND order_status = 'pending'
          RETURNING *
        `,
        [dueOrder.id]
      );

      if (!updateResult.rowCount) {
        continue;
      }

      if (historyAvailable) {
        await client.query(
          `
            INSERT INTO order_status_history (
              order_id,
              old_status,
              new_status,
              changed_by,
              changed_by_role,
              note,
              created_at
            )
            VALUES ($1, 'pending', 'cancelled', NULL, 'system', $2, now())
          `,
          [dueOrder.id, 'Bank transfer payment window expired after 10 minutes.']
        );
      }


      const productIds = [...new Set(inventoryResult.rows.map(row => String(row.product_id || '')).filter(Boolean))];
      for (const productId of productIds) {
        await syncProductInventorySummary(client, productId);
      }

      expiredOrders.push(updateResult.rows[0]);
    }

    await client.query('COMMIT');
    return expiredOrders;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    client.release();
  }
};

const startBankTransferExpirationWorker = (db, options = {}) => {
  const intervalMs = Math.max(5000, Number(options.intervalMs || process.env.BANK_TRANSFER_EXPIRY_POLL_MS || 15000));
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      await expirePendingBankTransfers(db);
    } catch (error) {
      console.error('Bank transfer expiry worker failed:', error.message);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(run, intervalMs);
  timer.unref();
  run();

  return () => clearInterval(timer);
};

module.exports = {
  expirePendingBankTransfers,
  startBankTransferExpirationWorker
};
