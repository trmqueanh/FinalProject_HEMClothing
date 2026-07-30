const { REFUND_STATUS, RETURN_STATUS } = require('../constants/domainConstants');

const fetchReturnPayloadRows = async (db, returnRequestId, userId = null) => {
  const values = [returnRequestId];
  const ownerSql = userId ? `AND rr.user_id = $${values.push(userId)}` : '';
  const [requestResult, itemsResult, refundsResult] = await Promise.all([
    db.query(
      `
        SELECT rr.*, u.name AS customer_name, u.email AS customer_email,
               o.order_status, o.payment_status, o.total_amount
        FROM return_requests rr
        JOIN users u ON u.id = rr.user_id
        JOIN orders o ON o.id = rr.order_id
        WHERE rr.id = $1 ${ownerSql}
        LIMIT 1
      `,
      values
    ),
    db.query(
      `
        SELECT ri.*, oi.product_id, oi.variant_id, oi.product_name, oi.product_image,
               to_jsonb(oi)->>'color_variant_id' AS color_variant_id,
               oi.color_name, oi.size_label, oi.product_price, oi.price_at_purchase,
               oi.net_line_total, oi.quantity AS purchased_quantity
        FROM return_items ri
        JOIN order_items oi ON oi.id = ri.order_item_id
        WHERE ri.return_request_id = $1
        ORDER BY ri.created_at, ri.id
      `,
      [returnRequestId]
    ),
    db.query(
      `SELECT * FROM refunds WHERE return_request_id = $1 ORDER BY created_at, id`,
      [returnRequestId]
    )
  ]);
  return {
    request: requestResult.rows[0] || null,
    items: itemsResult.rows,
    refunds: refundsResult.rows
  };
};

const listReturnIds = async (db, { userId, status, search, limit, offset }) => {
  const values = [];
  const clauses = [];
  if (userId) clauses.push(`rr.user_id = $${values.push(userId)}`);
  if (status) clauses.push(`rr.return_status = $${values.push(status)}`);
  if (search) {
    values.push(`%${search}%`);
    clauses.push(`(
      rr.id::text ILIKE $${values.length}
      OR rr.return_code ILIKE $${values.length}
      OR rr.order_id::text ILIKE $${values.length}
      OR u.name ILIKE $${values.length}
      OR u.email ILIKE $${values.length}
    )`);
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const listValues = [...values, limit, offset];
  const [countResult, listResult] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS total FROM return_requests rr JOIN users u ON u.id = rr.user_id ${whereSql}`, values),
    db.query(
      `
        SELECT rr.id
        FROM return_requests rr
        JOIN users u ON u.id = rr.user_id
        ${whereSql}
        ORDER BY rr.created_at DESC, rr.id DESC
        LIMIT $${listValues.length - 1} OFFSET $${listValues.length}
      `,
      listValues
    )
  ]);
  return { ids: listResult.rows.map(row => row.id), total: Number(countResult.rows[0]?.total || 0) };
};

const listReturnPayloadRows = async (db, { userId, orderId, status, search, limit, offset }) => {
  const values = [];
  const clauses = [];
  if (userId) clauses.push(`rr.user_id = $${values.push(userId)}`);
  if (orderId) clauses.push(`rr.order_id = $${values.push(orderId)}`);
  if (status) clauses.push(`rr.return_status = $${values.push(status)}`);
  if (search) {
    values.push(`%${search}%`);
    clauses.push(`(
      rr.id::text ILIKE $${values.length}
      OR rr.return_code ILIKE $${values.length}
      OR rr.order_id::text ILIKE $${values.length}
      OR u.name ILIKE $${values.length}
      OR u.email ILIKE $${values.length}
    )`);
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const listValues = [...values, limit, offset];
  const requestResult = await db.query(
    `
      WITH paged_requests AS (
        SELECT rr.*, u.name AS customer_name, u.email AS customer_email,
               o.order_status, o.payment_status, o.total_amount,
               COUNT(*) OVER()::int AS result_total
        FROM return_requests rr
        JOIN users u ON u.id = rr.user_id
        JOIN orders o ON o.id = rr.order_id
        ${whereSql}
        ORDER BY rr.created_at DESC, rr.id DESC
        LIMIT $${listValues.length - 1} OFFSET $${listValues.length}
      ),
      item_rows AS (
        SELECT ri.*, oi.product_id, oi.variant_id, oi.product_name, oi.product_image,
               to_jsonb(oi)->>'color_variant_id' AS color_variant_id,
               oi.color_name, oi.size_label, oi.product_price, oi.price_at_purchase,
               oi.net_line_total, oi.quantity AS purchased_quantity
        FROM return_items ri
        JOIN order_items oi ON oi.id = ri.order_item_id
        JOIN paged_requests request ON request.id = ri.return_request_id
      ),
      item_groups AS (
        SELECT return_request_id,
               jsonb_agg(to_jsonb(item_rows) ORDER BY created_at, id) AS return_items
        FROM item_rows
        GROUP BY return_request_id
      ),
      refund_groups AS (
        SELECT r.return_request_id,
               jsonb_agg(to_jsonb(r) ORDER BY r.created_at, r.id) AS return_refunds
        FROM refunds r
        JOIN paged_requests request ON request.id = r.return_request_id
        GROUP BY r.return_request_id
      )
      SELECT request.*,
             COALESCE(item_groups.return_items, '[]'::jsonb) AS return_items,
             COALESCE(refund_groups.return_refunds, '[]'::jsonb) AS return_refunds
      FROM paged_requests request
      LEFT JOIN item_groups ON item_groups.return_request_id = request.id
      LEFT JOIN refund_groups ON refund_groups.return_request_id = request.id
      ORDER BY request.created_at DESC, request.id DESC
    `,
    listValues
  );

  let total = Number(requestResult.rows[0]?.result_total || 0);
  if (!requestResult.rows.length && offset > 0) {
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM return_requests rr JOIN users u ON u.id = rr.user_id ${whereSql}`,
      values
    );
    total = Number(countResult.rows[0]?.total || 0);
  }

  return {
    requests: requestResult.rows,
    items: requestResult.rows.flatMap(row => Array.isArray(row.return_items) ? row.return_items : []),
    refunds: requestResult.rows.flatMap(row => Array.isArray(row.return_refunds) ? row.return_refunds : []),
    total
  };
};

const listLatestReturnRowsByOrderIds = async (db, orderIds) => {
  if (!Array.isArray(orderIds) || !orderIds.length) return [];
  const result = await db.query(
    `
      SELECT rr.*, u.name AS customer_name, u.email AS customer_email
      FROM return_requests rr
      LEFT JOIN users u ON u.id = rr.user_id
      WHERE rr.order_id = ANY($1::uuid[])
      ORDER BY rr.created_at DESC, rr.id DESC
    `,
    [orderIds]
  );
  return result.rows;
};

const listLatestRefundRowsByOrderIds = async (db, orderIds) => {
  if (!Array.isArray(orderIds) || !orderIds.length) return [];
  const result = await db.query(
    `
      SELECT
        r.*,
        u.name AS customer_name,
        u.email AS customer_email,
        o.order_status,
        o.payment_status,
        o.payment_method,
        o.total_amount
      FROM refunds r
      JOIN orders o ON o.id = r.order_id
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.order_id = ANY($1::uuid[])
      ORDER BY r.created_at DESC, r.id DESC
    `,
    [orderIds]
  );
  return result.rows;
};

const findReturnForUpdate = async (db, id, withOrder = false) => {
  const result = await db.query(
    withOrder
      ? `
          SELECT rr.*, o.order_status, o.payment_status, o.total_amount, o.payment_received_amount
          FROM return_requests rr
          JOIN orders o ON o.id = rr.order_id
          WHERE rr.id = $1
          LIMIT 1
          FOR UPDATE OF rr, o
        `
      : `SELECT * FROM return_requests WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [id]
  );
  return result.rows[0] || null;
};

const listReturnItemsForUpdate = async (db, returnRequestId, withOrderItems = false) => {
  const result = await db.query(
    withOrderItems
      ? `
          SELECT ri.*, oi.product_id, oi.variant_id, oi.quantity, oi.reserved_quantity,
                 oi.net_line_total, oi.refunded_quantity, oi.refunded_amount,
                 oi.price_at_purchase, oi.product_price
          FROM return_items ri
          JOIN order_items oi ON oi.id = ri.order_item_id
          WHERE ri.return_request_id = $1
          ORDER BY ri.id
          FOR UPDATE OF ri, oi
        `
      : `SELECT * FROM return_items WHERE return_request_id = $1 ORDER BY id FOR UPDATE`,
    [returnRequestId]
  );
  return result.rows;
};

const findReturnableOrderItems = async (db, orderId, itemIds, activeStatuses) => {
  const result = await db.query(
    `
      SELECT oi.*,
        COALESCE((
          SELECT SUM(
            CASE
              WHEN rr.return_status = '${RETURN_STATUS.REQUESTED}' THEN ri.requested_quantity
              WHEN rr.return_status IN (
                '${RETURN_STATUS.APPROVED}', '${RETURN_STATUS.AWAITING_RETURN}',
                '${RETURN_STATUS.RECEIVED}', '${RETURN_STATUS.INSPECTING}',
                '${RETURN_STATUS.INSPECTION_APPROVED}'
              ) THEN ri.approved_quantity
              ELSE ri.accepted_quantity
            END
          )
          FROM return_items ri
          JOIN return_requests rr ON rr.id = ri.return_request_id
          WHERE ri.order_item_id = oi.id
            AND rr.return_status = ANY($3::varchar[])
        ), 0)::int AS already_requested_quantity
      FROM order_items oi
      WHERE oi.order_id = $1
        AND oi.id = ANY($2::uuid[])
      FOR UPDATE
    `,
    [orderId, itemIds, activeStatuses]
  );
  return result.rows;
};

const createReturnRequest = async (db, { code, orderId, userId, reason, note }) => {
  const result = await db.query(
    `
      INSERT INTO return_requests (
        return_code, order_id, user_id, reason, note, return_status,
        requested_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, '${RETURN_STATUS.REQUESTED}', now(), now(), now())
      RETURNING *
    `,
    [code, orderId, userId, reason, note || null]
  );
  return result.rows[0] || null;
};

const createReturnItem = (db, returnRequestId, item) => db.query(
  `
    INSERT INTO return_items (
      return_request_id, order_item_id, requested_quantity, reason,
      customer_note, evidence_urls, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, now(), now())
  `,
  [returnRequestId, item.orderItemId, item.quantity, item.reason, item.note || null, JSON.stringify(item.evidenceUrls)]
);

const createReturnItems = (db, returnRequestId, items) => {
  if (!Array.isArray(items) || !items.length) return Promise.resolve({ rows: [] });
  const records = items.map(item => ({
    order_item_id: item.orderItemId,
    requested_quantity: item.quantity,
    reason: item.reason,
    customer_note: item.note || null,
    evidence_urls: Array.isArray(item.evidenceUrls) ? item.evidenceUrls : []
  }));
  return db.query(
    `
      INSERT INTO return_items (
        return_request_id, order_item_id, requested_quantity, reason,
        customer_note, evidence_urls, created_at, updated_at
      )
      SELECT $1, item.order_item_id, item.requested_quantity, item.reason,
             item.customer_note, item.evidence_urls, now(), now()
      FROM jsonb_to_recordset($2::jsonb) AS item(
        order_item_id uuid,
        requested_quantity integer,
        reason varchar,
        customer_note text,
        evidence_urls jsonb
      )
      RETURNING *
    `,
    [returnRequestId, JSON.stringify(records)]
  );
};

const updateReturnItemQuantity = (db, itemId, column, quantity) => {
  const allowedColumns = new Set(['approved_quantity', 'received_quantity']);
  if (!allowedColumns.has(column)) throw new Error('Unsupported return item quantity column.');
  return db.query(
    `UPDATE return_items SET ${column} = $2, updated_at = now() WHERE id = $1`,
    [itemId, quantity]
  );
};

const updateReturnStatus = (db, id, status, { actorId = null, adminNote = null, reason = null } = {}) => {
  if (status === RETURN_STATUS.AWAITING_RETURN) {
    return db.query(
      `UPDATE return_requests SET return_status = $2, approved_by = $3, approved_at = now(), admin_note = $4, updated_at = now() WHERE id = $1`,
      [id, status, actorId, adminNote]
    );
  }
  if (status === RETURN_STATUS.REJECTED) {
    return db.query(
      `UPDATE return_requests SET return_status = $2, rejection_reason = $3, admin_note = $4, rejected_at = now(), updated_at = now() WHERE id = $1`,
      [id, status, reason, adminNote]
    );
  }
  if (status === RETURN_STATUS.RECEIVED) {
    return db.query(
      `UPDATE return_requests SET return_status = $2, received_by = $3, received_at = now(), admin_note = COALESCE($4, admin_note), updated_at = now() WHERE id = $1`,
      [id, status, actorId, adminNote]
    );
  }
  if (status === RETURN_STATUS.INSPECTING) {
    return db.query(
      `UPDATE return_requests SET return_status = $2, inspected_by = $3, inspection_started_at = now(), updated_at = now() WHERE id = $1`,
      [id, status, actorId]
    );
  }
  if (status === RETURN_STATUS.INSPECTION_REJECTED) {
    return db.query(
      `UPDATE return_requests SET return_status = $2, rejection_reason = $3, inspected_by = $4, inspected_at = now(), updated_at = now() WHERE id = $1`,
      [id, status, reason, actorId]
    );
  }
  if (status === RETURN_STATUS.INSPECTION_APPROVED) {
    return db.query(
      `UPDATE return_requests SET return_status = $2, inspected_by = $3, inspected_at = now(), updated_at = now() WHERE id = $1`,
      [id, status, actorId]
    );
  }
  return db.query(
    `UPDATE return_requests SET return_status = $2::varchar, completed_at = CASE WHEN $2::varchar = '${RETURN_STATUS.COMPLETED}' THEN now() ELSE completed_at END, updated_at = now() WHERE id = $1`,
    [id, status]
  );
};

const updateCustomerRefundAccount = async (db, {
  returnRequestId,
  userId,
  bankCode,
  bankName,
  accountNumber,
  accountHolder
}) => {
  const result = await db.query(
    `
      UPDATE return_requests rr
      SET refund_bank_code = $3,
          refund_bank_name = $4,
          refund_account_number = $5,
          refund_account_holder = $6,
          refund_account_status = 'ready',
          refund_account_submitted_at = now(),
          updated_at = now()
      WHERE rr.id = $1
        AND rr.user_id = $2
        AND rr.return_status IN ('awaiting_return', 'received', 'inspecting', 'inspection_approved', 'refund_pending')
        AND NOT EXISTS (
          SELECT 1
          FROM refunds r
          WHERE r.return_request_id = rr.id
            AND r.status IN ('processing', 'completed')
        )
      RETURNING rr.*
    `,
    [returnRequestId, userId, bankCode || null, bankName, accountNumber, accountHolder]
  );
  return result.rows[0] || null;
};

const syncReturnRefundAccount = (db, { returnRequestId, bankCode, bankName, accountNumber, accountHolder }) => db.query(
  `UPDATE refunds
   SET refund_bank_code = $2, refund_bank_name = $3, refund_account_number = $4,
       refund_account_holder = $5, refund_account_status = 'ready',
       refund_account_submitted_at = now(), updated_at = now()
   WHERE return_request_id = $1 AND status IN ('pending', 'failed')`,
  [returnRequestId, bankCode || null, bankName, accountNumber, accountHolder]
);

const updateRefundAccount = async (db, {
  refundId, userId, bankCode, bankName, accountNumber, accountHolder
}) => {
  const result = await db.query(
    `UPDATE refunds
     SET refund_bank_code = $3, refund_bank_name = $4, refund_account_number = $5,
         refund_account_holder = $6, refund_account_status = 'ready',
         refund_account_submitted_at = now(), updated_at = now()
     WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'failed')
     RETURNING *`,
    [refundId, userId, bankCode || null, bankName, accountNumber, accountHolder]
  );
  return result.rows[0] || null;
};

const findCustomerRefund = async (db, id, userId) => {
  const result = await db.query(
    `SELECT r.*, o.order_status, o.payment_status, o.payment_method, o.total_amount,
            u.name AS customer_name, u.email AS customer_email
     FROM refunds r
     JOIN orders o ON o.id = r.order_id
     JOIN users u ON u.id = r.user_id
     WHERE r.id = $1 AND r.user_id = $2 LIMIT 1`,
    [id, userId]
  );
  return result.rows[0] || null;
};

const applyInspectionInventory = async (db, {
  order,
  item,
  acceptedQuantity,
  restockable,
  actorId,
  returnRequestId
}) => {
  if (!item.variant_id || acceptedQuantity <= 0) return 0;
  const completedOrder = String(order.order_status).toLowerCase() === 'completed';
  const heldQuantity = Math.min(acceptedQuantity, Number(item.reserved_quantity || 0));
  const stockIncrease = completedOrder && restockable ? acceptedQuantity : 0;
  const stockDecrease = !completedOrder && !restockable ? acceptedQuantity : 0;
  const soldDecrease = completedOrder ? acceptedQuantity : 0;
  await db.query(
    `
      UPDATE product_inventory
      SET stock_quantity = GREATEST(stock_quantity + $2 - $3, 0),
          reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - $4, 0),
          sold_quantity = GREATEST(COALESCE(sold_quantity, 0) - $5, 0),
          updated_at = now()
      WHERE id = $1
    `,
    [item.variant_id, stockIncrease, stockDecrease, heldQuantity, soldDecrease]
  );
  await db.query(
    `UPDATE order_items SET reserved_quantity = GREATEST(reserved_quantity - $2, 0), updated_at = now() WHERE id = $1`,
    [item.order_item_id, heldQuantity]
  );
  await db.query(
    `
      INSERT INTO inventory_logs (product_id, variant_id, type, quantity, note, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, now())
    `,
    [
      item.product_id,
      item.variant_id,
      restockable ? 'return_restock' : 'return_damaged',
      acceptedQuantity,
      restockable
        ? `Accepted return ${returnRequestId} restored after inspection`
        : `Accepted return ${returnRequestId} marked non-restockable after inspection`,
      actorId
    ]
  );
  return restockable ? acceptedQuantity : 0;
};

const updateInspectionItem = (db, itemId, decision) => db.query(
  `
    UPDATE return_items
    SET accepted_quantity = $2, rejected_quantity = $3, restockable = $4,
        condition_code = $5, inspection_note = $6, rejection_reason = $7,
        refund_amount = $8, inventory_restored_quantity = $9, updated_at = now()
    WHERE id = $1
  `,
  [
    itemId, decision.accepted, decision.rejected, decision.restockable,
    decision.conditionCode, decision.inspectionNote, decision.rejectionReason,
    decision.refundAmount, decision.inventoryRestoredQuantity
  ]
);

const updateOrderItemRefund = (db, orderItemId, quantity, amount) => db.query(
  `
    UPDATE order_items
    SET refunded_quantity = refunded_quantity + $2,
        refunded_amount = refunded_amount + $3,
        updated_at = now()
    WHERE id = $1
  `,
  [orderItemId, quantity, amount]
);

const listRefundRows = async (db, { status, type, search, limit, offset }) => {
  const values = [];
  const clauses = [];
  if (status) clauses.push(`r.status = $${values.push(status)}`);
  if (type) clauses.push(`r.refund_type = $${values.push(type)}`);
  if (search) {
    values.push(`%${search}%`);
    clauses.push(`(
      r.id::text ILIKE $${values.length}
      OR r.refund_code ILIKE $${values.length}
      OR r.order_id::text ILIKE $${values.length}
      OR u.name ILIKE $${values.length}
      OR u.email ILIKE $${values.length}
    )`);
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const listValues = [...values, limit, offset];
  const [countResult, listResult] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS total
       FROM refunds r
       JOIN users u ON u.id = r.user_id
       JOIN orders o ON o.id = r.order_id
       ${whereSql}`,
      values
    ),
    db.query(
      `
        SELECT r.*, u.name AS customer_name, u.email AS customer_email,
               o.order_status, o.payment_status, o.payment_method, o.total_amount
        FROM refunds r
        JOIN users u ON u.id = r.user_id
        JOIN orders o ON o.id = r.order_id
        ${whereSql}
        ORDER BY CASE r.status WHEN '${REFUND_STATUS.PENDING}' THEN 0 WHEN '${REFUND_STATUS.FAILED}' THEN 1 WHEN '${REFUND_STATUS.PROCESSING}' THEN 2 ELSE 3 END,
                 r.created_at ASC, r.id ASC
        LIMIT $${listValues.length - 1} OFFSET $${listValues.length}
      `,
      listValues
    )
  ]);
  return { rows: listResult.rows, total: Number(countResult.rows[0]?.total || 0) };
};

const findRefund = async (db, id, lock = false) => {
  const result = await db.query(
    lock
      ? `
          SELECT r.*
          FROM refunds r
          WHERE r.id = $1
          LIMIT 1
          FOR UPDATE OF r
        `
      : `
          SELECT r.*, u.name AS customer_name, u.email AS customer_email,
                 o.order_status, o.payment_status, o.payment_method, o.total_amount
          FROM refunds r
          JOIN users u ON u.id = r.user_id
          JOIN orders o ON o.id = r.order_id
          WHERE r.id = $1 LIMIT 1
        `,
    [id]
  );
  return result.rows[0] || null;
};

const findRefundBySourceKey = async (db, sourceKey) => {
  const result = await db.query(
    `SELECT * FROM refunds WHERE source_key = $1 LIMIT 1`,
    [sourceKey]
  );
  return result.rows[0] || null;
};

const sumReservedRefundAmount = async (db, orderId) => {
  const result = await db.query(
    `SELECT COALESCE(SUM(requested_amount) FILTER (WHERE status <> '${REFUND_STATUS.CANCELLED}'), 0)::numeric AS amount FROM refunds WHERE order_id = $1`,
    [orderId]
  );
  return Number(result.rows[0]?.amount || 0);
};

const updateRefundStatus = async (db, {
  id, status, transactionReference, failureReason, actorId, adminNote
}) => {
  const result = await db.query(
    `
      UPDATE refunds
      SET status = $2::varchar,
          approved_amount = CASE WHEN $2 = '${REFUND_STATUS.COMPLETED}' THEN requested_amount ELSE approved_amount END,
          transaction_reference = CASE WHEN $2 = '${REFUND_STATUS.COMPLETED}' THEN $3 ELSE transaction_reference END,
          failure_reason = CASE WHEN $2 = '${REFUND_STATUS.FAILED}' THEN $4 WHEN $2 = '${REFUND_STATUS.PROCESSING}' THEN NULL ELSE failure_reason END,
          processed_by = $5,
          processing_at = CASE WHEN $2 = '${REFUND_STATUS.PROCESSING}' THEN now() ELSE processing_at END,
          completed_at = CASE WHEN $2 = '${REFUND_STATUS.COMPLETED}' THEN now() ELSE completed_at END,
          failed_at = CASE WHEN $2 = '${REFUND_STATUS.FAILED}' THEN now() ELSE failed_at END,
          admin_note = COALESCE($6, admin_note),
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [id, status, transactionReference || null, failureReason || null, actorId, adminNote || null]
  );
  return result.rows[0] || null;
};

module.exports = {
  applyInspectionInventory,
  createReturnItem,
  createReturnItems,
  createReturnRequest,
  fetchReturnPayloadRows,
  findRefund,
  findCustomerRefund,
  findRefundBySourceKey,
  findReturnForUpdate,
  findReturnableOrderItems,
  listRefundRows,
  listLatestRefundRowsByOrderIds,
  listLatestReturnRowsByOrderIds,
  listReturnIds,
  listReturnPayloadRows,
  listReturnItemsForUpdate,
  sumReservedRefundAmount,
  updateInspectionItem,
  updateOrderItemRefund,
  updateRefundStatus,
  updateCustomerRefundAccount,
  updateRefundAccount,
  syncReturnRefundAccount,
  updateReturnItemQuantity,
  updateReturnStatus
};
