// Collection data access: admin CRUD plus atomic storefront-department synchronization.
const COLLECTION_DEPARTMENT_TABLE = 'collection_departments';
const COLLECTION_TABLE = 'collections';
const DEPARTMENT_TABLE = 'departments';
const PRODUCT_TABLE = 'products';

const collectionDetailSql = `
  SELECT
    col.id,
    col.name,
    col.slug,
    to_jsonb(col)->>'banner_image' AS banner_image,
    COALESCE(to_jsonb(col)->>'status', 'active') AS status,
    col.created_at,
    to_jsonb(col)->>'updated_at' AS updated_at,
    (
      SELECT COUNT(*)::int
      FROM ${PRODUCT_TABLE} p
      WHERE p.collection_id = col.id
        AND (to_jsonb(p)->>'deleted_at') IS NULL
    ) AS product_count,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', cd.id,
          'departmentId', d.id,
          'departmentName', d.name,
          'departmentLabel', d.label,
          'bannerImage', cd.banner_image_url,
          'bannerPublicId', cd.banner_public_id,
          'status', cd.status
        )
        ORDER BY d.name
      )
      FROM ${COLLECTION_DEPARTMENT_TABLE} cd
      JOIN ${DEPARTMENT_TABLE} d ON d.id = cd.department_id
      WHERE cd.collection_id = col.id
        AND cd.deleted_at IS NULL
    ), '[]'::jsonb) AS departments
  FROM ${COLLECTION_TABLE} col
  WHERE col.id = $1
    AND (to_jsonb(col)->>'deleted_at') IS NULL
`;

const buildListFilter = ({ search = '', status = '' } = {}) => {
  const clauses = ["(to_jsonb(col)->>'deleted_at') IS NULL"];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    clauses.push(`(col.name ILIKE $${values.length} OR col.slug ILIKE $${values.length})`);
  }

  if (status) {
    values.push(status);
    clauses.push(`LOWER(COALESCE(to_jsonb(col)->>'status', 'active')) = $${values.length}`);
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
        col.id,
        col.name,
        col.slug,
        to_jsonb(col)->>'banner_image' AS banner_image,
        COALESCE(to_jsonb(col)->>'status', 'active') AS status,
        col.created_at,
        to_jsonb(col)->>'updated_at' AS updated_at,
        (
          SELECT COUNT(*)::int
          FROM ${PRODUCT_TABLE} p
          WHERE p.collection_id = col.id
            AND (to_jsonb(p)->>'deleted_at') IS NULL
        ) AS product_count,
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', cd.id,
              'departmentId', d.id,
              'departmentName', d.name,
              'departmentLabel', d.label,
              'bannerImage', cd.banner_image_url,
              'bannerPublicId', cd.banner_public_id,
              'status', cd.status
            )
            ORDER BY d.name
          )
          FROM ${COLLECTION_DEPARTMENT_TABLE} cd
          JOIN ${DEPARTMENT_TABLE} d ON d.id = cd.department_id
          WHERE cd.collection_id = col.id
            AND cd.deleted_at IS NULL
        ), '[]'::jsonb) AS departments
      FROM ${COLLECTION_TABLE} col
      ${whereSql}
      ORDER BY col.created_at DESC NULLS LAST, col.name ASC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
    queryValues
  );
  const totalPromise = db.query(
    `SELECT COUNT(*)::int AS total FROM ${COLLECTION_TABLE} col ${whereSql}`,
    values
  );
  const [rowsResult, totalResult] = await Promise.all([rowsPromise, totalPromise]);

  return {
    rows: rowsResult.rows,
    total: totalResult.rows[0].total
  };
};

const findById = (db, collectionId) => db.query(collectionDetailSql, [collectionId]);

const listPublic = db => db.query(
  `
    SELECT
      col.id,
      col.name,
      col.slug,
      to_jsonb(col)->>'banner_image' AS banner_image,
      COALESCE(to_jsonb(col)->>'status', 'active') AS status,
      col.created_at,
      COUNT(p.id)::int AS product_count,
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'departmentId', d.id,
            'departmentName', d.name,
            'departmentLabel', d.label,
            'bannerImage', cd.banner_image_url,
            'bannerPublicId', cd.banner_public_id,
            'status', cd.status
          )
          ORDER BY d.name
        )
        FROM ${COLLECTION_DEPARTMENT_TABLE} cd
        JOIN ${DEPARTMENT_TABLE} d ON d.id = cd.department_id
        WHERE cd.collection_id = col.id
          AND cd.deleted_at IS NULL
          AND cd.status = 'active'
      ), '[]'::jsonb) AS departments
    FROM ${COLLECTION_TABLE} col
    LEFT JOIN ${PRODUCT_TABLE} p
      ON p.collection_id = col.id
     AND (to_jsonb(p)->>'deleted_at') IS NULL
    WHERE (to_jsonb(col)->>'deleted_at') IS NULL
      AND COALESCE(to_jsonb(col)->>'status', 'active') = 'active'
      AND EXISTS (
        SELECT 1
        FROM ${COLLECTION_DEPARTMENT_TABLE} cd
        WHERE cd.collection_id = col.id
          AND cd.deleted_at IS NULL
          AND cd.status = 'active'
      )
    GROUP BY col.id
    ORDER BY col.created_at DESC NULLS LAST, col.name ASC
  `
);

const listLanding = async db => {
  const result = await listPublic(db);
  return {
    ...result,
    rows: result.rows.slice(0, 12)
  };
};

const syncDepartments = async (db, collectionId, departments) => {
  const departmentIds = departments.map(item => item.departmentId);
  const validDepartments = await db.query(
    `SELECT id FROM ${DEPARTMENT_TABLE} WHERE id = ANY($1::uuid[])`,
    [departmentIds]
  );

  if (validDepartments.rowCount !== departmentIds.length) {
    const error = new Error('One or more collection departments are invalid.');
    error.statusCode = 400;
    throw error;
  }

  const removedDepartmentProducts = await db.query(
    `
      SELECT d.label, COUNT(p.id)::int AS product_count
      FROM ${COLLECTION_DEPARTMENT_TABLE} cd
      JOIN ${DEPARTMENT_TABLE} d ON d.id = cd.department_id
      JOIN ${PRODUCT_TABLE} p
        ON p.collection_id = cd.collection_id
       AND p.department_id = cd.department_id
       AND (to_jsonb(p)->>'deleted_at') IS NULL
      WHERE cd.collection_id = $1
        AND cd.deleted_at IS NULL
        AND NOT (cd.department_id = ANY($2::uuid[]))
      GROUP BY d.id
      HAVING COUNT(p.id) > 0
    `,
    [collectionId, departmentIds]
  );

  if (removedDepartmentProducts.rowCount) {
    const labels = removedDepartmentProducts.rows.map(row => row.label).join(', ');
    const error = new Error(`Remove or reassign ${labels} products before disabling that collection storefront.`);
    error.statusCode = 409;
    throw error;
  }

  await db.query(
    `
      UPDATE ${COLLECTION_DEPARTMENT_TABLE}
      SET status = 'inactive',
          deleted_at = COALESCE(deleted_at, now()),
          updated_at = now()
      WHERE collection_id = $1
        AND NOT (department_id = ANY($2::uuid[]))
    `,
    [collectionId, departmentIds]
  );

  for (const department of departments) {
    await db.query(
      `
        INSERT INTO ${COLLECTION_DEPARTMENT_TABLE} (
          collection_id,
          department_id,
          banner_image_url,
          banner_public_id,
          status,
          deleted_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NULL, now(), now())
        ON CONFLICT (collection_id, department_id)
        DO UPDATE SET
          banner_image_url = EXCLUDED.banner_image_url,
          banner_public_id = EXCLUDED.banner_public_id,
          status = EXCLUDED.status,
          deleted_at = NULL,
          updated_at = now()
      `,
      [
        collectionId,
        department.departmentId,
        department.bannerImage,
        department.bannerPublicId || null,
        department.status
      ]
    );
  }
};

const create = async (db, payload) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query(
      `
        INSERT INTO ${COLLECTION_TABLE} (
          name,
          slug,
          banner_image,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, now(), now())
        RETURNING *
      `,
      [payload.name, payload.slug, payload.bannerImage || null, payload.status]
    );

    await syncDepartments(client, result.rows[0].id, payload.departments);
    const detailResult = await findById(client, result.rows[0].id);
    await client.query('COMMIT');
    return detailResult;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const update = async (db, collectionId, payload) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query(
      `
        UPDATE ${COLLECTION_TABLE}
        SET name = $2,
            slug = $3,
            banner_image = $4,
            status = $5,
            updated_at = now()
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING *
      `,
      [collectionId, payload.name, payload.slug, payload.bannerImage || null, payload.status]
    );

    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return result;
    }

    await syncDepartments(client, result.rows[0].id, payload.departments);
    const detailResult = await findById(client, result.rows[0].id);
    await client.query('COMMIT');
    return detailResult;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateStatus = (db, collectionId, status) => db.query(
  `
    UPDATE ${COLLECTION_TABLE}
    SET status = $2,
        updated_at = now()
    WHERE id = $1
      AND deleted_at IS NULL
    RETURNING *
  `,
  [collectionId, status]
);

const softDelete = (db, collectionId) => db.query(
  `
    UPDATE ${COLLECTION_TABLE}
    SET status = 'inactive',
        deleted_at = COALESCE(deleted_at, now()),
        updated_at = now()
    WHERE id = $1
      AND deleted_at IS NULL
    RETURNING id
  `,
  [collectionId]
);

module.exports = {
  create,
  findById,
  list,
  listLanding,
  listPublic,
  softDelete,
  update,
  updateStatus
};
