const {
  ACTIVE_RETURN_STATUSES,
  OPEN_RETURN_STATUSES,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  REFUND_STATUS,
  RETURN_STATUS
} = require('../constants/domainConstants');

const CATEGORY_TABLE = 'categories';
const DEPARTMENT_TABLE = 'departments';
const ORDER_ITEM_TABLE = 'order_items';
const ORDER_STATUS_HISTORY_TABLE = 'order_status_history';
const ORDER_TABLE = 'orders';
const PRODUCT_IMAGE_TABLE = 'product_images';
const PRODUCT_INVENTORY_TABLE = 'product_inventory';
const PRODUCT_TABLE = 'products';
const REFUND_REQUEST_TABLE = 'refunds';
const RETURN_ITEM_TABLE = 'return_items';
const RETURN_REQUEST_TABLE = 'return_requests';
const USERS_TABLE = 'users';

const PRODUCT_COMPARE_PRICE_SQL = `
  CASE
    WHEN COALESCE(NULLIF(p.pricing_mode, ''), 'regular') = 'sale'
      AND COALESCE(p.original_price, 0) > p.price
      THEN p.original_price
    ELSE p.price
  END
`;
const PRODUCT_PRICE_MODE_SQL = "COALESCE(NULLIF(p.pricing_mode, ''), 'regular')";

const ACTIVE_REFUND_STATUSES = [
  REFUND_STATUS.PENDING,
  REFUND_STATUS.PROCESSING,
  REFUND_STATUS.FAILED
];

const CUSTOMER_ORDER_SELECT = `
  SELECT
    o.id,
    o.user_id,
    o.subtotal,
    o.shipping_fee,
    o.discount_amount,
    o.voucher_code,
    o.total_amount,
    o.payment_method,
    o.payment_status,
    o.order_status,
    o.payment_activated_at,
    o.payment_expires_at,
    o.payment_reported_at,
    o.payment_reviewed_at,
    o.payment_reviewed_by,
    o.payment_review_reason,
    o.payment_received_amount,
    o.shipping_full_name,
    o.shipping_phone,
    o.shipping_city,
    o.shipping_district,
    o.shipping_ward,
    o.shipping_address_line,
    o.shipping_note,
    o.cancel_reason,
    o.cancelled_by,
    o.cancelled_at,
    o.delivered_at,
    o.completed_at,
    o.refunded_at,
    o.created_at,
    o.updated_at,
    COALESCE(SUM(oi.quantity), 0)::int AS item_count
  FROM ${ORDER_TABLE} o
  LEFT JOIN ${ORDER_ITEM_TABLE} oi ON oi.order_id = o.id
`;

const ADMIN_ORDER_SELECT = `
  SELECT
    o.id,
    o.user_id,
    u.name AS customer_name,
    u.email AS customer_email,
    o.subtotal,
    o.shipping_fee,
    o.discount_amount,
    o.voucher_code,
    o.total_amount,
    o.payment_method,
    o.payment_status,
    o.order_status,
    o.payment_activated_at,
    o.payment_expires_at,
    o.payment_reported_at,
    o.payment_reviewed_at,
    o.payment_reviewed_by,
    o.payment_review_reason,
    o.payment_received_amount,
    o.shipping_full_name,
    o.shipping_phone,
    o.shipping_city,
    o.shipping_district,
    o.shipping_ward,
    o.shipping_address_line,
    o.shipping_note,
    o.cancel_reason,
    o.cancelled_by,
    o.cancelled_at,
    o.delivered_at,
    o.completed_at,
    o.refunded_at,
    (to_jsonb(o)->>'refund_amount')::numeric AS refund_amount,
    to_jsonb(o)->>'refund_method' AS refund_method,
    to_jsonb(o)->>'returned_to_warehouse_at' AS returned_to_warehouse_at,
    o.created_at,
    o.updated_at,
    COALESCE((
      SELECT SUM(oi.quantity)::int
      FROM ${ORDER_ITEM_TABLE} oi
      WHERE oi.order_id = o.id
    ), 0) AS item_count,
    COALESCE((
      SELECT COUNT(*)::int
      FROM ${ORDER_STATUS_HISTORY_TABLE} retry_history
      WHERE retry_history.order_id = o.id
        AND retry_history.old_status = '${ORDER_STATUS.DELIVERY_FAILED}'
        AND retry_history.new_status = '${ORDER_STATUS.SHIPPING}'
    ), 0) AS delivery_retry_count
  FROM ${ORDER_TABLE} o
  JOIN ${USERS_TABLE} u ON u.id = o.user_id
`;

const createPaginationClause = (values, pagination) => {
  if (!pagination) return '';
  values.push(pagination.limit, pagination.offset);
  return `LIMIT $${values.length - 1} OFFSET $${values.length}`;
};

const buildCustomerFilters = ({ userId, searchTerm, orderStatuses, requestsFilter }) => {
  const clauses = ['o.user_id = $1'];
  const values = [userId];
  const activeRequestSql = `(
    EXISTS (
      SELECT 1
      FROM ${RETURN_REQUEST_TABLE} active_return
      WHERE active_return.order_id = o.id
        AND active_return.user_id = $1::uuid
        AND active_return.return_status = ANY($2::varchar[])
    )
    OR EXISTS (
      SELECT 1
      FROM ${REFUND_REQUEST_TABLE} active_refund
      WHERE active_refund.order_id = o.id
        AND active_refund.user_id = $1::uuid
        AND active_refund.status = ANY($3::varchar[])
    )
  )`;

  if (requestsFilter === 'active' || requestsFilter === 'exclude_active') {
    values.push(ACTIVE_RETURN_STATUSES, ACTIVE_REFUND_STATUSES);
    clauses.push(requestsFilter === 'active' ? activeRequestSql : `NOT ${activeRequestSql}`);
  }

  if (searchTerm) {
    values.push(`%${searchTerm}%`);
    const parameter = `$${values.length}`;
    clauses.push(`(
      o.id::text ILIKE ${parameter}
      OR COALESCE(o.payment_method, '') ILIKE ${parameter}
      OR COALESCE(o.payment_status, '') ILIKE ${parameter}
      OR COALESCE(o.order_status, '') ILIKE ${parameter}
      OR COALESCE(o.shipping_full_name, '') ILIKE ${parameter}
      OR COALESCE(o.shipping_city, '') ILIKE ${parameter}
      OR COALESCE(o.shipping_district, '') ILIKE ${parameter}
      OR COALESCE(o.shipping_ward, '') ILIKE ${parameter}
      OR COALESCE(o.shipping_address_line, '') ILIKE ${parameter}
      OR to_char(o.created_at, 'YYYY-MM-DD HH24:MI') ILIKE ${parameter}
      OR to_char(o.created_at, 'Mon DD YYYY') ILIKE ${parameter}
      OR EXISTS (
        SELECT 1
        FROM ${ORDER_ITEM_TABLE} search_items
        WHERE search_items.order_id = o.id
          AND (
            search_items.product_name ILIKE ${parameter}
            OR COALESCE(search_items.color_name, '') ILIKE ${parameter}
            OR COALESCE(search_items.size_label, '') ILIKE ${parameter}
          )
      )
    )`);
  }

  if (orderStatuses.length) {
    values.push(orderStatuses);
    clauses.push(`o.order_status = ANY($${values.length}::varchar[])`);
  }

  return {
    values,
    whereSql: `WHERE ${clauses.join(' AND ')}`
  };
};

const listCustomerOrders = async (db, options) => {
  const { values, whereSql } = buildCustomerFilters(options);
  const listValues = [...values];
  const paginationClause = createPaginationClause(listValues, options.pagination);
  const ordersPromise = db.query(
    `
      ${CUSTOMER_ORDER_SELECT}
      ${whereSql}
      GROUP BY o.id
      ORDER BY o.created_at DESC, o.id DESC
      ${paginationClause}
    `,
    listValues
  );

  if (!options.pagination) {
    const result = await ordersPromise;
    return { rows: result.rows, summary: null, total: null };
  }

  const summaryPromise = db.query(
    `
      SELECT
        COUNT(*)::int AS total_orders,
        COALESCE(
          SUM(GREATEST(o.total_amount - COALESCE(o.refund_amount, 0), 0)),
          0
        )::numeric AS total_spent
      FROM ${ORDER_TABLE} o
      WHERE o.user_id = $1
        AND o.order_status = $2
        AND (
          o.payment_method = $3
          OR o.payment_status IN ($4, $5, $6, $7)
        )
        AND GREATEST(o.total_amount - COALESCE(o.refund_amount, 0), 0) > 0
    `,
    [
      options.userId,
      ORDER_STATUS.COMPLETED,
      PAYMENT_METHOD.COD,
      PAYMENT_STATUS.PAID,
      PAYMENT_STATUS.REFUND_PENDING,
      PAYMENT_STATUS.PARTIALLY_REFUNDED,
      PAYMENT_STATUS.REFUNDED
    ]
  );
  const totalPromise = db.query(
    `SELECT COUNT(*)::int AS total FROM ${ORDER_TABLE} o ${whereSql}`,
    values
  );
  const [ordersResult, summaryResult, totalResult] = await Promise.all([
    ordersPromise,
    summaryPromise,
    totalPromise
  ]);

  return {
    rows: ordersResult.rows,
    summary: summaryResult.rows[0] || {},
    total: Number(totalResult.rows[0] && totalResult.rows[0].total || 0)
  };
};

const findCustomerOrder = async (db, { orderId, userId, customerName, customerEmail }) => {
  const result = await db.query(
    `
      SELECT
        detail.*,
        $3::text AS customer_name,
        $4::text AS customer_email
      FROM (
        ${CUSTOMER_ORDER_SELECT}
        WHERE o.id = $1
          AND o.user_id = $2
        GROUP BY o.id
        LIMIT 1
      ) detail
    `,
    [orderId, userId, customerName, customerEmail]
  );

  return result.rows[0] || null;
};

const buildAdminFilters = ({ searchTerm, orderStatus, paymentStatus, dateRange }) => {
  const clauses = [];
  const values = [];

  if (searchTerm) {
    values.push(`%${searchTerm}%`);
    const parameter = `$${values.length}`;
    clauses.push(`(
      o.id::text ILIKE ${parameter}
      OR u.name ILIKE ${parameter}
      OR u.email ILIKE ${parameter}
      OR COALESCE(o.shipping_full_name, '') ILIKE ${parameter}
      OR COALESCE(o.shipping_phone, '') ILIKE ${parameter}
      OR COALESCE(o.shipping_city, '') ILIKE ${parameter}
      OR COALESCE(o.shipping_district, '') ILIKE ${parameter}
      OR COALESCE(o.shipping_ward, '') ILIKE ${parameter}
      OR COALESCE(o.shipping_address_line, '') ILIKE ${parameter}
      OR EXISTS (
        SELECT 1
        FROM ${ORDER_ITEM_TABLE} search_items
        WHERE search_items.order_id = o.id
          AND (
            search_items.product_name ILIKE ${parameter}
            OR COALESCE(search_items.color_name, '') ILIKE ${parameter}
          )
      )
    )`);
  }

  if (orderStatus) {
    values.push(orderStatus);
    clauses.push(`o.order_status = $${values.length}`);
  }

  if (paymentStatus) {
    values.push(paymentStatus);
    clauses.push(`o.payment_status = $${values.length}`);
  }

  if (dateRange === 'today') {
    clauses.push("o.created_at >= date_trunc('day', now())");
  } else if (dateRange === 'week') {
    clauses.push("o.created_at >= date_trunc('week', now())");
  } else if (dateRange === 'month') {
    clauses.push("o.created_at >= date_trunc('month', now())");
  }

  return {
    values,
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  };
};

const adminOrderBy = sort => {
  if (sort === 'total_desc') return 'o.total_amount DESC, o.created_at DESC, o.id DESC';
  if (sort === 'total_asc') return 'o.total_amount ASC, o.created_at DESC, o.id DESC';
  return 'o.created_at DESC, o.id DESC';
};

const listAdminOrders = async (db, options) => {
  const { values, whereSql } = buildAdminFilters(options);
  const listValues = [...values];
  const paginationClause = createPaginationClause(listValues, options.pagination);
  const ordersPromise = db.query(
    `
      ${ADMIN_ORDER_SELECT}
      ${whereSql}
      ORDER BY ${adminOrderBy(options.sort)}
      ${paginationClause}
    `,
    listValues
  );

  if (!options.pagination) {
    const result = await ordersPromise;
    return { rows: result.rows, stats: null, total: null };
  }

  const totalPromise = db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM ${ORDER_TABLE} o
      JOIN ${USERS_TABLE} u ON u.id = o.user_id
      ${whereSql}
    `,
    values
  );
  const statsPromise = db.query(
    `
      SELECT
        COUNT(*)::int AS total_orders,
        COUNT(*) FILTER (WHERE o.order_status = '${ORDER_STATUS.PENDING}')::int AS pending,
        COUNT(*) FILTER (WHERE o.order_status = '${ORDER_STATUS.CONFIRMED}')::int AS confirmed,
        COUNT(*) FILTER (WHERE o.order_status = '${ORDER_STATUS.PROCESSING}')::int AS processing,
        COUNT(*) FILTER (WHERE o.order_status = '${ORDER_STATUS.SHIPPING}')::int AS shipping,
        COUNT(*) FILTER (WHERE o.order_status = '${ORDER_STATUS.DELIVERY_FAILED}')::int AS delivery_failed,
        COUNT(*) FILTER (WHERE o.order_status = '${ORDER_STATUS.DELIVERED}')::int AS delivered,
        COUNT(*) FILTER (WHERE o.order_status = '${ORDER_STATUS.COMPLETED}')::int AS completed,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM ${RETURN_REQUEST_TABLE} rr
            WHERE rr.order_id = o.id
              AND rr.return_status <> '${RETURN_STATUS.REJECTED}'
          )
        )::int AS return_orders,
        COUNT(*) FILTER (WHERE o.order_status = '${ORDER_STATUS.CANCELLED}')::int AS cancelled
      FROM ${ORDER_TABLE} o
      JOIN ${USERS_TABLE} u ON u.id = o.user_id
      ${whereSql}
    `,
    values
  );
  const [ordersResult, totalResult, statsResult] = await Promise.all([
    ordersPromise,
    totalPromise,
    statsPromise
  ]);

  return {
    rows: ordersResult.rows,
    stats: statsResult.rows[0] || {},
    total: Number(totalResult.rows[0] && totalResult.rows[0].total || 0)
  };
};

const findAdminOrder = async (db, orderId) => {
  const result = await db.query(
    `
      ${ADMIN_ORDER_SELECT}
      WHERE o.id = $1
      LIMIT 1
    `,
    [orderId]
  );

  return result.rows[0] || null;
};

const listTimelineRows = async (db, orderId) => {
  const result = await db.query(
    `
      SELECT
        osh.id,
        osh.order_id,
        osh.old_status,
        osh.new_status,
        osh.changed_by,
        to_jsonb(osh)->>'changed_by_role' AS changed_by_role,
        osh.note,
        osh.created_at
      FROM ${ORDER_STATUS_HISTORY_TABLE} osh
      WHERE osh.order_id = $1
      ORDER BY osh.created_at ASC, osh.id ASC
    `,
    [orderId]
  );

  return result.rows;
};

const countDeliveryRetries = async (db, orderId) => {
  const result = await db.query(
    `
      SELECT COUNT(*)::int AS retry_count
      FROM ${ORDER_STATUS_HISTORY_TABLE}
      WHERE order_id = $1
        AND old_status = $2
        AND new_status = $3
    `,
    [orderId, ORDER_STATUS.DELIVERY_FAILED, ORDER_STATUS.SHIPPING]
  );

  return Number(result.rows[0] && result.rows[0].retry_count || 0);
};

const listItemRows = async (db, orderIds) => {
  if (!Array.isArray(orderIds) || !orderIds.length) return [];

  const result = await db.query(
    `
      SELECT
        oi.id,
        oi.order_id,
        oi.product_id,
        to_jsonb(oi)->>'variant_id' AS variant_id,
        oi.product_name,
        oi.product_price,
        COALESCE(
          NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid,
          variant.color_variant_id
        ) AS color_variant_id,
        COALESCE(
          NULLIF(to_jsonb(oi)->>'product_code_at_purchase', ''),
          NULLIF(to_jsonb(oi)->>'article_number_at_purchase', ''),
          variant.product_code
        ) AS product_code,
        COALESCE(
          NULLIF(to_jsonb(oi)->>'article_number_at_purchase', ''),
          NULLIF(to_jsonb(oi)->>'product_code_at_purchase', ''),
          variant.article_number
        ) AS article_number,
        COALESCE((to_jsonb(oi)->>'price_at_purchase')::numeric, oi.product_price) AS price_at_purchase,
        COALESCE(
          NULLIF((to_jsonb(oi)->>'original_price_at_purchase')::numeric, 0),
          ${PRODUCT_COMPARE_PRICE_SQL},
          oi.product_price
        ) AS original_price,
        COALESCE(
          NULLIF(to_jsonb(oi)->>'pricing_mode_at_purchase', ''),
          ${PRODUCT_PRICE_MODE_SQL}
        ) AS pricing_mode,
        oi.quantity,
        COALESCE((to_jsonb(oi)->>'reserved_quantity')::int, 0) AS reserved_quantity,
        COALESCE((to_jsonb(oi)->>'gross_line_total')::numeric, oi.product_price * oi.quantity) AS gross_line_total,
        COALESCE((to_jsonb(oi)->>'item_discount_amount')::numeric, 0) AS item_discount_amount,
        COALESCE((to_jsonb(oi)->>'voucher_discount_allocated')::numeric, 0) AS voucher_discount_allocated,
        COALESCE((to_jsonb(oi)->>'net_line_total')::numeric, oi.product_price * oi.quantity) AS net_line_total,
        COALESCE((to_jsonb(oi)->>'refunded_quantity')::int, 0) AS refunded_quantity,
        COALESCE((to_jsonb(oi)->>'refunded_amount')::numeric, 0) AS refunded_amount,
        GREATEST(
          oi.quantity - COALESCE((
            SELECT SUM(return_item.requested_quantity)
            FROM ${RETURN_ITEM_TABLE} return_item
            WHERE return_item.order_item_id = oi.id
          ), 0),
          0
        )::int AS returnable_quantity,
        oi.size_label,
        oi.color_name,
        oi.product_image,
        COALESCE(product_image.image_url, oi.product_image) AS resolved_product_image,
        oi.created_at,
        oi.updated_at,
        p.slug AS product_slug,
        col.name AS collection_name,
        st.name AS style_name,
        c.name AS category_name,
        c.label AS category_label,
        d.name AS department_name,
        d.label AS department_label,
        (
          p.id IS NOT NULL
          AND COALESCE(p.status, 'active') = 'active'
          AND (to_jsonb(p)->>'deleted_at') IS NULL
        ) AS product_buy_again_available,
        (variant.id IS NOT NULL) AS variant_buy_again_available,
        GREATEST(
          COALESCE(variant.stock_quantity, 0) - COALESCE((to_jsonb(variant)->>'reserved_quantity')::int, 0),
          0
        ) AS available_quantity,
        review.id AS review_id
      FROM ${ORDER_ITEM_TABLE} oi
      LEFT JOIN ${PRODUCT_TABLE} p ON p.id = oi.product_id
      LEFT JOIN ${PRODUCT_INVENTORY_TABLE} variant
        ON variant.id = NULLIF(to_jsonb(oi)->>'variant_id', '')::uuid
      LEFT JOIN ${CATEGORY_TABLE} c ON c.id = p.category_id
      LEFT JOIN ${DEPARTMENT_TABLE} d ON d.id = p.department_id
      LEFT JOIN collections col ON col.id = p.collection_id
      LEFT JOIN styles st ON st.id = p.style_id
      LEFT JOIN product_reviews review
        ON review.order_id = oi.order_id
       AND review.product_id = oi.product_id
      LEFT JOIN LATERAL (
        SELECT pi.image_url
        FROM ${PRODUCT_IMAGE_TABLE} pi
        WHERE pi.product_id = p.id
          AND (
            (
              COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, variant.color_variant_id) IS NOT NULL
              AND pi.color_variant_id = COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, variant.color_variant_id)
            )
            OR (
              NULLIF(TRIM(COALESCE(oi.color_name, '')), '') IS NOT NULL
              AND LOWER(TRIM(COALESCE(pi.color_name, ''))) = LOWER(TRIM(COALESCE(oi.color_name, '')))
            )
            OR pi.is_primary = true
            OR COALESCE(pi.color_name, '') = ''
          )
        ORDER BY
          CASE
            WHEN COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, variant.color_variant_id) IS NOT NULL
              AND pi.color_variant_id = COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, variant.color_variant_id) THEN 0
            WHEN NULLIF(TRIM(COALESCE(oi.color_name, '')), '') IS NOT NULL
              AND LOWER(TRIM(COALESCE(pi.color_name, ''))) = LOWER(TRIM(COALESCE(oi.color_name, ''))) THEN 1
            WHEN pi.is_primary = true THEN 2
            WHEN COALESCE(pi.color_name, '') = '' THEN 3
            ELSE 4
          END,
          pi.is_primary DESC,
          pi.sort_order ASC,
          pi.created_at ASC,
          pi.id ASC
        LIMIT 1
      ) product_image ON true
      WHERE oi.order_id = ANY($1::uuid[])
      ORDER BY oi.created_at ASC, oi.id ASC
    `,
    [orderIds]
  );

  return result.rows;
};

const listItemSummaryRows = async (db, orderIds) => {
  if (!Array.isArray(orderIds) || !orderIds.length) return [];

  const result = await db.query(
    `
      SELECT
        oi.id,
        oi.order_id,
        oi.product_id,
        to_jsonb(oi)->>'variant_id' AS variant_id,
        oi.product_name,
        oi.product_price,
        COALESCE(
          NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid,
          variant.color_variant_id
        ) AS color_variant_id,
        COALESCE(
          NULLIF(to_jsonb(oi)->>'product_code_at_purchase', ''),
          NULLIF(to_jsonb(oi)->>'article_number_at_purchase', ''),
          variant.product_code
        ) AS product_code,
        COALESCE(
          NULLIF(to_jsonb(oi)->>'article_number_at_purchase', ''),
          NULLIF(to_jsonb(oi)->>'product_code_at_purchase', ''),
          variant.article_number
        ) AS article_number,
        COALESCE(oi.price_at_purchase, oi.product_price) AS price_at_purchase,
        COALESCE(NULLIF(oi.original_price_at_purchase, 0), oi.product_price) AS original_price,
        COALESCE(NULLIF(oi.pricing_mode_at_purchase, ''), 'regular') AS pricing_mode,
        oi.quantity,
        COALESCE(oi.reserved_quantity, 0) AS reserved_quantity,
        COALESCE(oi.gross_line_total, oi.product_price * oi.quantity) AS gross_line_total,
        COALESCE(oi.item_discount_amount, 0) AS item_discount_amount,
        COALESCE(oi.voucher_discount_allocated, 0) AS voucher_discount_allocated,
        COALESCE(oi.net_line_total, oi.product_price * oi.quantity) AS net_line_total,
        COALESCE(oi.refunded_quantity, 0) AS refunded_quantity,
        COALESCE(oi.refunded_amount, 0) AS refunded_amount,
        GREATEST(
          oi.quantity - COALESCE((
            SELECT SUM(return_item.requested_quantity)
            FROM ${RETURN_ITEM_TABLE} return_item
            WHERE return_item.order_item_id = oi.id
          ), 0),
          0
        )::int AS returnable_quantity,
        oi.size_label,
        oi.color_name,
        oi.product_image,
        COALESCE(product_image.image_url, oi.product_image) AS resolved_product_image,
        oi.created_at,
        oi.updated_at,
        COALESCE(p.slug, '') AS product_slug,
        '' AS collection_name,
        '' AS style_name,
        '' AS category_name,
        '' AS category_label,
        '' AS department_name,
        '' AS department_label,
        false AS product_buy_again_available,
        false AS variant_buy_again_available,
        0 AS available_quantity,
        NULL::uuid AS review_id
      FROM ${ORDER_ITEM_TABLE} oi
      LEFT JOIN ${PRODUCT_TABLE} p ON p.id = oi.product_id
      LEFT JOIN ${PRODUCT_INVENTORY_TABLE} variant
        ON variant.id = NULLIF(to_jsonb(oi)->>'variant_id', '')::uuid
      LEFT JOIN LATERAL (
        SELECT pi.image_url
        FROM ${PRODUCT_IMAGE_TABLE} pi
        WHERE pi.product_id = oi.product_id
          AND (
            (
              COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, variant.color_variant_id) IS NOT NULL
              AND pi.color_variant_id = COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, variant.color_variant_id)
            )
            OR (
              NULLIF(TRIM(COALESCE(oi.color_name, '')), '') IS NOT NULL
              AND LOWER(TRIM(COALESCE(pi.color_name, ''))) = LOWER(TRIM(COALESCE(oi.color_name, '')))
            )
            OR pi.is_primary = true
            OR COALESCE(pi.color_name, '') = ''
          )
        ORDER BY
          CASE
            WHEN COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, variant.color_variant_id) IS NOT NULL
              AND pi.color_variant_id = COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, variant.color_variant_id) THEN 0
            WHEN NULLIF(TRIM(COALESCE(oi.color_name, '')), '') IS NOT NULL
              AND LOWER(TRIM(COALESCE(pi.color_name, ''))) = LOWER(TRIM(COALESCE(oi.color_name, ''))) THEN 1
            WHEN pi.is_primary = true THEN 2
            WHEN COALESCE(pi.color_name, '') = '' THEN 3
            ELSE 4
          END,
          pi.is_primary DESC,
          pi.sort_order ASC,
          pi.created_at ASC,
          pi.id ASC
        LIMIT 1
      ) product_image ON true
      WHERE oi.order_id = ANY($1::uuid[])
      ORDER BY oi.order_id ASC, oi.created_at ASC, oi.id ASC
    `,
    [orderIds]
  );

  return result.rows;
};

const findLockedOrder = async (db, orderId, userId = null) => {
  const values = [orderId];
  const ownershipSql = userId ? 'AND o.user_id = $2' : '';
  if (userId) values.push(userId);
  const result = await db.query(
    `
      SELECT o.*, u.name AS customer_name, u.email AS customer_email
      FROM ${ORDER_TABLE} o
      JOIN ${USERS_TABLE} u ON u.id = o.user_id
      WHERE o.id = $1
        ${ownershipSql}
      LIMIT 1
      FOR UPDATE OF o
    `,
    values
  );
  return result.rows[0] || null;
};

const appendStatusHistory = (db, {
  orderId,
  oldStatus,
  newStatus,
  changedBy,
  changedByRole,
  note
}) => db.query(
  `
    INSERT INTO ${ORDER_STATUS_HISTORY_TABLE} (
      order_id, old_status, new_status, changed_by, changed_by_role, note, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, now())
  `,
  [orderId, oldStatus || null, newStatus, changedBy || null, changedByRole || null, note || null]
);

const updateStatus = async (db, orderId, nextStatus) => {
  const result = await db.query(
    `
      WITH updated_order AS (
        UPDATE ${ORDER_TABLE}
        SET order_status = $2::varchar,
            payment_status = CASE
              WHEN payment_method = '${PAYMENT_METHOD.COD}'
                AND $2::varchar = '${ORDER_STATUS.DELIVERED}'::varchar
                THEN '${PAYMENT_STATUS.PAID}'
              ELSE payment_status
            END,
            delivered_at = CASE
              WHEN $2::varchar = '${ORDER_STATUS.DELIVERED}'::varchar
                THEN COALESCE(delivered_at, now())
              ELSE delivered_at
            END,
            updated_at = now()
        WHERE id = $1::uuid
        RETURNING *
      )
      SELECT
        updated_order.*,
        u.name AS customer_name,
        u.email AS customer_email,
        COALESCE((
          SELECT SUM(oi.quantity)::int
          FROM ${ORDER_ITEM_TABLE} oi
          WHERE oi.order_id = updated_order.id
        ), 0) AS item_count
      FROM updated_order
      JOIN ${USERS_TABLE} u ON u.id = updated_order.user_id
    `,
    [orderId, nextStatus]
  );
  return result.rows[0] || null;
};

const completeOrder = async (db, orderId) => {
  const result = await db.query(
    `
      UPDATE ${ORDER_TABLE}
      SET order_status = '${ORDER_STATUS.COMPLETED}',
          payment_status = CASE
            WHEN payment_method = '${PAYMENT_METHOD.COD}' THEN '${PAYMENT_STATUS.PAID}'
            ELSE payment_status
          END,
          completed_at = now(),
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [orderId]
  );
  return result.rows[0] || null;
};

const cancelOrder = async (db, {
  orderId,
  reason,
  cancelledBy,
  reviewedBy = null,
  returnedToWarehouse = false
}) => {
  const result = await db.query(
    `
      UPDATE ${ORDER_TABLE}
      SET order_status = '${ORDER_STATUS.CANCELLED}',
          payment_status = CASE
            WHEN payment_status = '${PAYMENT_STATUS.PENDING_PAYMENT}'
              THEN '${PAYMENT_STATUS.CANCELLED}'
            WHEN payment_method = '${PAYMENT_METHOD.BANK_TRANSFER}'
              AND payment_status = '${PAYMENT_STATUS.PAID}'
              THEN '${PAYMENT_STATUS.REFUND_PENDING}'
            WHEN payment_method = '${PAYMENT_METHOD.BANK_TRANSFER}'
              AND payment_status = '${PAYMENT_STATUS.UNDER_REVIEW}'
              THEN '${PAYMENT_STATUS.REJECTED}'
            ELSE payment_status
          END,
          payment_reviewed_at = CASE
            WHEN payment_method = '${PAYMENT_METHOD.BANK_TRANSFER}'
              AND payment_status = '${PAYMENT_STATUS.UNDER_REVIEW}'
              THEN now()
            ELSE payment_reviewed_at
          END,
          payment_reviewed_by = CASE
            WHEN payment_method = '${PAYMENT_METHOD.BANK_TRANSFER}'
              AND payment_status = '${PAYMENT_STATUS.UNDER_REVIEW}'
              THEN $5::uuid
            ELSE payment_reviewed_by
          END,
          payment_review_reason = CASE
            WHEN payment_method = '${PAYMENT_METHOD.BANK_TRANSFER}'
              AND payment_status = '${PAYMENT_STATUS.UNDER_REVIEW}'
              THEN $2
            ELSE payment_review_reason
          END,
          cancel_reason = $2,
          cancelled_by = $3,
          cancelled_at = now(),
          returned_to_warehouse_at = CASE WHEN $4::boolean THEN now() ELSE returned_to_warehouse_at END,
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [
      orderId,
      reason || null,
      cancelledBy || null,
      Boolean(returnedToWarehouse),
      reviewedBy
    ]
  );
  return result.rows[0] || null;
};

const listInventoryRowsForUpdate = async (db, orderId) => {
  const result = await db.query(
    `
      SELECT
        oi.id,
        oi.product_id,
        oi.quantity,
        oi.size_label,
        oi.color_name,
        NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid AS order_color_variant_id,
        COALESCE((to_jsonb(oi)->>'reserved_quantity')::int, 0) AS reserved_quantity,
        oi.product_name,
        NULLIF(to_jsonb(oi)->>'variant_id', '')::uuid AS stored_variant_id,
        COALESCE(NULLIF(to_jsonb(oi)->>'variant_id', '')::uuid, matched_variant.id) AS variant_id,
        matched_variant.stock_quantity,
        matched_variant.reserved_quantity AS inventory_reserved_quantity
      FROM ${ORDER_ITEM_TABLE} oi
      LEFT JOIN LATERAL (
        SELECT id, stock_quantity, reserved_quantity
        FROM ${PRODUCT_INVENTORY_TABLE} pi
        WHERE pi.product_id = oi.product_id
          AND COALESCE(pi.size_label, '') = COALESCE(oi.size_label, '')
          AND (
            (
              NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid IS NOT NULL
              AND pi.color_variant_id = NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid
            )
            OR COALESCE(pi.color_name, '') = COALESCE(oi.color_name, '')
          )
        ORDER BY
          CASE
            WHEN NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid IS NOT NULL
              AND pi.color_variant_id = NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid THEN 0
            WHEN COALESCE(pi.color_name, '') = COALESCE(oi.color_name, '') THEN 1
            ELSE 2
          END,
          pi.created_at ASC,
          pi.id ASC
        LIMIT 1
      ) matched_variant ON true
      WHERE oi.order_id = $1
      FOR UPDATE OF oi
    `,
    [orderId]
  );
  return result.rows;
};

const storeOrderItemVariant = (db, orderItemId, variantId) => db.query(
  `UPDATE ${ORDER_ITEM_TABLE} SET variant_id = $2, updated_at = now() WHERE id = $1`,
  [orderItemId, variantId]
);

const finalizeInventoryItem = (db, variantId, quantity) => db.query(
  `
    UPDATE ${PRODUCT_INVENTORY_TABLE}
    SET reserved_quantity = GREATEST(reserved_quantity - $2, 0),
        stock_quantity = GREATEST(stock_quantity - $2, 0),
        sold_quantity = sold_quantity + $2,
        updated_at = now()
    WHERE id = $1
      AND reserved_quantity >= $2
      AND stock_quantity >= $2
    RETURNING product_id
  `,
  [variantId, quantity]
);

const reserveInventoryItem = (db, variantId, quantity) => db.query(
  `
    UPDATE ${PRODUCT_INVENTORY_TABLE}
    SET reserved_quantity = reserved_quantity + $2, updated_at = now()
    WHERE id = $1
      AND stock_quantity - reserved_quantity >= $2
    RETURNING product_id
  `,
  [variantId, quantity]
);

const releaseInventoryItem = (db, variantId, quantity) => db.query(
  `
    UPDATE ${PRODUCT_INVENTORY_TABLE}
    SET reserved_quantity = GREATEST(reserved_quantity - $2, 0), updated_at = now()
    WHERE id = $1
      AND reserved_quantity >= $2
    RETURNING product_id
  `,
  [variantId, quantity]
);

const updateOrderItemReservedQuantity = (db, orderItemId, quantityDelta) => db.query(
  `
    UPDATE ${ORDER_ITEM_TABLE}
    SET reserved_quantity = GREATEST(reserved_quantity + $2, 0), updated_at = now()
    WHERE id = $1
  `,
  [orderItemId, quantityDelta]
);

const insertInventoryLog = (db, { item, type, quantity, note, userId }) => db.query(
  `
    INSERT INTO inventory_logs (
      product_id, variant_id, type, quantity, note, created_by, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, now())
  `,
  [item.productId, item.variantId || null, type, quantity, note, userId || null]
);

const listAutoCompleteCandidates = async (db, limit) => {
  const result = await db.query(
    `
      SELECT o.id
      FROM ${ORDER_TABLE} o
      WHERE o.order_status = '${ORDER_STATUS.DELIVERED}'
        AND o.delivered_at IS NOT NULL
        AND o.delivered_at <= now() - interval '3 days'
        AND NOT EXISTS (
          SELECT 1
          FROM ${RETURN_REQUEST_TABLE} rr
          WHERE rr.order_id = o.id
            AND rr.return_status = ANY($2::varchar[])
        )
      ORDER BY o.delivered_at ASC
      LIMIT $1::int
    `,
    [limit, OPEN_RETURN_STATUSES]
  );
  return result.rows;
};

const findAutoCompleteCandidateForUpdate = async (db, orderId) => {
  const result = await db.query(
    `
      SELECT o.*, u.name AS customer_name, u.email AS customer_email
      FROM ${ORDER_TABLE} o
      JOIN ${USERS_TABLE} u ON u.id = o.user_id
      WHERE o.id = $1::uuid
        AND o.order_status = '${ORDER_STATUS.DELIVERED}'
        AND o.delivered_at IS NOT NULL
        AND o.delivered_at <= now() - interval '3 days'
        AND NOT EXISTS (
          SELECT 1
          FROM ${RETURN_REQUEST_TABLE} rr
          WHERE rr.order_id = o.id
            AND rr.return_status = ANY($2::varchar[])
        )
      FOR UPDATE OF o
    `,
    [orderId, OPEN_RETURN_STATUSES]
  );
  return result.rows[0] || null;
};

const listBankTransferPayments = async (db, paymentStatus = '', searchTerm = '') => {
  const result = await db.query(
    `
      SELECT
        o.*,
        u.name AS customer_name,
        u.email AS customer_email,
        (to_jsonb(o)->>'refund_amount')::numeric AS refund_amount,
        to_jsonb(o)->>'refund_method' AS refund_method,
        to_jsonb(o)->>'returned_to_warehouse_at' AS returned_to_warehouse_at,
        COALESCE(SUM(oi.quantity), 0)::int AS item_count
      FROM ${ORDER_TABLE} o
      JOIN ${USERS_TABLE} u ON u.id = o.user_id
      LEFT JOIN ${ORDER_ITEM_TABLE} oi ON oi.order_id = o.id
      WHERE o.payment_method = '${PAYMENT_METHOD.BANK_TRANSFER}'
        AND ($1::text = '' OR o.payment_status = $1)
        AND (
          $2::text = ''
          OR o.id::text ILIKE '%' || $2 || '%'
          OR u.name ILIKE '%' || $2 || '%'
          OR u.email ILIKE '%' || $2 || '%'
        )
      GROUP BY o.id, u.id
      ORDER BY
        CASE o.payment_status
          WHEN '${PAYMENT_STATUS.UNDER_REVIEW}' THEN 0
          WHEN '${PAYMENT_STATUS.PENDING_PAYMENT}' THEN 1
          WHEN '${PAYMENT_STATUS.EXPIRED}' THEN 2
          WHEN '${PAYMENT_STATUS.REJECTED}' THEN 3
          ELSE 4
        END,
        o.updated_at DESC,
        o.created_at DESC
    `,
    [paymentStatus, searchTerm]
  );
  return result.rows;
};

const confirmBankTransferPayment = (db, { orderId, reviewedBy }) => db.query(
  `
    UPDATE ${ORDER_TABLE}
    SET payment_status = '${PAYMENT_STATUS.PAID}',
        order_status = '${ORDER_STATUS.PROCESSING}',
        payment_reviewed_at = now(),
        payment_reviewed_by = $2::uuid,
        payment_review_reason = NULL,
        payment_received_amount = total_amount,
        updated_at = now()
    WHERE id = $1::uuid
      AND payment_method = '${PAYMENT_METHOD.BANK_TRANSFER}'
      AND payment_status = '${PAYMENT_STATUS.UNDER_REVIEW}'
      AND order_status = '${ORDER_STATUS.PENDING}'
    RETURNING *
  `,
  [orderId, reviewedBy]
);

const findBuyAgainItem = async (db, { orderId, userId, orderItemId }) => {
  const result = await db.query(
    `
      SELECT
        o.id AS order_id,
        o.order_status,
        oi.id AS order_item_id,
        oi.product_id,
        oi.product_name,
        oi.quantity AS order_quantity,
        oi.variant_id,
        NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid AS order_color_variant_id,
        p.id AS active_product_id
      FROM ${ORDER_TABLE} o
      JOIN ${ORDER_ITEM_TABLE} oi ON oi.order_id = o.id
      LEFT JOIN ${PRODUCT_TABLE} p
        ON p.id = oi.product_id
       AND COALESCE(p.status, 'active') = 'active'
       AND (to_jsonb(p)->>'deleted_at') IS NULL
      WHERE o.id = $1
        AND o.user_id = $2
        AND oi.id = $3
      LIMIT 1
      FOR UPDATE OF o, oi
    `,
    [orderId, userId, orderItemId]
  );
  return result.rows[0] || null;
};

const findInventoryVariantForUpdate = async (db, variantId) => {
  const result = await db.query(
    `
      SELECT
        id, color_variant_id, color_name, size_label, stock_quantity,
        COALESCE((to_jsonb(${PRODUCT_INVENTORY_TABLE})->>'reserved_quantity')::int, 0) AS reserved_quantity
      FROM ${PRODUCT_INVENTORY_TABLE}
      WHERE id = $1
      LIMIT 1
      FOR UPDATE
    `,
    [variantId]
  );
  return result.rows[0] || null;
};

module.exports = {
  countDeliveryRetries,
  appendStatusHistory,
  cancelOrder,
  confirmBankTransferPayment,
  completeOrder,
  findAdminOrder,
  findBuyAgainItem,
  findCustomerOrder,
  findInventoryVariantForUpdate,
  findAutoCompleteCandidateForUpdate,
  findLockedOrder,
  finalizeInventoryItem,
  insertInventoryLog,
  listAdminOrders,
  listBankTransferPayments,
  listCustomerOrders,
  listItemRows,
  listItemSummaryRows,
  listTimelineRows,
  listAutoCompleteCandidates,
  listInventoryRowsForUpdate,
  releaseInventoryItem,
  reserveInventoryItem,
  storeOrderItemVariant,
  updateOrderItemReservedQuantity,
  updateStatus
};
