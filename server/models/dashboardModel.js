const {
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  REFUND_STATUS,
  USER_ROLE
} = require('../constants/domainConstants');

const TABLE = Object.freeze({
  categories: 'categories',
  departments: 'departments',
  inventory: 'product_inventory',
  orderItems: 'order_items',
  orders: 'orders',
  products: 'products',
  refunds: 'refunds',
  returnItems: 'return_items',
  users: 'users'
});

const revenuePaymentCondition = (alias = '') => {
  const prefix = alias ? `${alias}.` : '';
  return `(
    ${prefix}payment_method = '${PAYMENT_METHOD.COD}'
    OR ${prefix}payment_status IN (
      '${PAYMENT_STATUS.PAID}',
      '${PAYMENT_STATUS.REFUND_PENDING}',
      '${PAYMENT_STATUS.PARTIALLY_REFUNDED}',
      '${PAYMENT_STATUS.REFUNDED}'
    )
  )`;
};

const netOrderAmount = (alias = '') => {
  const prefix = alias ? `${alias}.` : '';
  return `GREATEST(
    COALESCE(${prefix}total_amount, 0) - COALESCE(${prefix}refund_amount, 0),
    0
  )`;
};

// Revenue is recognized only after an order is completed, net of completed refunds.
const revenueCondition = (alias = '') => {
  const prefix = alias ? `${alias}.` : '';
  return `(
    ${prefix}order_status = '${ORDER_STATUS.COMPLETED}'
    AND ${revenuePaymentCondition(alias)}
  )`;
};

const loadSummaryRows = async (db, lowStockThreshold) => {
  const [productResult, categoryResult, userResult, orderResult, refundResult] = await Promise.all([
    db.query(
      `
        SELECT
          COUNT(DISTINCT p.id)::int AS total_products,
          COUNT(DISTINCT pi.product_id) FILTER (
            WHERE GREATEST(pi.stock_quantity - COALESCE(pi.reserved_quantity, 0), 0) > 0
              AND LOWER(COALESCE(p.status, 'active')) = 'active'
              AND (to_jsonb(p)->>'deleted_at') IS NULL
          )::int AS stock_products,
          COUNT(DISTINCT pi.product_id) FILTER (
            WHERE GREATEST(pi.stock_quantity - COALESCE(pi.reserved_quantity, 0), 0) BETWEEN 1 AND $1
              AND LOWER(COALESCE(p.status, 'active')) = 'active'
              AND (to_jsonb(p)->>'deleted_at') IS NULL
          )::int AS low_stock_products,
          COUNT(DISTINCT pi.product_id) FILTER (
            WHERE LOWER(COALESCE(p.status, 'active')) = 'active'
              AND (to_jsonb(p)->>'deleted_at') IS NULL
              AND NOT EXISTS (
                SELECT 1
                FROM ${TABLE.inventory} available_inventory
                WHERE available_inventory.product_id = pi.product_id
                  AND GREATEST(
                    available_inventory.stock_quantity - COALESCE(available_inventory.reserved_quantity, 0),
                    0
                  ) > 0
              )
          )::int AS out_of_stock_products
        FROM ${TABLE.inventory} pi
        JOIN ${TABLE.products} p ON p.id = pi.product_id
      `,
      [lowStockThreshold]
    ),
    db.query(`SELECT COUNT(*)::int AS total_categories FROM ${TABLE.categories}`),
    db.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE LOWER(COALESCE(role, '')) = '${USER_ROLE.USER}')::int AS total_users,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(role, '${USER_ROLE.USER}')) = '${USER_ROLE.ADMIN}')::int AS total_admins
        FROM ${TABLE.users}
      `
    ),
    db.query(
      `
        SELECT
          COUNT(*)::int AS total_orders,
          COUNT(*) FILTER (
            WHERE order_status = '${ORDER_STATUS.COMPLETED}'
              AND ${revenuePaymentCondition()}
              AND ${netOrderAmount()} > 0
          )::int AS completed_orders,
          COALESCE(
            SUM(${netOrderAmount()}) FILTER (WHERE ${revenueCondition()}),
            0
          )::numeric AS total_revenue
        FROM ${TABLE.orders}
      `
    ),
    db.query(
      `SELECT COUNT(*)::int AS pending_refunds FROM ${TABLE.refunds} WHERE status = $1`,
      [REFUND_STATUS.PENDING]
    )
  ]);

  return {
    products: productResult.rows[0] || {},
    categories: categoryResult.rows[0] || {},
    users: userResult.rows[0] || {},
    orders: orderResult.rows[0] || {},
    refunds: refundResult.rows[0] || {}
  };
};

const loadDetailsRow = async (db, {
  year,
  limit,
  recentOrderOffset,
  topProductOffset,
  buyerOffset
}) => {
  const result = await db.query(
    `
      WITH completed_item_refunds AS (
        SELECT
          ri.order_item_id,
          COALESCE(SUM(ri.accepted_quantity), 0)::int AS refunded_quantity,
          COALESCE(SUM(ri.refund_amount), 0)::numeric AS refunded_amount
        FROM ${TABLE.returnItems} ri
        JOIN ${TABLE.refunds} r
          ON r.return_request_id = ri.return_request_id
         AND r.status = '${REFUND_STATUS.COMPLETED}'
        GROUP BY ri.order_item_id
      ),
      recent_orders_page AS (
        SELECT
          o.id,
          u.name AS customer_name,
          u.email AS customer_email,
          o.total_amount,
          o.payment_method,
          o.payment_status,
          o.order_status,
          o.created_at,
          COALESCE((
            SELECT SUM(oi.quantity)::int
            FROM ${TABLE.orderItems} oi
            WHERE oi.order_id = o.id
          ), 0) AS item_count
        FROM ${TABLE.orders} o
        JOIN ${TABLE.users} u ON u.id = o.user_id
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT $2 OFFSET $3
      ),
      order_trend_rows AS (
        WITH month_series AS (
          SELECT make_date($1::int, month_number, 1)::date AS month
          FROM generate_series(1, 12) AS month_number
        )
        SELECT
          ms.month,
          COALESCE(
            SUM(${netOrderAmount('o')}) FILTER (WHERE ${revenueCondition('o')}),
            0
          )::numeric AS revenue,
          COUNT(o.id)::int AS order_count
        FROM month_series ms
        LEFT JOIN ${TABLE.orders} o
          ON date_trunc('month', o.created_at)::date = ms.month
        GROUP BY ms.month
        ORDER BY ms.month ASC
      ),
      order_status_rows AS (
        SELECT order_status, COUNT(*)::int AS count
        FROM ${TABLE.orders}
        GROUP BY order_status
        ORDER BY CASE order_status
          WHEN '${ORDER_STATUS.PENDING}' THEN 1
          WHEN '${ORDER_STATUS.CONFIRMED}' THEN 2
          WHEN '${ORDER_STATUS.PROCESSING}' THEN 3
          WHEN '${ORDER_STATUS.SHIPPING}' THEN 4
          WHEN '${ORDER_STATUS.DELIVERY_FAILED}' THEN 5
          WHEN '${ORDER_STATUS.DELIVERED}' THEN 6
          WHEN '${ORDER_STATUS.COMPLETED}' THEN 7
          WHEN '${ORDER_STATUS.CANCELLED}' THEN 8
          ELSE 9
        END
      ),
      top_products_page AS (
        SELECT
          oi.product_id,
          oi.product_name,
          SUM(
            GREATEST(oi.quantity - COALESCE(cir.refunded_quantity, 0), 0)
          )::int AS quantity_sold,
          COALESCE(SUM(
            GREATEST(
              COALESCE(oi.net_line_total, oi.quantity * oi.product_price)
                - COALESCE(cir.refunded_amount, 0),
              0
            )
          ), 0)::numeric AS revenue
        FROM ${TABLE.orderItems} oi
        JOIN ${TABLE.orders} o ON o.id = oi.order_id
        LEFT JOIN completed_item_refunds cir ON cir.order_item_id = oi.id
        WHERE o.order_status = '${ORDER_STATUS.COMPLETED}'
          AND ${revenuePaymentCondition('o')}
          AND ${netOrderAmount('o')} > 0
          AND EXTRACT(YEAR FROM o.created_at)::int = $1
        GROUP BY oi.product_id, oi.product_name
        HAVING SUM(
          GREATEST(oi.quantity - COALESCE(cir.refunded_quantity, 0), 0)
        ) > 0
        ORDER BY quantity_sold DESC, revenue DESC
        LIMIT $2 OFFSET $4
      ),
      top_products_total AS (
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT oi.product_id
          FROM ${TABLE.orderItems} oi
          JOIN ${TABLE.orders} o ON o.id = oi.order_id
          LEFT JOIN completed_item_refunds cir ON cir.order_item_id = oi.id
          WHERE o.order_status = '${ORDER_STATUS.COMPLETED}'
            AND ${revenuePaymentCondition('o')}
            AND ${netOrderAmount('o')} > 0
            AND EXTRACT(YEAR FROM o.created_at)::int = $1
          GROUP BY oi.product_id, oi.product_name
          HAVING SUM(
            GREATEST(oi.quantity - COALESCE(cir.refunded_quantity, 0), 0)
          ) > 0
        ) ranked_products
      ),
      top_products_by_gender_rows AS (
        SELECT *
        FROM (
          SELECT
            LOWER(COALESCE(d.name, '')) AS gender,
            oi.product_id,
            oi.product_name,
            SUM(
              GREATEST(oi.quantity - COALESCE(cir.refunded_quantity, 0), 0)
            )::int AS quantity_sold,
            COALESCE(SUM(
              GREATEST(
                COALESCE(oi.net_line_total, oi.quantity * oi.product_price)
                  - COALESCE(cir.refunded_amount, 0),
                0
              )
            ), 0)::numeric AS revenue,
            ROW_NUMBER() OVER (
              PARTITION BY LOWER(COALESCE(d.name, ''))
              ORDER BY
                SUM(GREATEST(oi.quantity - COALESCE(cir.refunded_quantity, 0), 0)) DESC,
                COALESCE(SUM(
                  GREATEST(
                    COALESCE(oi.net_line_total, oi.quantity * oi.product_price)
                      - COALESCE(cir.refunded_amount, 0),
                    0
                  )
                ), 0) DESC
            ) AS rank
          FROM ${TABLE.orderItems} oi
          JOIN ${TABLE.orders} o ON o.id = oi.order_id
          JOIN ${TABLE.products} p ON p.id = oi.product_id
          LEFT JOIN ${TABLE.departments} d ON d.id = p.department_id
          LEFT JOIN completed_item_refunds cir ON cir.order_item_id = oi.id
          WHERE o.order_status = '${ORDER_STATUS.COMPLETED}'
            AND ${revenuePaymentCondition('o')}
            AND ${netOrderAmount('o')} > 0
            AND EXTRACT(YEAR FROM o.created_at)::int = $1
            AND LOWER(COALESCE(d.name, '')) IN ('women', 'men')
          GROUP BY LOWER(COALESCE(d.name, '')), oi.product_id, oi.product_name
          HAVING SUM(
            GREATEST(oi.quantity - COALESCE(cir.refunded_quantity, 0), 0)
          ) > 0
        ) ranked_gender_products
        WHERE rank <= $2
        ORDER BY gender ASC, rank ASC
      ),
      top_buyers_page AS (
        SELECT
          u.id,
          u.name,
          u.email,
          COUNT(o.id) FILTER (
            WHERE ${revenueCondition('o')}
              AND ${netOrderAmount('o')} > 0
          )::int AS order_count,
          COALESCE(
            SUM(${netOrderAmount('o')}) FILTER (WHERE ${revenueCondition('o')}),
            0
          )::numeric AS total_spent
        FROM ${TABLE.users} u
        JOIN ${TABLE.orders} o ON o.user_id = u.id
        WHERE LOWER(COALESCE(u.role, '')) = '${USER_ROLE.USER}'
        GROUP BY u.id
        HAVING COUNT(o.id) FILTER (
          WHERE ${revenueCondition('o')}
            AND ${netOrderAmount('o')} > 0
        ) > 0
        ORDER BY total_spent DESC, order_count DESC
        LIMIT $2 OFFSET $5
      ),
      top_buyers_total AS (
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT u.id
          FROM ${TABLE.users} u
          JOIN ${TABLE.orders} o ON o.user_id = u.id
          WHERE LOWER(COALESCE(u.role, '')) = '${USER_ROLE.USER}'
          GROUP BY u.id
          HAVING COUNT(o.id) FILTER (
            WHERE ${revenueCondition('o')}
              AND ${netOrderAmount('o')} > 0
          ) > 0
        ) buyers
      )
      SELECT
        COALESCE((SELECT jsonb_agg(to_jsonb(recent_orders_page)) FROM recent_orders_page), '[]'::jsonb) AS recent_orders,
        (SELECT COUNT(*)::int FROM ${TABLE.orders}) AS recent_orders_total,
        COALESCE((SELECT jsonb_agg(to_jsonb(order_trend_rows)) FROM order_trend_rows), '[]'::jsonb) AS order_trend,
        COALESCE((SELECT jsonb_agg(to_jsonb(order_status_rows)) FROM order_status_rows), '[]'::jsonb) AS order_status_summary,
        COALESCE((SELECT jsonb_agg(to_jsonb(top_products_page)) FROM top_products_page), '[]'::jsonb) AS top_products,
        COALESCE((SELECT total FROM top_products_total), 0)::int AS top_products_total,
        COALESCE((SELECT jsonb_agg(to_jsonb(top_products_by_gender_rows)) FROM top_products_by_gender_rows), '[]'::jsonb) AS top_products_by_gender,
        COALESCE((SELECT jsonb_agg(to_jsonb(top_buyers_page)) FROM top_buyers_page), '[]'::jsonb) AS top_buyers,
        COALESCE((SELECT total FROM top_buyers_total), 0)::int AS top_buyers_total
    `,
    [year, limit, recentOrderOffset, topProductOffset, buyerOffset]
  );

  return result.rows[0] || {};
};

module.exports = {
  loadDetailsRow,
  loadSummaryRows,
  revenueCondition
};
