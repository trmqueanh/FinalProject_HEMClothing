const {
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  REFUND_STATUS,
  RETURN_STATUS
} = require('../constants/domainConstants');

const loadActionSummary = async (db, lowStockThreshold) => {
  const [orderResult, returnResult, refundResult, reviewResult, inventoryResult] = await Promise.all([
    db.query(
      `
        SELECT
          COUNT(*) FILTER (
            WHERE order_status = $1
              AND payment_method = $2
          )::int AS pending_orders,
          MAX(created_at) FILTER (
            WHERE order_status = $1
              AND payment_method = $2
          ) AS pending_orders_latest_at,
          COUNT(*) FILTER (
            WHERE payment_status = $3
          )::int AS payment_reviews,
          MAX(updated_at) FILTER (
            WHERE payment_status = $3
          ) AS payment_reviews_latest_at,
          COUNT(*) FILTER (
            WHERE order_status = $4
          )::int AS delivery_failed_orders,
          MAX(updated_at) FILTER (
            WHERE order_status = $4
          ) AS delivery_failed_latest_at
        FROM orders
      `,
      [
        ORDER_STATUS.PENDING,
        PAYMENT_METHOD.COD,
        PAYMENT_STATUS.UNDER_REVIEW,
        ORDER_STATUS.DELIVERY_FAILED
      ]
    ),
    db.query(
      `
        SELECT
          COUNT(*)::int AS return_requests,
          MAX(updated_at) AS latest_at
        FROM return_requests
        WHERE return_status IN ($1, $2, $3)
      `,
      [RETURN_STATUS.REQUESTED, RETURN_STATUS.RECEIVED, RETURN_STATUS.INSPECTING]
    ),
    db.query(
      `
        SELECT
          COUNT(*)::int AS refund_requests,
          MAX(updated_at) AS latest_at
        FROM refunds
        WHERE status IN ($1, $2, $3)
      `,
      [REFUND_STATUS.PENDING, REFUND_STATUS.PROCESSING, REFUND_STATUS.FAILED]
    ),
    db.query(
      `
        SELECT
          COUNT(*)::int AS unanswered_reviews,
          MAX(created_at) AS latest_at
        FROM product_reviews
        WHERE COALESCE(is_approved, true) = true
          AND NULLIF(TRIM(COALESCE(to_jsonb(product_reviews)->>'admin_reply', '')), '') IS NULL
      `
    ),
    db.query(
      `
        WITH product_stock AS (
          SELECT
            p.id,
            BOOL_OR(
              GREATEST(pi.stock_quantity - COALESCE(pi.reserved_quantity, 0), 0) BETWEEN 1 AND $1
            ) AS has_low_stock,
            BOOL_OR(
              GREATEST(pi.stock_quantity - COALESCE(pi.reserved_quantity, 0), 0) > 0
            ) AS has_available_stock,
            MAX(pi.updated_at) AS latest_at
          FROM products p
          JOIN product_inventory pi ON pi.product_id = p.id
          WHERE LOWER(COALESCE(p.status, 'active')) = 'active'
            AND (to_jsonb(p)->>'deleted_at') IS NULL
          GROUP BY p.id
        )
        SELECT
          COUNT(*) FILTER (WHERE has_low_stock)::int AS low_stock_products,
          MAX(latest_at) FILTER (WHERE has_low_stock) AS low_stock_latest_at,
          COUNT(*) FILTER (WHERE NOT has_available_stock)::int AS out_of_stock_products,
          MAX(latest_at) FILTER (WHERE NOT has_available_stock) AS out_of_stock_latest_at
        FROM product_stock
      `,
      [lowStockThreshold]
    )
  ]);

  return {
    orders: orderResult.rows[0] || {},
    returns: returnResult.rows[0] || {},
    refunds: refundResult.rows[0] || {},
    reviews: reviewResult.rows[0] || {},
    inventory: inventoryResult.rows[0] || {}
  };
};

const loadActionItems = async (db, lowStockThreshold) => {
  const [orderResult, returnResult, refundResult, reviewResult, inventoryResult] = await Promise.all([
    db.query(
      `
        SELECT
          o.id,
          o.total_amount,
          o.payment_method,
          o.payment_status,
          o.order_status,
          o.created_at,
          o.updated_at,
          u.name AS customer_name
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE (
          o.order_status = $1
          AND o.payment_method = $2
        )
          OR o.payment_status = $3
          OR o.order_status = $4
        ORDER BY GREATEST(o.updated_at, o.created_at) DESC, o.id DESC
      `,
      [
        ORDER_STATUS.PENDING,
        PAYMENT_METHOD.COD,
        PAYMENT_STATUS.UNDER_REVIEW,
        ORDER_STATUS.DELIVERY_FAILED
      ]
    ),
    db.query(
      `
        SELECT
          rr.id,
          rr.return_code,
          rr.order_id,
          rr.reason,
          rr.return_status,
          rr.created_at,
          rr.updated_at,
          u.name AS customer_name,
          COALESCE(return_products.product_names, '') AS product_names
        FROM return_requests rr
        JOIN users u ON u.id = rr.user_id
        LEFT JOIN LATERAL (
          SELECT STRING_AGG(DISTINCT oi.product_name, ', ' ORDER BY oi.product_name) AS product_names
          FROM return_items ri
          JOIN order_items oi ON oi.id = ri.order_item_id
          WHERE ri.return_request_id = rr.id
        ) return_products ON true
        WHERE rr.return_status IN ($1, $2, $3)
        ORDER BY GREATEST(rr.updated_at, rr.created_at) DESC, rr.id DESC
      `,
      [RETURN_STATUS.REQUESTED, RETURN_STATUS.RECEIVED, RETURN_STATUS.INSPECTING]
    ),
    db.query(
      `
        SELECT
          r.id,
          r.refund_code,
          r.order_id,
          r.requested_amount,
          r.approved_amount,
          r.status,
          r.reason,
          r.created_at,
          r.updated_at,
          u.name AS customer_name
        FROM refunds r
        JOIN users u ON u.id = r.user_id
        WHERE r.status IN ($1, $2, $3)
        ORDER BY GREATEST(r.updated_at, r.created_at) DESC, r.id DESC
      `,
      [REFUND_STATUS.PENDING, REFUND_STATUS.PROCESSING, REFUND_STATUS.FAILED]
    ),
    db.query(
      `
        SELECT
          pr.id,
          pr.order_id,
          pr.rating,
          pr.comment,
          pr.created_at,
          pr.updated_at,
          p.name AS product_name,
          u.name AS customer_name
        FROM product_reviews pr
        JOIN products p ON p.id = pr.product_id
        JOIN users u ON u.id = pr.user_id
        WHERE COALESCE(pr.is_approved, true) = true
          AND NULLIF(TRIM(COALESCE(to_jsonb(pr)->>'admin_reply', '')), '') IS NULL
        ORDER BY pr.created_at DESC, pr.id DESC
      `
    ),
    db.query(
      `
        SELECT
          pi.id,
          pi.product_id,
          pi.product_code,
          pi.article_number,
          pi.color_name,
          pi.size_label,
          pi.updated_at,
          p.name AS product_name,
          GREATEST(pi.stock_quantity - COALESCE(pi.reserved_quantity, 0), 0)::int AS available_quantity
        FROM product_inventory pi
        JOIN products p ON p.id = pi.product_id
        WHERE LOWER(COALESCE(p.status, 'active')) = 'active'
          AND (to_jsonb(p)->>'deleted_at') IS NULL
          AND GREATEST(pi.stock_quantity - COALESCE(pi.reserved_quantity, 0), 0) BETWEEN 0 AND $1
        ORDER BY pi.updated_at DESC, pi.id DESC
      `,
      [lowStockThreshold]
    )
  ]);

  return {
    orders: orderResult.rows,
    returns: returnResult.rows,
    refunds: refundResult.rows,
    reviews: reviewResult.rows,
    inventory: inventoryResult.rows
  };
};

module.exports = {
  loadActionItems,
  loadActionSummary
};
