const { isValidUuid, normalizeEmail } = require('../utils/authUtils');

const USER_TABLE = 'users';
const USER_PROFILE_TABLE = 'user_profiles';

const accountColumns = `
  id,
  name,
  email,
  password_hash,
  role,
  status,
  email_verified,
  email_verified_at,
  email_verification_expires_at,
  created_at,
  updated_at
`;

const publicAccountColumns = `
  id,
  name,
  email,
  role,
  status,
  email_verified,
  created_at,
  updated_at
`;

const findByEmail = async (db, email) => {
  const result = await db.query(
    `
      SELECT ${accountColumns}
      FROM ${USER_TABLE}
      WHERE email = $1
      LIMIT 1
    `,
    [normalizeEmail(email)]
  );

  return result.rows[0] || null;
};

const findByIdentity = async (db, { id, email } = {}) => {
  const useId = isValidUuid(id);
  const result = await db.query(
    `
      SELECT ${accountColumns}
      FROM ${USER_TABLE}
      WHERE ${useId ? 'id' : 'email'} = $1
      LIMIT 1
    `,
    [useId ? id : normalizeEmail(email)]
  );

  return result.rows[0] || null;
};

const findAuthUserByIdentity = async (db, { id, email } = {}) => {
  const useId = isValidUuid(id);
  const result = await db.query(
    `
      SELECT ${publicAccountColumns}
      FROM ${USER_TABLE}
      WHERE ${useId ? 'id' : 'email'} = $1
      LIMIT 1
    `,
    [useId ? id : normalizeEmail(email)]
  );

  return result.rows[0] || null;
};

const deletePendingById = async (db, userId) => {
  if (!isValidUuid(userId)) return false;

  const result = await db.query(
    `
      DELETE FROM ${USER_TABLE}
      WHERE id = $1
        AND email_verified = false
      RETURNING id
    `,
    [userId]
  );

  return Boolean(result.rowCount);
};

const deleteExpiredPendingByEmail = async (db, email) => {
  const result = await db.query(
    `
      DELETE FROM ${USER_TABLE}
      WHERE email = $1
        AND email_verified = false
        AND (
          email_verification_expires_at IS NULL
          OR email_verification_expires_at <= now()
        )
      RETURNING id
    `,
    [normalizeEmail(email)]
  );

  return Boolean(result.rowCount);
};

const updateVerificationExpiry = (db, userId, expiresAt) => db.query(
  `
    UPDATE ${USER_TABLE}
    SET email_verification_expires_at = $2,
        updated_at = now()
    WHERE id = $1
      AND email_verified = false
    RETURNING ${accountColumns}
  `,
  [userId, expiresAt]
);

const upsertProfile = async (db, userId, payload) => {
  const result = await db.query(
    `
      INSERT INTO ${USER_PROFILE_TABLE} (
        user_id,
        full_name,
        phone,
        gender,
        birth_date,
        payment_provider,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, now(), now())
      ON CONFLICT (user_id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          gender = EXCLUDED.gender,
          birth_date = EXCLUDED.birth_date,
          payment_provider = EXCLUDED.payment_provider,
          updated_at = now()
      RETURNING
        id,
        user_id,
        full_name,
        phone,
        gender,
        birth_date,
        payment_provider,
        created_at,
        updated_at
    `,
    [
      userId,
      payload.fullName,
      payload.phone,
      payload.gender,
      payload.birthDate,
      payload.paymentProvider
    ]
  );

  return result.rows[0] || null;
};

const createPendingMember = async (db, account, profile) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query(
      `
        INSERT INTO ${USER_TABLE} (
          name,
          email,
          password_hash,
          role,
          email_verified,
          email_verification_expires_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, false, $5, now(), now())
        RETURNING ${accountColumns}
      `,
      [
        account.name,
        normalizeEmail(account.email),
        account.passwordHash,
        account.role || 'user',
        account.verificationExpiresAt
      ]
    );
    const user = result.rows[0];

    await upsertProfile(client, user.id, profile);
    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updatePasswordHash = (db, userId, passwordHash, options = {}) => {
  const values = [userId, passwordHash];
  const expectedHashClause = options.expectedHash === undefined
    ? ''
    : `AND password_hash = $${values.push(options.expectedHash)}`;

  return db.query(
    `
      UPDATE ${USER_TABLE}
      SET password_hash = $2,
          updated_at = now()
      WHERE id = $1
        ${expectedHashClause}
      RETURNING ${accountColumns}
    `,
    values
  );
};

const verifyEmail = (db, userId) => db.query(
  `
    UPDATE ${USER_TABLE}
    SET email_verified = true,
        email_verified_at = now(),
        email_verification_expires_at = NULL,
        updated_at = now()
    WHERE id = $1
      AND email_verified = false
    RETURNING ${accountColumns}
  `,
  [userId]
);

const updateName = (db, userId, name) => db.query(
  `
    UPDATE ${USER_TABLE}
    SET name = $2,
        updated_at = now()
    WHERE id = $1
  `,
  [userId, name]
);

const findProfileByUserId = async (db, userId) => {
  const result = await db.query(
    `
      SELECT
        id,
        user_id,
        full_name,
        phone,
        gender,
        birth_date,
        payment_provider,
        created_at,
        updated_at
      FROM ${USER_PROFILE_TABLE}
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
};

const listAll = db => db.query(
  `
    SELECT ${publicAccountColumns}
    FROM ${USER_TABLE}
    ORDER BY created_at DESC, id DESC
  `
);

const buildAdminFilters = (filters = {}) => {
  const clauses = [];
  const values = [];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    clauses.push(`(name ILIKE $${values.length} OR email ILIKE $${values.length} OR role ILIKE $${values.length})`);
  }

  if (filters.status) {
    values.push(filters.status);
    clauses.push(`LOWER(COALESCE(status, 'active')) = $${values.length}`);
  }

  if (filters.role === 'admin') {
    values.push('admin');
    clauses.push(`LOWER(COALESCE(role, 'user')) = $${values.length}`);
  } else if (filters.role === 'user') {
    clauses.push(`LOWER(COALESCE(role, 'user')) <> 'admin'`);
  }

  if (filters.dateRange === 'today') {
    clauses.push(`created_at >= date_trunc('day', now())`);
  } else if (filters.dateRange === 'week') {
    clauses.push(`created_at >= date_trunc('week', now())`);
  } else if (filters.dateRange === 'month') {
    clauses.push(`created_at >= date_trunc('month', now())`);
  }

  return {
    values,
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  };
};

const listAdmin = async (db, filters = {}) => {
  const { values, whereSql } = buildAdminFilters(filters);
  const [rowsResult, totalResult, summaryResult] = await Promise.all([
    db.query(
      `
        SELECT ${publicAccountColumns}
        FROM ${USER_TABLE}
        ${whereSql}
        ORDER BY created_at DESC, id DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `,
      [...values, filters.limit, filters.offset]
    ),
    db.query(
      `SELECT COUNT(*)::int AS total FROM ${USER_TABLE} ${whereSql}`,
      values
    ),
    db.query(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(role, 'user')) = 'admin')::int AS admins,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(role, 'user')) <> 'admin')::int AS users
        FROM ${USER_TABLE}
      `
    )
  ]);

  return {
    rows: rowsResult.rows,
    total: totalResult.rows[0].total,
    summary: summaryResult.rows[0] || { total: 0, admins: 0, users: 0 }
  };
};

const findAdminCustomerDetail = async (db, userId, pagination = {}) => {
  const limit = Math.min(50, Math.max(1, Number.parseInt(pagination.limit, 10) || 10));
  const offset = Math.max(0, Number.parseInt(pagination.offset, 10) || 0);
  const [accountResult, statisticsResult, orderStatusResult, ordersResult, returnsResult] = await Promise.all([
    db.query(
      `
        SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          u.status,
          u.email_verified,
          u.email_verified_at,
          u.created_at,
          u.updated_at,
          p.full_name,
          p.phone,
          p.gender,
          p.birth_date
        FROM ${USER_TABLE} u
        LEFT JOIN ${USER_PROFILE_TABLE} p ON p.user_id = u.id
        WHERE u.id = $1
          AND LOWER(COALESCE(u.role, 'user')) <> 'admin'
        LIMIT 1
      `,
      [userId]
    ),
    db.query(
      `
        SELECT
          COUNT(*)::int AS order_count,
          COUNT(*) FILTER (
            WHERE order_status = 'completed'
              AND (
                payment_method = 'cod'
                OR payment_status IN ('paid', 'refund_pending', 'partially_refunded', 'refunded')
              )
              AND GREATEST(total_amount - COALESCE(refund_amount, 0), 0) > 0
          )::int AS completed_order_count,
          COUNT(*) FILTER (WHERE order_status = 'cancelled')::int AS cancelled_order_count,
          COALESCE(
            SUM(GREATEST(total_amount - COALESCE(refund_amount, 0), 0)) FILTER (
              WHERE order_status = 'completed'
                AND (
                  payment_method = 'cod'
                  OR payment_status IN ('paid', 'refund_pending', 'partially_refunded', 'refunded')
                )
            ),
            0
          ) AS total_spent,
          COALESCE(
            AVG(GREATEST(total_amount - COALESCE(refund_amount, 0), 0)) FILTER (
              WHERE order_status = 'completed'
                AND (
                  payment_method = 'cod'
                  OR payment_status IN ('paid', 'refund_pending', 'partially_refunded', 'refunded')
                )
                AND GREATEST(total_amount - COALESCE(refund_amount, 0), 0) > 0
            ),
            0
          ) AS average_order_value,
          MAX(created_at) AS last_order_at
        FROM orders
        WHERE user_id = $1
      `,
      [userId]
    ),
    db.query(
      `
        SELECT
          order_status,
          COUNT(*)::int AS count
        FROM orders
        WHERE user_id = $1
        GROUP BY order_status
        ORDER BY count DESC, order_status ASC
      `,
      [userId]
    ),
    db.query(
      `
        SELECT
          o.id,
          o.total_amount,
          o.payment_method,
          o.payment_status,
          o.order_status,
          o.shipping_full_name,
          o.shipping_phone,
          o.created_at,
          o.updated_at,
          COALESCE((
            SELECT SUM(oi.quantity)::int
            FROM order_items oi
            WHERE oi.order_id = o.id
          ), 0) AS item_count
        FROM orders o
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset]
    ),
    db.query(
      `
        SELECT COUNT(*)::int AS return_request_count
        FROM return_requests
        WHERE user_id = $1
      `,
      [userId]
    )
  ]);

  if (!accountResult.rowCount) {
    return null;
  }

  return {
    account: accountResult.rows[0],
    statistics: {
      ...(statisticsResult.rows[0] || {}),
      ...(returnsResult.rows[0] || {})
    },
    orderStatusSummary: orderStatusResult.rows,
    orders: ordersResult.rows
  };
};

const findAdminCustomerOrders = async (db, userId, pagination = {}) => {
  const limit = Math.min(50, Math.max(1, Number.parseInt(pagination.limit, 10) || 10));
  const offset = Math.max(0, Number.parseInt(pagination.offset, 10) || 0);
  const result = await db.query(
    `
      SELECT
        o.id,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.order_status,
        o.shipping_full_name,
        o.shipping_phone,
        o.created_at,
        o.updated_at,
        COUNT(*) OVER()::int AS total_count,
        COALESCE((
          SELECT SUM(oi.quantity)::int
          FROM order_items oi
          WHERE oi.order_id = o.id
        ), 0) AS item_count
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset]
  );

  return {
    rows: result.rows,
    total: result.rows.length ? Number(result.rows[0].total_count || 0) : 0
  };
};

const updateStatus = (db, userId, status) => db.query(
  `
    UPDATE ${USER_TABLE}
    SET status = $2,
        updated_at = now()
    WHERE id = $1
    RETURNING ${publicAccountColumns}
  `,
  [userId, status]
);

module.exports = {
  createPendingMember,
  deleteExpiredPendingByEmail,
  deletePendingById,
  findAuthUserByIdentity,
  findAdminCustomerDetail,
  findAdminCustomerOrders,
  findByEmail,
  findByIdentity,
  findProfileByUserId,
  listAdmin,
  listAll,
  updateName,
  updatePasswordHash,
  updateStatus,
  updateVerificationExpiry,
  upsertProfile,
  verifyEmail
};
