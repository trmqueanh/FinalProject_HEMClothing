// Voucher data access for admin CRUD, public availability, checkout, and redemption history.
const VOUCHER_REDEMPTION_TABLE = 'voucher_redemptions';
const VOUCHER_TABLE = 'vouchers';

const buildAdminListFilter = ({ search = '', status = '' } = {}) => {
  const clauses = ["(to_jsonb(v)->>'deleted_at') IS NULL"];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    clauses.push(`v.code ILIKE $${values.length}`);
  }

  if (status) {
    values.push(status);
    clauses.push(`LOWER(v.status) = $${values.length}`);
  }

  return {
    values,
    whereSql: `WHERE ${clauses.join(' AND ')}`
  };
};

const listAdmin = async (db, filters = {}) => {
  const { limit, offset } = filters;
  const { values, whereSql } = buildAdminListFilter(filters);
  const rowsPromise = db.query(
    `
      SELECT v.*
      FROM ${VOUCHER_TABLE} v
      ${whereSql}
      ORDER BY v.created_at DESC, v.id DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
    [...values, limit, offset]
  );
  const totalPromise = db.query(
    `SELECT COUNT(*)::int AS total FROM ${VOUCHER_TABLE} v ${whereSql}`,
    values
  );
  const [rowsResult, totalResult] = await Promise.all([rowsPromise, totalPromise]);

  return {
    rows: rowsResult.rows,
    total: totalResult.rows[0].total
  };
};

const findById = (db, voucherId) => db.query(
  `
    SELECT *
    FROM ${VOUCHER_TABLE}
    WHERE id = $1
      AND deleted_at IS NULL
    LIMIT 1
  `,
  [voucherId]
);

const findDuplicateCode = (db, code, excludedId = null) => db.query(
  `
    SELECT id
    FROM ${VOUCHER_TABLE}
    WHERE UPPER(code) = $1
      AND ($2::uuid IS NULL OR id <> $2::uuid)
    LIMIT 1
  `,
  [code, excludedId]
);

const create = (db, payload) => db.query(
  `
    INSERT INTO ${VOUCHER_TABLE} (
      code,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      start_date,
      end_date,
      usage_limit,
      status,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
    RETURNING *
  `,
  [
    payload.code,
    payload.discountType,
    payload.discountValue,
    payload.minOrderAmount,
    payload.maxDiscountAmount,
    payload.startDate,
    payload.endDate,
    payload.usageLimit,
    payload.status
  ]
);

const update = (db, voucherId, payload) => db.query(
  `
    UPDATE ${VOUCHER_TABLE}
    SET code = $2,
        discount_type = $3,
        discount_value = $4,
        min_order_amount = $5,
        max_discount_amount = $6,
        start_date = $7,
        end_date = $8,
        usage_limit = $9,
        status = $10,
        updated_at = now()
    WHERE id = $1
      AND deleted_at IS NULL
    RETURNING *
  `,
  [
    voucherId,
    payload.code,
    payload.discountType,
    payload.discountValue,
    payload.minOrderAmount,
    payload.maxDiscountAmount,
    payload.startDate,
    payload.endDate,
    payload.usageLimit,
    payload.status
  ]
);

const softDelete = (db, voucherId) => db.query(
  `
    UPDATE ${VOUCHER_TABLE}
    SET status = 'inactive',
        deleted_at = COALESCE(deleted_at, now()),
        updated_at = now()
    WHERE id = $1
      AND deleted_at IS NULL
    RETURNING id
  `,
  [voucherId]
);

const listActive = db => db.query(
  `
    SELECT v.*
    FROM ${VOUCHER_TABLE} v
    WHERE v.deleted_at IS NULL
      AND v.status = 'active'
      AND (v.start_date IS NULL OR v.start_date <= CURRENT_TIMESTAMP)
      AND (v.end_date IS NULL OR v.end_date >= CURRENT_TIMESTAMP)
      AND (v.usage_limit IS NULL OR v.used_count < v.usage_limit)
    ORDER BY v.discount_value ASC, v.created_at DESC, v.id DESC
  `
);

const listMemberCatalog = db => db.query(
  `
    SELECT v.*
    FROM ${VOUCHER_TABLE} v
    WHERE v.deleted_at IS NULL
      AND v.status = 'active'
    ORDER BY v.end_date ASC NULLS LAST, v.created_at DESC, v.id DESC
  `
);

const findByCode = (db, code, { lock = false } = {}) => db.query(
  `
    SELECT
      id,
      code,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      start_date,
      end_date,
      usage_limit,
      used_count,
      (to_jsonb(${VOUCHER_TABLE})->>'per_user_limit')::int AS per_user_limit,
      status,
      deleted_at,
      created_at,
      updated_at,
      CURRENT_TIMESTAMP AS current_time
    FROM ${VOUCHER_TABLE}
    WHERE UPPER(code) = $1
      AND deleted_at IS NULL
    LIMIT 1
    ${lock ? 'FOR UPDATE' : ''}
  `,
  [code]
);

const redemptionsAvailable = db => db.query(
  `SELECT to_regclass('public.${VOUCHER_REDEMPTION_TABLE}') IS NOT NULL AS available`
);

const getUserUsageCount = (db, voucherId, userId) => db.query(
  `
    SELECT COUNT(*)::int AS usage_count
    FROM ${VOUCHER_REDEMPTION_TABLE}
    WHERE voucher_id = $1
      AND user_id = $2
  `,
  [voucherId, userId]
);

const listEligible = db => db.query(
  `
    SELECT
      v.*,
      (to_jsonb(v)->>'per_user_limit')::int AS per_user_limit,
      CURRENT_TIMESTAMP AS current_time
    FROM ${VOUCHER_TABLE} v
    WHERE v.deleted_at IS NULL
      AND LOWER(v.status) = 'active'
      AND (v.start_date IS NULL OR v.start_date <= CURRENT_TIMESTAMP)
      AND (v.end_date IS NULL OR v.end_date >= CURRENT_TIMESTAMP)
      AND (v.usage_limit IS NULL OR COALESCE(v.used_count, 0) < v.usage_limit)
    ORDER BY v.id ASC
  `
);

const listUsageCounts = (db, userId, voucherIds) => db.query(
  `
    SELECT voucher_id, COUNT(*)::int AS usage_count
    FROM ${VOUCHER_REDEMPTION_TABLE}
    WHERE user_id = $1
      AND voucher_id = ANY($2::uuid[])
    GROUP BY voucher_id
  `,
  [userId, voucherIds]
);

const createRedemption = (db, {
  voucherId,
  voucherCode,
  userId,
  orderId,
  subtotal,
  discountAmount
}) => db.query(
  `
    INSERT INTO ${VOUCHER_REDEMPTION_TABLE} (
      voucher_id,
      user_id,
      order_id,
      voucher_code,
      order_subtotal,
      discount_amount,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, now())
    ON CONFLICT (order_id) DO NOTHING
    RETURNING id
  `,
  [voucherId, userId, orderId, voucherCode, subtotal, discountAmount]
);

const incrementUsage = (db, voucherId) => db.query(
  `
    UPDATE ${VOUCHER_TABLE}
    SET used_count = COALESCE(used_count, 0) + 1,
        updated_at = now()
    WHERE id = $1
      AND (usage_limit IS NULL OR COALESCE(used_count, 0) < usage_limit)
    RETURNING id
  `,
  [voucherId]
);

const releaseRedemptionForOrder = (db, orderId) => db.query(
  `
    WITH removed_redemptions AS (
      DELETE FROM ${VOUCHER_REDEMPTION_TABLE}
      WHERE order_id = $1
      RETURNING voucher_id
    ), released_usage AS (
      SELECT voucher_id, COUNT(*)::int AS quantity
      FROM removed_redemptions
      GROUP BY voucher_id
    )
    UPDATE ${VOUCHER_TABLE} v
    SET used_count = GREATEST(COALESCE(v.used_count, 0) - released_usage.quantity, 0),
        updated_at = now()
    FROM released_usage
    WHERE v.id = released_usage.voucher_id
    RETURNING v.id, v.code, v.used_count
  `,
  [orderId]
);

module.exports = {
  create,
  createRedemption,
  findByCode,
  findById,
  findDuplicateCode,
  getUserUsageCount,
  incrementUsage,
  listActive,
  listAdmin,
  listEligible,
  listMemberCatalog,
  listUsageCounts,
  redemptionsAvailable,
  releaseRedemptionForOrder,
  softDelete,
  update
};
