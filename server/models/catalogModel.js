const CATEGORY_TABLE = 'categories';
const DEPARTMENT_TABLE = 'departments';
const FIT_TABLE = 'fits';
const MATERIAL_TABLE = 'materials';
const PRODUCT_GROUP_TABLE = 'product_groups';
const PRODUCT_TABLE = 'products';
const SIZE_GUIDE_TABLE = 'size_guides';
const STYLE_TABLE = 'styles';

const listAdminProductGroups = db => db.query(
  `
    SELECT
      pg.id,
      pg.name,
      pg.label,
      pg.slug,
      COALESCE(to_jsonb(pg)->>'status', 'active') AS status,
      pg.sort_order,
      pg.created_at,
      to_jsonb(pg)->>'updated_at' AS updated_at,
      COUNT(DISTINCT c.id)::int AS category_count,
      COUNT(DISTINCT p.id)::int AS product_count
    FROM ${PRODUCT_GROUP_TABLE} pg
    LEFT JOIN ${CATEGORY_TABLE} c
      ON c.product_group_id = pg.id
     AND (to_jsonb(c)->>'deleted_at') IS NULL
    LEFT JOIN ${PRODUCT_TABLE} p
      ON COALESCE(p.product_group_id, c.product_group_id) = pg.id
     AND (to_jsonb(p)->>'deleted_at') IS NULL
    WHERE (to_jsonb(pg)->>'deleted_at') IS NULL
      AND COALESCE(to_jsonb(pg)->>'status', 'active') = 'active'
    GROUP BY pg.id
    ORDER BY COALESCE(pg.sort_order, 999), pg.name ASC
  `
);

const listAdminStyles = db => db.query(
  `
    SELECT
      st.id,
      st.name,
      st.slug,
      st.product_group_id,
      st.department_id,
      st.category_id,
      COALESCE(to_jsonb(st)->>'status', 'active') AS status,
      st.created_at,
      pg.slug AS product_group_slug,
      pg.label AS product_group_label,
      d.name AS department_name,
      c.slug AS category_slug,
      c.label AS category_label,
      COUNT(p.id)::int AS product_count
    FROM ${STYLE_TABLE} st
    LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = st.product_group_id
    LEFT JOIN ${DEPARTMENT_TABLE} d ON d.id = st.department_id
    LEFT JOIN ${CATEGORY_TABLE} c ON c.id = st.category_id
    LEFT JOIN ${PRODUCT_TABLE} p
      ON p.style_id = st.id
     AND (to_jsonb(p)->>'deleted_at') IS NULL
    WHERE (to_jsonb(st)->>'deleted_at') IS NULL
      AND COALESCE(to_jsonb(st)->>'status', 'active') = 'active'
    GROUP BY st.id, pg.id, d.id, c.id
    ORDER BY COALESCE(st.sort_order, 999), st.name ASC
  `
);

const listAdminFits = db => db.query(
  `
    SELECT
      f.id,
      f.name,
      f.slug,
      f.product_group_id,
      f.department_id,
      COALESCE(to_jsonb(f)->>'status', 'active') AS status,
      f.created_at,
      pg.slug AS product_group_slug,
      pg.label AS product_group_label,
      d.name AS department_name,
      COUNT(p.id)::int AS product_count
    FROM ${FIT_TABLE} f
    LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = f.product_group_id
    LEFT JOIN ${DEPARTMENT_TABLE} d ON d.id = f.department_id
    LEFT JOIN ${PRODUCT_TABLE} p
      ON p.fit_id = f.id
     AND (to_jsonb(p)->>'deleted_at') IS NULL
    WHERE (to_jsonb(f)->>'deleted_at') IS NULL
      AND COALESCE(to_jsonb(f)->>'status', 'active') = 'active'
      AND LOWER(COALESCE(pg.slug, pg.name, '')) = 'clothing'
    GROUP BY f.id, pg.id, d.id
    ORDER BY COALESCE(f.sort_order, 999), f.name ASC
  `
);

const listAdminMaterials = db => db.query(
  `
    SELECT
      m.id,
      m.name,
      m.slug,
      m.product_group_id,
      m.department_id,
      COALESCE(to_jsonb(m)->>'status', 'active') AS status,
      m.sort_order,
      m.created_at,
      pg.slug AS product_group_slug,
      pg.label AS product_group_label,
      d.name AS department_name,
      d.label AS department_label,
      COUNT(pm.id)::int AS product_count
    FROM ${MATERIAL_TABLE} m
    LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = m.product_group_id
    LEFT JOIN ${DEPARTMENT_TABLE} d ON d.id = m.department_id
    LEFT JOIN product_materials pm ON pm.material_id = m.id
    WHERE (to_jsonb(m)->>'deleted_at') IS NULL
      AND COALESCE(to_jsonb(m)->>'status', 'active') = 'active'
    GROUP BY m.id, pg.id, d.id
    ORDER BY COALESCE(m.sort_order, 999), m.name ASC
  `
);

const listDepartmentTreeRows = db => db.query(
  `
    SELECT
      d.id AS department_id,
      d.name AS department_name,
      d.label AS department_label,
      pg.id AS product_group_id,
      pg.name AS product_group_name,
      pg.label AS product_group_label,
      pg.slug AS product_group_slug,
      pg.sort_order AS product_group_sort_order,
      c.id AS category_id,
      c.name AS category_name,
      c.label AS category_label,
      c.slug AS category_slug,
      NULLIF(to_jsonb(c)->>'sort_order', '')::int AS category_sort_order,
      COUNT(DISTINCT p.id)::int AS product_count
    FROM ${DEPARTMENT_TABLE} d
    JOIN ${CATEGORY_TABLE} c ON c.department_id = d.id
    JOIN ${PRODUCT_TABLE} p
      ON p.category_id = c.id
     AND COALESCE(p.department_id, c.department_id) = d.id
    JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = COALESCE(p.product_group_id, c.product_group_id)
    WHERE LOWER(d.name) IN ('women', 'men')
      AND (to_jsonb(d)->>'deleted_at') IS NULL
      AND COALESCE(to_jsonb(d)->>'status', 'active') = 'active'
      AND (to_jsonb(p)->>'deleted_at') IS NULL
      AND LOWER(COALESCE(p.status, 'active')) = 'active'
      AND (to_jsonb(c)->>'deleted_at') IS NULL
      AND COALESCE(to_jsonb(c)->>'status', 'active') = 'active'
      AND (to_jsonb(pg)->>'deleted_at') IS NULL
      AND COALESCE(to_jsonb(pg)->>'status', 'active') = 'active'
    GROUP BY
      d.id,
      d.name,
      d.label,
      pg.id,
      pg.name,
      pg.label,
      pg.slug,
      pg.sort_order,
      c.id,
      c.name,
      c.label,
      c.slug,
      NULLIF(to_jsonb(c)->>'sort_order', '')::int
    ORDER BY
      CASE LOWER(d.name) WHEN 'women' THEN 0 WHEN 'men' THEN 1 ELSE 2 END,
      COALESCE(pg.sort_order, 999),
      pg.name ASC,
      COALESCE(NULLIF(to_jsonb(c)->>'sort_order', '')::int, 999),
      c.name ASC
  `
);

const listPublicMaterials = (db, filters = {}) => {
  const values = [];
  const clauses = [
    "(to_jsonb(m)->>'deleted_at') IS NULL",
    "COALESCE(to_jsonb(m)->>'status', 'active') = 'active'"
  ];

  if (filters.productGroup) {
    values.push(filters.productGroup);
    clauses.push(`(
      LOWER(COALESCE(pg.name, '')) = LOWER($${values.length})
      OR LOWER(COALESCE(pg.label, '')) = LOWER($${values.length})
      OR LOWER(COALESCE(pg.slug, '')) = LOWER($${values.length})
    )`);
  }

  if (filters.department) {
    values.push(filters.department);
    clauses.push(`(
      LOWER(d.name) = LOWER($${values.length})
      OR LOWER(COALESCE(d.label, '')) = LOWER($${values.length})
    )`);
  }

  return db.query(
    `
      SELECT
        m.id,
        m.name,
        m.slug,
        m.product_group_id,
        m.department_id,
        pg.slug AS product_group_slug,
        pg.label AS product_group_label,
        d.name AS department_name,
        d.label AS department_label,
        COALESCE(to_jsonb(m)->>'status', 'active') AS status,
        m.sort_order
      FROM ${MATERIAL_TABLE} m
      LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = m.product_group_id
      LEFT JOIN ${DEPARTMENT_TABLE} d ON d.id = m.department_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY COALESCE(m.sort_order, 999), m.name ASC
    `,
    values
  );
};

const findCategorySizeGuide = (db, categoryId) => db.query(
  `
    SELECT
      guide.id,
      guide.category_id,
      guide.title,
      guide.unit,
      guide.guide_data,
      guide.created_at,
      guide.updated_at
    FROM ${SIZE_GUIDE_TABLE} guide
    JOIN ${CATEGORY_TABLE} category ON category.id = guide.category_id
    LEFT JOIN ${PRODUCT_GROUP_TABLE} product_group ON product_group.id = category.product_group_id
    WHERE guide.category_id = $1
      AND LOWER(COALESCE(product_group.slug, product_group.name, '')) <> 'accessories'
    LIMIT 1
  `,
  [categoryId]
);

module.exports = {
  findCategorySizeGuide,
  listAdminFits,
  listAdminMaterials,
  listAdminProductGroups,
  listAdminStyles,
  listDepartmentTreeRows,
  listPublicMaterials
};
