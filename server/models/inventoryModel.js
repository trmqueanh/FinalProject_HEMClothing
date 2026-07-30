const { syncProductInventorySummary } = require('../utils/inventoryUtils');

const CATEGORY_TABLE = 'categories';
const INVENTORY_LOG_TABLE = 'inventory_logs';
const PRODUCT_IMAGE_TABLE = 'product_images';
const PRODUCT_INVENTORY_TABLE = 'product_inventory';
const PRODUCT_GROUP_TABLE = 'product_groups';
const PRODUCT_TABLE = 'products';
const USER_TABLE = 'users';

const importStock = async (db, {
  variantId,
  quantity,
  note,
  adminUserId
}) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const variantResult = await client.query(
      `
        SELECT id, product_id, stock_quantity
        FROM ${PRODUCT_INVENTORY_TABLE}
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [variantId]
    );

    if (!variantResult.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }

    const oldStock = Number(variantResult.rows[0].stock_quantity || 0);
    const newStock = oldStock + quantity;
    const updateResult = await client.query(
      `
        UPDATE ${PRODUCT_INVENTORY_TABLE}
        SET stock_quantity = stock_quantity + $2,
            updated_at = now()
        WHERE id = $1
        RETURNING id, product_id, stock_quantity, reserved_quantity, sold_quantity, updated_at
      `,
      [variantId, quantity]
    );

    if (!updateResult.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }

    const variant = updateResult.rows[0];
    await client.query(
      `
        INSERT INTO ${INVENTORY_LOG_TABLE} (
          product_id,
          variant_id,
          type,
          quantity,
          note,
          created_by,
          stock_before,
          stock_after,
          reserved_after,
          sold_after,
          created_by_role,
          created_at
        )
        VALUES ($1, $2, 'import', $3, $4, $5, $6, $7, $8, $9, 'admin', now())
      `,
      [
        variant.product_id,
        variantId,
        quantity,
        note || 'Admin stock import',
        adminUserId,
        oldStock,
        newStock,
        Number(variant.reserved_quantity || 0),
        Number(variant.sold_quantity || 0)
      ]
    );
    await syncProductInventorySummary(client, variant.product_id);
    await client.query('COMMIT');
    return variant;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const buildAdminFilters = (filters = {}, lowStockThreshold = 5) => {
  const clauses = ['p.deleted_at IS NULL'];
  const values = [];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    clauses.push(`(
      pi.id::text ILIKE $${values.length}
      OR p.name ILIKE $${values.length}
      OR COALESCE(pi.product_code, '') ILIKE $${values.length}
      OR COALESCE(pi.article_number, '') ILIKE $${values.length}
      OR COALESCE(pi.color_name, '') ILIKE $${values.length}
      OR COALESCE(pi.size_label, '') ILIKE $${values.length}
      OR COALESCE(pg.name, '') ILIKE $${values.length}
      OR COALESCE(pg.label, '') ILIKE $${values.length}
    )`);
  }

  if (filters.category) {
    values.push(filters.category);
    clauses.push(`(
      LOWER(COALESCE(c.slug, '')) = LOWER($${values.length})
      OR LOWER(COALESCE(c.name, '')) = LOWER($${values.length})
      OR LOWER(COALESCE(c.label, '')) = LOWER($${values.length})
    )`);
  }

  if (filters.gender) {
    values.push(filters.gender);
    clauses.push(`LOWER(COALESCE(d.name, '')) = $${values.length}`);
  }

  if (filters.productGroup) {
    values.push(filters.productGroup);
    clauses.push(`(
      LOWER(COALESCE(pg.slug, '')) = LOWER($${values.length})
      OR LOWER(COALESCE(pg.name, '')) = LOWER($${values.length})
      OR LOWER(COALESCE(pg.label, '')) = LOWER($${values.length})
    )`);
  }

  const availableSql = `GREATEST(
    pi.stock_quantity - COALESCE((to_jsonb(pi)->>'reserved_quantity')::int, 0),
    0
  )`;

  if (filters.stockRange === 'out') {
    clauses.push(`${availableSql} = 0`);
  } else if (filters.stockRange === 'low') {
    clauses.push(`${availableSql} BETWEEN 1 AND ${lowStockThreshold}`);
  } else if (filters.stockRange === 'available') {
    clauses.push(`${availableSql} > ${lowStockThreshold}`);
  }

  if (filters.dateRange === 'today') {
    clauses.push(`pi.updated_at >= date_trunc('day', now())`);
  } else if (filters.dateRange === 'week') {
    clauses.push(`pi.updated_at >= date_trunc('week', now())`);
  } else if (filters.dateRange === 'month') {
    clauses.push(`pi.updated_at >= date_trunc('month', now())`);
  }

  return {
    availableSql,
    values,
    whereSql: `WHERE ${clauses.join(' AND ')}`
  };
};

const listAdmin = async (db, filters = {}, lowStockThreshold = 5) => {
  const { availableSql, values, whereSql } = buildAdminFilters(filters, lowStockThreshold);
  const [variantsResult, totalResult, statsResult] = await Promise.all([
    db.query(
      `
        SELECT
          pi.id,
          pi.product_id,
          p.name AS product_name,
          pi.color_variant_id,
          pi.product_code,
          pi.article_number,
          p.price,
          d.name AS department_name,
          pg.id AS product_group_id,
          pg.name AS product_group_name,
          pg.label AS product_group_label,
          pg.slug AS product_group_slug,
          c.name AS category_name,
          c.label AS category_label,
          product_image.image_url,
          pi.color_name,
          pi.color_hex,
          pi.size_label,
          pi.stock_quantity,
          COALESCE((to_jsonb(pi)->>'reserved_quantity')::int, 0) AS reserved_quantity,
          COALESCE((to_jsonb(pi)->>'sold_quantity')::int, 0) AS sold_quantity,
          pi.updated_at
        FROM ${PRODUCT_INVENTORY_TABLE} pi
        JOIN ${PRODUCT_TABLE} p ON p.id = pi.product_id
        LEFT JOIN ${CATEGORY_TABLE} c ON c.id = p.category_id
        LEFT JOIN departments d ON d.id = COALESCE(p.department_id, c.department_id)
        LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = COALESCE(p.product_group_id, c.product_group_id)
        LEFT JOIN LATERAL (
          SELECT img.image_url
          FROM ${PRODUCT_IMAGE_TABLE} img
          WHERE img.product_id = p.id
            AND (
              (pi.color_variant_id IS NOT NULL AND img.color_variant_id = pi.color_variant_id)
              OR (
                NULLIF(TRIM(COALESCE(pi.color_name, '')), '') IS NOT NULL
                AND LOWER(TRIM(COALESCE(img.color_name, ''))) = LOWER(TRIM(COALESCE(pi.color_name, '')))
              )
              OR img.is_primary = true
              OR COALESCE(img.color_name, '') = ''
            )
          ORDER BY
            CASE
              WHEN pi.color_variant_id IS NOT NULL
                AND img.color_variant_id = pi.color_variant_id THEN 0
              WHEN NULLIF(TRIM(COALESCE(pi.color_name, '')), '') IS NOT NULL
                AND LOWER(TRIM(COALESCE(img.color_name, ''))) = LOWER(TRIM(COALESCE(pi.color_name, ''))) THEN 1
              WHEN img.is_primary = true THEN 2
              WHEN COALESCE(img.color_name, '') = '' THEN 3
              ELSE 4
            END,
            img.is_primary DESC,
            img.sort_order ASC,
            img.created_at ASC,
            img.id ASC
          LIMIT 1
        ) product_image ON true
        ${whereSql}
        ORDER BY p.name ASC, pi.color_name ASC, pi.size_label ASC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `,
      [...values, filters.limit, filters.offset]
    ),
    db.query(
      `
        SELECT COUNT(*)::int AS total
        FROM ${PRODUCT_INVENTORY_TABLE} pi
        JOIN ${PRODUCT_TABLE} p ON p.id = pi.product_id
        LEFT JOIN ${CATEGORY_TABLE} c ON c.id = p.category_id
        LEFT JOIN departments d ON d.id = COALESCE(p.department_id, c.department_id)
        LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = COALESCE(p.product_group_id, c.product_group_id)
        ${whereSql}
      `,
      values
    ),
    db.query(
      `
        SELECT
          COUNT(*)::int AS total_products,
          COUNT(*) FILTER (WHERE ${availableSql} > ${lowStockThreshold})::int AS in_stock_products,
          COUNT(*) FILTER (WHERE ${availableSql} BETWEEN 1 AND ${lowStockThreshold})::int AS low_stock_products,
          COUNT(*) FILTER (WHERE ${availableSql} = 0)::int AS out_of_stock_products
        FROM ${PRODUCT_INVENTORY_TABLE} pi
        JOIN ${PRODUCT_TABLE} p ON p.id = pi.product_id
        LEFT JOIN ${CATEGORY_TABLE} c ON c.id = p.category_id
        LEFT JOIN departments d ON d.id = COALESCE(p.department_id, c.department_id)
        LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = COALESCE(p.product_group_id, c.product_group_id)
        ${whereSql}
      `,
      values
    )
  ]);

  return {
    rows: variantsResult.rows,
    total: totalResult.rows[0].total,
    stats: statsResult.rows[0] || {
      total_products: 0,
      in_stock_products: 0,
      low_stock_products: 0,
      out_of_stock_products: 0
    }
  };
};

const findVariantById = async (db, variantId) => {
  const result = await db.query(
    `
      SELECT
        pi.id,
        pi.product_id,
        pi.color_variant_id,
        pi.product_code,
        pi.article_number,
        pi.color_name,
        pi.size_label,
        p.name AS product_name
      FROM ${PRODUCT_INVENTORY_TABLE} pi
      JOIN ${PRODUCT_TABLE} p ON p.id = pi.product_id
      WHERE pi.id = $1
      LIMIT 1
    `,
    [variantId]
  );

  return result.rows[0] || null;
};

const listHistoryByVariant = (db, variantId) => db.query(
  `
    SELECT
      il.id,
      il.type,
      il.quantity,
      il.note,
      COALESCE(to_jsonb(il)->>'stock_before', to_jsonb(il)->>'old_stock') AS old_stock,
      COALESCE(to_jsonb(il)->>'stock_after', to_jsonb(il)->>'new_stock') AS new_stock,
      to_jsonb(il)->>'reserved_after' AS reserved_after,
      to_jsonb(il)->>'sold_after' AS sold_after,
      to_jsonb(il)->>'created_by_role' AS created_by_role,
      il.created_at,
      u.name AS created_by_name
    FROM ${INVENTORY_LOG_TABLE} il
    LEFT JOIN ${USER_TABLE} u ON u.id = il.created_by
    WHERE il.variant_id = $1
      AND il.type <> 'reserve_hold'
    ORDER BY il.created_at DESC, il.id DESC
  `,
  [variantId]
);

module.exports = {
  findVariantById,
  importStock,
  listAdmin,
  listHistoryByVariant
};
