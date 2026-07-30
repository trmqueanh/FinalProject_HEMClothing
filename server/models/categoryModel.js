// Category data access: admin listing, detail, CRUD, status changes, and soft delete.
const CATEGORY_TABLE = 'categories';
const DEPARTMENT_TABLE = 'departments';
const PRODUCT_GROUP_TABLE = 'product_groups';
const PRODUCT_TABLE = 'products';

const buildListFilter = ({ search = '', status = '', gender = '', productGroup = '' } = {}) => {
  const clauses = ["(to_jsonb(c)->>'deleted_at') IS NULL"];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    clauses.push(`(c.name ILIKE $${values.length} OR c.label ILIKE $${values.length} OR COALESCE(c.slug, '') ILIKE $${values.length})`);
  }

  if (status) {
    values.push(status);
    clauses.push(`LOWER(COALESCE(to_jsonb(c)->>'status', 'active')) = $${values.length}`);
  }

  if (gender) {
    values.push(gender);
    clauses.push(`LOWER(COALESCE(d.name, '')) = $${values.length}`);
  }

  if (productGroup) {
    values.push(productGroup);
    clauses.push(`(
      LOWER(COALESCE(pg.slug, '')) = LOWER($${values.length})
      OR LOWER(COALESCE(pg.name, '')) = LOWER($${values.length})
      OR LOWER(COALESCE(pg.label, '')) = LOWER($${values.length})
    )`);
  }

  return {
    values,
    whereSql: `WHERE ${clauses.join(' AND ')}`
  };
};

const list = async (db, filters = {}) => {
  const { limit, offset } = filters;
  const { values, whereSql } = buildListFilter(filters);
  const queryValues = [...values, limit, offset];

  const rowsPromise = db.query(
    `
      SELECT
        c.id,
        c.name,
        c.label,
        c.slug,
        c.department_id,
        COALESCE(to_jsonb(c)->>'status', 'active') AS status,
        c.created_at,
        to_jsonb(c)->>'updated_at' AS updated_at,
        d.name AS department_name,
        pg.id AS product_group_id,
        pg.name AS product_group_name,
        pg.label AS product_group_label,
        pg.slug AS product_group_slug,
        COUNT(p.id)::int AS product_count
      FROM ${CATEGORY_TABLE} c
      LEFT JOIN ${DEPARTMENT_TABLE} d ON d.id = c.department_id
      LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = c.product_group_id
      LEFT JOIN ${PRODUCT_TABLE} p
        ON p.category_id = c.id
       AND (to_jsonb(p)->>'deleted_at') IS NULL
      ${whereSql}
      GROUP BY c.id, d.id, pg.id
      ORDER BY c.created_at DESC, c.name ASC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
    queryValues
  );
  const totalPromise = db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM ${CATEGORY_TABLE} c
      LEFT JOIN ${DEPARTMENT_TABLE} d ON d.id = c.department_id
      LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = c.product_group_id
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

const findById = (db, categoryId) => db.query(
  `
    SELECT
      c.id,
      c.name,
      c.label,
      c.slug,
      c.department_id,
      COALESCE(to_jsonb(c)->>'status', 'active') AS status,
      c.created_at,
      to_jsonb(c)->>'updated_at' AS updated_at,
      d.name AS department_name,
      pg.id AS product_group_id,
      pg.name AS product_group_name,
      pg.label AS product_group_label,
      pg.slug AS product_group_slug,
      COUNT(p.id)::int AS product_count
    FROM ${CATEGORY_TABLE} c
    LEFT JOIN ${DEPARTMENT_TABLE} d ON d.id = c.department_id
    LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = c.product_group_id
    LEFT JOIN ${PRODUCT_TABLE} p
      ON p.category_id = c.id
     AND (to_jsonb(p)->>'deleted_at') IS NULL
    WHERE c.id = $1
      AND (to_jsonb(c)->>'deleted_at') IS NULL
    GROUP BY c.id, d.id, pg.id
  `,
  [categoryId]
);

const listPublic = db => db.query(
  `
    SELECT
      c.id,
      c.name,
      c.label,
      c.slug,
      c.department_id,
      d.name AS department_name,
      d.label AS department_label,
      pg.id AS product_group_id,
      pg.name AS product_group_name,
      pg.label AS product_group_label,
      pg.slug AS product_group_slug,
      COUNT(p.id)::int AS product_count,
      ARRAY_AGG(DISTINCT col.name)
      FILTER (WHERE col.id IS NOT NULL) AS collections
    FROM ${CATEGORY_TABLE} c
    JOIN ${DEPARTMENT_TABLE} d ON d.id = c.department_id
    LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = c.product_group_id
    LEFT JOIN ${PRODUCT_TABLE} p
      ON p.category_id = c.id
     AND (to_jsonb(p)->>'deleted_at') IS NULL
    LEFT JOIN collections col ON col.id = p.collection_id
    WHERE (to_jsonb(c)->>'deleted_at') IS NULL
      AND COALESCE(to_jsonb(c)->>'status', 'active') = 'active'
    GROUP BY c.id, c.name, c.label, c.slug, c.department_id, d.name, d.label, pg.id
    ORDER BY d.name ASC, c.name ASC
  `
);

const create = (db, payload) => db.query(
  `
    INSERT INTO ${CATEGORY_TABLE} (
      name,
      label,
      slug,
      department_id,
      product_group_id,
      status,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, now(), now())
    RETURNING *
  `,
  [payload.name, payload.label, payload.slug, payload.departmentId, payload.productGroupId, payload.status]
);

const update = (db, categoryId, payload) => db.query(
  `
    UPDATE ${CATEGORY_TABLE}
    SET name = $2,
        label = $3,
        slug = $4,
        department_id = $5,
        product_group_id = $6,
        status = $7,
        updated_at = now()
    WHERE id = $1
      AND deleted_at IS NULL
    RETURNING *
  `,
  [categoryId, payload.name, payload.label, payload.slug, payload.departmentId, payload.productGroupId, payload.status]
);

const updateStatus = (db, categoryId, status) => db.query(
  `
    UPDATE ${CATEGORY_TABLE}
    SET status = $2,
        updated_at = now()
    WHERE id = $1
      AND deleted_at IS NULL
    RETURNING *
  `,
  [categoryId, status]
);

const softDelete = (db, categoryId) => db.query(
  `
    UPDATE ${CATEGORY_TABLE}
    SET status = 'inactive',
        deleted_at = COALESCE(deleted_at, now()),
        updated_at = now()
    WHERE id = $1
      AND deleted_at IS NULL
    RETURNING id
  `,
  [categoryId]
);

module.exports = {
  create,
  findById,
  list,
  listPublic,
  softDelete,
  update,
  updateStatus
};
