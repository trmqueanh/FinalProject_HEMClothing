// Review data access shared by public product pages, member accounts, and admin Studio.
const CATEGORY_TABLE = 'categories';
const ORDER_ITEM_TABLE = 'order_items';
const ORDER_TABLE = 'orders';
const PRODUCT_GROUP_TABLE = 'product_groups';
const PRODUCT_IMAGE_TABLE = 'product_images';
const PRODUCT_INVENTORY_TABLE = 'product_inventory';
const PRODUCT_REVIEW_TABLE = 'product_reviews';
const PRODUCT_TABLE = 'products';
const USER_TABLE = 'users';

const findProductById = (db, productId) => db.query(
  `SELECT id FROM ${PRODUCT_TABLE} WHERE id = $1 LIMIT 1`,
  [productId]
);

const findCompletedOrderForProduct = (db, userId, productId) => db.query(
  `
    SELECT o.id
    FROM ${ORDER_TABLE} o
    JOIN ${ORDER_ITEM_TABLE} oi ON oi.order_id = o.id
    WHERE o.user_id = $1
      AND oi.product_id = $2
      AND o.order_status = 'completed'
    ORDER BY o.updated_at DESC, o.created_at DESC
    LIMIT 1
  `,
  [userId, productId]
);

const findCompletedOrderItem = (db, userId, productId, orderId) => db.query(
  `
    SELECT o.id
    FROM ${ORDER_TABLE} o
    JOIN ${ORDER_ITEM_TABLE} oi ON oi.order_id = o.id
    WHERE o.id = $1
      AND o.user_id = $2
      AND oi.product_id = $3
      AND o.order_status = 'completed'
    LIMIT 1
  `,
  [orderId, userId, productId]
);

const getSummary = (db, productId) => db.query(
  `
    SELECT
      COALESCE(AVG(rating), 0)::numeric(3,2) AS average_rating,
      COUNT(*)::integer AS review_count
    FROM ${PRODUCT_REVIEW_TABLE}
    WHERE product_id = $1
      AND is_approved = true
  `,
  [productId]
);

const updateProductStats = (db, productId, averageRating, reviewCount) => db.query(
  `
    UPDATE ${PRODUCT_TABLE}
    SET rating = $2,
        reviews = $3,
        updated_at = now()
    WHERE id = $1
  `,
  [productId, averageRating, reviewCount]
);

const listPublicByProduct = (db, productId) => db.query(
  `
    SELECT
      pr.id,
      pr.rating,
      pr.comment,
      to_jsonb(pr)->>'admin_reply' AS admin_reply,
      pr.created_at,
      pr.updated_at,
      u.name AS user_name,
      COALESCE(ordered_item.product_name, p.name) AS product_name,
      ordered_item.size_label,
      ordered_item.color_name
    FROM ${PRODUCT_REVIEW_TABLE} pr
    JOIN ${USER_TABLE} u ON u.id = pr.user_id
    LEFT JOIN ${PRODUCT_TABLE} p ON p.id = pr.product_id
    LEFT JOIN LATERAL (
      SELECT product_name, size_label, color_name
      FROM ${ORDER_ITEM_TABLE}
      WHERE order_id = pr.order_id
        AND product_id = pr.product_id
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    ) ordered_item ON true
    WHERE pr.product_id = $1
      AND pr.is_approved = true
    ORDER BY pr.created_at DESC, pr.id DESC
  `,
  [productId]
);

const findExisting = (db, userId, productId, orderId) => db.query(
  `
    SELECT id
    FROM ${PRODUCT_REVIEW_TABLE}
    WHERE user_id = $1
      AND product_id = $2
      AND order_id = $3
    LIMIT 1
  `,
  [userId, productId, orderId]
);

const create = (db, { productId, userId, orderId, rating, comment }) => db.query(
  `
    INSERT INTO ${PRODUCT_REVIEW_TABLE} (
      product_id,
      user_id,
      order_id,
      rating,
      comment,
      is_approved,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, true, now(), now())
    RETURNING id, product_id, rating, comment, NULL::text AS admin_reply, is_approved, order_id, created_at, updated_at
  `,
  [productId, userId, orderId, rating, comment]
);

const listByUser = (db, userId) => db.query(
  `
    SELECT
      pr.id,
      pr.product_id,
      pr.order_id,
      pr.rating,
      pr.comment,
      to_jsonb(pr)->>'admin_reply' AS admin_reply,
      pr.is_approved,
      pr.created_at,
      pr.updated_at,
      COALESCE(oi.product_name, p.name) AS product_name,
      COALESCE(
        NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid,
        review_variant.color_variant_id
      ) AS color_variant_id,
      oi.size_label,
      oi.color_name,
      COALESCE(product_image.image_url, oi.product_image) AS product_image
    FROM ${PRODUCT_REVIEW_TABLE} pr
    LEFT JOIN ${PRODUCT_TABLE} p ON p.id = pr.product_id
    LEFT JOIN LATERAL (
      SELECT
        ordered_item.product_name,
        ordered_item.size_label,
        ordered_item.color_name,
        ordered_item.product_image,
        to_jsonb(ordered_item)->>'variant_id' AS variant_id,
        to_jsonb(ordered_item)->>'color_variant_id' AS color_variant_id
      FROM ${ORDER_ITEM_TABLE} ordered_item
      WHERE ordered_item.product_id = pr.product_id
        AND (pr.order_id IS NULL OR ordered_item.order_id = pr.order_id)
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    ) oi ON true
    LEFT JOIN ${PRODUCT_INVENTORY_TABLE} review_variant
      ON review_variant.id = NULLIF(to_jsonb(oi)->>'variant_id', '')::uuid
    LEFT JOIN LATERAL (
      SELECT pi.image_url
      FROM ${PRODUCT_IMAGE_TABLE} pi
      WHERE pi.product_id = pr.product_id
        AND (
          (
            COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, review_variant.color_variant_id) IS NOT NULL
            AND pi.color_variant_id = COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, review_variant.color_variant_id)
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
          WHEN COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, review_variant.color_variant_id) IS NOT NULL
            AND pi.color_variant_id = COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, review_variant.color_variant_id) THEN 0
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
    WHERE pr.user_id = $1
    ORDER BY pr.created_at DESC, pr.id DESC
  `,
  [userId]
);

const updateOwned = (db, reviewId, userId, rating, comment) => db.query(
  `
    UPDATE ${PRODUCT_REVIEW_TABLE}
    SET rating = $3,
        comment = $4,
        updated_at = now()
    WHERE id = $1
      AND user_id = $2
    RETURNING id, product_id, order_id, rating, comment, NULL::text AS admin_reply, is_approved, created_at, updated_at
  `,
  [reviewId, userId, rating, comment]
);

const deleteOwned = (db, reviewId, userId) => db.query(
  `
    DELETE FROM ${PRODUCT_REVIEW_TABLE}
    WHERE id = $1
      AND user_id = $2
    RETURNING product_id
  `,
  [reviewId, userId]
);

const adminReviewSelect = `
  SELECT
    pr.id,
    pr.product_id,
    pr.user_id,
    pr.order_id,
    pr.rating,
    pr.comment,
    to_jsonb(pr)->>'admin_reply' AS admin_reply,
    to_jsonb(pr)->>'admin_reply_by' AS admin_reply_by,
    to_jsonb(pr)->>'admin_reply_at' AS admin_reply_at,
    to_jsonb(pr)->>'admin_reply_updated_at' AS admin_reply_updated_at,
    pr.is_approved,
    pr.created_at,
    pr.updated_at,
    p.name AS product_name,
    p.slug AS product_slug,
    pg.id AS product_group_id,
    pg.name AS product_group_name,
    pg.label AS product_group_label,
    pg.slug AS product_group_slug,
    u.name AS customer_name,
    u.email AS customer_email,
    COALESCE(
      NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid,
      review_variant.color_variant_id
    ) AS color_variant_id,
    oi.color_name,
    oi.size_label,
    product_image.image_url AS product_image
  FROM ${PRODUCT_REVIEW_TABLE} pr
  JOIN ${PRODUCT_TABLE} p ON p.id = pr.product_id
  LEFT JOIN ${CATEGORY_TABLE} c ON c.id = p.category_id
  LEFT JOIN departments d ON d.id = COALESCE(p.department_id, c.department_id)
  LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = COALESCE(p.product_group_id, c.product_group_id)
  JOIN ${USER_TABLE} u ON u.id = pr.user_id
  LEFT JOIN ${ORDER_ITEM_TABLE} oi
    ON oi.order_id = pr.order_id
   AND oi.product_id = pr.product_id
  LEFT JOIN ${PRODUCT_INVENTORY_TABLE} review_variant
    ON review_variant.id = NULLIF(to_jsonb(oi)->>'variant_id', '')::uuid
  LEFT JOIN LATERAL (
    SELECT pi.image_url
    FROM ${PRODUCT_IMAGE_TABLE} pi
    WHERE pi.product_id = p.id
      AND (
        (
          COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, review_variant.color_variant_id) IS NOT NULL
          AND pi.color_variant_id = COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, review_variant.color_variant_id)
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
        WHEN COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, review_variant.color_variant_id) IS NOT NULL
          AND pi.color_variant_id = COALESCE(NULLIF(to_jsonb(oi)->>'color_variant_id', '')::uuid, review_variant.color_variant_id) THEN 0
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
`;

const buildAdminFilters = (filters = {}) => {
  const clauses = [];
  const values = [];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    clauses.push(`(
      pr.id::text ILIKE $${values.length}
      OR p.name ILIKE $${values.length}
      OR COALESCE(pg.name, '') ILIKE $${values.length}
      OR COALESCE(pg.label, '') ILIKE $${values.length}
      OR u.name ILIKE $${values.length}
      OR u.email ILIKE $${values.length}
      OR COALESCE(pr.comment, '') ILIKE $${values.length}
      OR COALESCE(oi.color_name, '') ILIKE $${values.length}
      OR COALESCE(oi.size_label, '') ILIKE $${values.length}
    )`);
  }

  if (filters.reviewId) {
    values.push(filters.reviewId);
    clauses.push(`pr.id = $${values.length}::uuid`);
  }

  if (filters.status === 'approved') {
    clauses.push('COALESCE(pr.is_approved, true) = true');
  } else if (filters.status === 'hidden') {
    clauses.push('COALESCE(pr.is_approved, true) = false');
  }

  if (filters.gender) {
    values.push(filters.gender);
    clauses.push(`LOWER(COALESCE(d.name, '')) = $${values.length}`);
  }

  if (filters.category) {
    values.push(filters.category);
    clauses.push(`(
      LOWER(COALESCE(c.slug, '')) = LOWER($${values.length})
      OR LOWER(COALESCE(c.name, '')) = LOWER($${values.length})
      OR LOWER(COALESCE(c.label, '')) = LOWER($${values.length})
    )`);
  }

  if (filters.productGroup) {
    values.push(filters.productGroup);
    clauses.push(`(
      LOWER(COALESCE(pg.slug, '')) = LOWER($${values.length})
      OR LOWER(COALESCE(pg.name, '')) = LOWER($${values.length})
      OR LOWER(COALESCE(pg.label, '')) = LOWER($${values.length})
    )`);
  }

  if (Number.isFinite(filters.rating) && filters.rating >= 1 && filters.rating <= 5) {
    values.push(filters.rating);
    clauses.push(`pr.rating = $${values.length}`);
  }

  if (filters.dateRange === 'today') {
    clauses.push(`pr.created_at >= date_trunc('day', now())`);
  } else if (filters.dateRange === 'week') {
    clauses.push(`pr.created_at >= date_trunc('week', now())`);
  } else if (filters.dateRange === 'month') {
    clauses.push(`pr.created_at >= date_trunc('month', now())`);
  }

  return {
    values,
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  };
};

const listAdmin = async (db, filters = {}) => {
  const { values, whereSql } = buildAdminFilters(filters);
  const rowsPromise = db.query(
    `
      ${adminReviewSelect}
      ${whereSql}
      ORDER BY pr.created_at DESC, pr.id DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
    [...values, filters.limit, filters.offset]
  );
  const totalPromise = db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM ${PRODUCT_REVIEW_TABLE} pr
      JOIN ${PRODUCT_TABLE} p ON p.id = pr.product_id
      LEFT JOIN ${CATEGORY_TABLE} c ON c.id = p.category_id
      LEFT JOIN departments d ON d.id = COALESCE(p.department_id, c.department_id)
      LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = COALESCE(p.product_group_id, c.product_group_id)
      JOIN ${USER_TABLE} u ON u.id = pr.user_id
      LEFT JOIN ${ORDER_ITEM_TABLE} oi
        ON oi.order_id = pr.order_id
       AND oi.product_id = pr.product_id
      ${whereSql}
    `,
    values
  );
  const [rowsResult, totalResult] = await Promise.all([rowsPromise, totalPromise]);

  return {
    rows: rowsResult.rows,
    total: totalResult.rows[0].total
  };
};

const findAdminById = async (db, reviewId) => {
  const result = await db.query(
    `${adminReviewSelect} WHERE pr.id = $1 LIMIT 1`,
    [reviewId]
  );
  return result.rows[0] || null;
};

const updateAdminReply = (db, reviewId, adminReply, adminUserId) => db.query(
  `
    UPDATE ${PRODUCT_REVIEW_TABLE}
    SET admin_reply = $2,
        admin_reply_by = $3,
        admin_reply_at = COALESCE(admin_reply_at, now()),
        admin_reply_updated_at = now(),
        updated_at = now()
    WHERE id = $1
    RETURNING id
  `,
  [reviewId, adminReply, adminUserId]
);

const clearAdminReply = (db, reviewId) => db.query(
  `
    UPDATE ${PRODUCT_REVIEW_TABLE}
    SET admin_reply = NULL,
        admin_reply_by = NULL,
        admin_reply_at = NULL,
        admin_reply_updated_at = NULL,
        updated_at = now()
    WHERE id = $1
    RETURNING id
  `,
  [reviewId]
);

module.exports = {
  clearAdminReply,
  create,
  deleteOwned,
  findAdminById,
  findCompletedOrderForProduct,
  findCompletedOrderItem,
  findExisting,
  findProductById,
  getSummary,
  listAdmin,
  listByUser,
  listPublicByProduct,
  updateAdminReply,
  updateOwned,
  updateProductStats
};
