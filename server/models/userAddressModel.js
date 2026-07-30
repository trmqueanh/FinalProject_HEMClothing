// User address data access shared by profile management and transactional checkout.
const USER_ADDRESS_TABLE = 'user_addresses';

const withTransaction = async (db, work) => {
  const ownsClient = typeof db.connect === 'function' && typeof db.release !== 'function';
  const client = ownsClient ? await db.connect() : db;

  try {
    if (ownsClient) await client.query('BEGIN');
    const result = await work(client);
    if (ownsClient) await client.query('COMMIT');
    return result;
  } catch (error) {
    if (ownsClient) await client.query('ROLLBACK');
    throw error;
  } finally {
    if (ownsClient) client.release();
  }
};

const listByUser = (db, userId) => db.query(
  `
    SELECT
      id,
      user_id,
      receiver_name,
      receiver_phone,
      country,
      city,
      district,
      ward,
      address_line,
      address_label,
      is_default,
      created_at,
      updated_at
    FROM ${USER_ADDRESS_TABLE}
    WHERE user_id = $1
    ORDER BY is_default DESC, updated_at DESC, created_at DESC, id DESC
  `,
  [userId]
);

const findOwnedById = (db, userId, addressId) => db.query(
  `
    SELECT id
    FROM ${USER_ADDRESS_TABLE}
    WHERE user_id = $1
      AND id = $2
    LIMIT 1
  `,
  [userId, addressId]
);

const setDefaultOnClient = async (db, userId, addressId) => {
  const target = await db.query(
    `
      SELECT id
      FROM ${USER_ADDRESS_TABLE}
      WHERE user_id = $1
        AND id = $2
      FOR UPDATE
    `,
    [userId, addressId]
  );

  if (!target.rowCount) {
    return false;
  }

  await db.query(
    `
      UPDATE ${USER_ADDRESS_TABLE}
      SET is_default = false,
          updated_at = now()
      WHERE user_id = $1
        AND is_default = true
        AND id <> $2
    `,
    [userId, addressId]
  );

  const result = await db.query(
    `
      UPDATE ${USER_ADDRESS_TABLE}
      SET is_default = true,
          updated_at = now()
      WHERE user_id = $1
        AND id = $2
      RETURNING id
    `,
    [userId, addressId]
  );

  return Boolean(result.rowCount);
};

const setDefault = (db, userId, addressId) => withTransaction(
  db,
  client => setDefaultOnClient(client, userId, addressId)
);

const create = (db, userId, payload, { setAsDefault = false } = {}) => withTransaction(db, async client => {
  const result = await client.query(
    `
      INSERT INTO ${USER_ADDRESS_TABLE} (
        user_id,
        receiver_name,
        receiver_phone,
        country,
        city,
        district,
        ward,
        address_line,
        address_label,
        is_default,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, now(), now())
      RETURNING id
    `,
    [
      userId,
      payload.receiverName,
      payload.receiverPhone,
      payload.country,
      payload.city,
      payload.district,
      payload.ward,
      payload.addressLine,
      payload.addressLabel
    ]
  );

  if (setAsDefault) {
    await setDefaultOnClient(client, userId, result.rows[0].id);
  }

  return result;
});

const update = (db, userId, addressId, payload, { setAsDefault = false } = {}) => withTransaction(db, async client => {
  const result = await client.query(
    `
      UPDATE ${USER_ADDRESS_TABLE}
      SET receiver_name = $3,
          receiver_phone = $4,
          country = $5,
          city = $6,
          district = $7,
          ward = $8,
          address_line = $9,
          address_label = $10,
          updated_at = now()
      WHERE user_id = $1
        AND id = $2
      RETURNING id
    `,
    [
      userId,
      addressId,
      payload.receiverName,
      payload.receiverPhone,
      payload.country,
      payload.city,
      payload.district,
      payload.ward,
      payload.addressLine,
      payload.addressLabel
    ]
  );

  if (result.rowCount && setAsDefault) {
    await setDefaultOnClient(client, userId, addressId);
  }

  return result;
});

const remove = (db, userId, addressId) => withTransaction(db, async client => {
  const result = await client.query(
    `
      DELETE FROM ${USER_ADDRESS_TABLE}
      WHERE user_id = $1
        AND id = $2
      RETURNING is_default
    `,
    [userId, addressId]
  );

  if (!result.rowCount || !result.rows[0].is_default) {
    return result;
  }

  const replacement = await client.query(
    `
      SELECT id
      FROM ${USER_ADDRESS_TABLE}
      WHERE user_id = $1
      ORDER BY updated_at DESC, created_at DESC, id DESC
      LIMIT 1
      FOR UPDATE
    `,
    [userId]
  );

  if (replacement.rowCount) {
    await setDefaultOnClient(client, userId, replacement.rows[0].id);
  }

  return result;
});

const hasDefault = (db, userId) => db.query(
  `
    SELECT EXISTS(
      SELECT 1
      FROM ${USER_ADDRESS_TABLE}
      WHERE user_id = $1
        AND is_default = true
    ) AS has_default
  `,
  [userId]
);

module.exports = {
  create,
  findOwnedById,
  hasDefault,
  listByUser,
  remove,
  setDefault,
  update
};
