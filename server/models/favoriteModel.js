const COLOR_VARIANT_TABLE = 'product_color_variants';
const FAVORITE_TABLE = 'user_favorites';
const USER_TABLE = 'users';

const serializeKey = row => {
  const productId = String(row && row.product_id || '').trim();
  const colorVariantId = String(row && row.color_variant_id || '').trim();

  if (!productId) return '';
  return colorVariantId ? `${productId}:${colorVariantId}` : productId;
};

const listIds = async (db, userId) => {
  const result = await db.query(
    `
      SELECT product_id, color_variant_id
      FROM ${FAVORITE_TABLE}
      WHERE user_id = $1
      ORDER BY created_at DESC, product_id ASC
    `,
    [userId]
  );

  return [...new Set(result.rows.map(serializeKey).filter(Boolean))];
};

const isValidColorVariant = async (db, productId, colorVariantId) => {
  const result = await db.query(
    `
      SELECT 1
      FROM ${COLOR_VARIANT_TABLE}
      WHERE id = $1
        AND product_id = $2
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [colorVariantId, productId]
  );

  return result.rowCount > 0;
};

const touchUser = (db, userId) => db.query(
  `
    UPDATE ${USER_TABLE}
    SET updated_at = now()
    WHERE id = $1
  `,
  [userId]
);

const toggle = async (db, userId, productId, colorVariantId) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `
        SELECT 1
        FROM ${FAVORITE_TABLE}
        WHERE user_id = $1
          AND product_id = $2
          AND color_variant_id IS NOT DISTINCT FROM $3::uuid
        LIMIT 1
        FOR UPDATE
      `,
      [userId, productId, colorVariantId || null]
    );
    const shouldAddFavorite = existing.rowCount === 0;

    if (shouldAddFavorite) {
      await client.query(
        `
          INSERT INTO ${FAVORITE_TABLE} (user_id, product_id, color_variant_id, created_at)
          VALUES ($1, $2, $3::uuid, now())
          ON CONFLICT DO NOTHING
        `,
        [userId, productId, colorVariantId || null]
      );
    } else {
      await client.query(
        `
          DELETE FROM ${FAVORITE_TABLE}
          WHERE user_id = $1
            AND product_id = $2
            AND color_variant_id IS NOT DISTINCT FROM $3::uuid
        `,
        [userId, productId, colorVariantId || null]
      );
    }

    await touchUser(client, userId);
    const ids = await listIds(client, userId);
    await client.query('COMMIT');

    return {
      ids,
      isFavorite: ids.includes(serializeKey({ product_id: productId, color_variant_id: colorVariantId }))
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const remove = async (db, userId, productId, colorVariantId) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `
        DELETE FROM ${FAVORITE_TABLE}
        WHERE user_id = $1
          AND product_id = $2
          AND color_variant_id IS NOT DISTINCT FROM $3::uuid
      `,
      [userId, productId, colorVariantId || null]
    );
    await touchUser(client, userId);
    const ids = await listIds(client, userId);
    await client.query('COMMIT');
    return ids;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const clear = async (db, userId) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM ${FAVORITE_TABLE} WHERE user_id = $1`,
      [userId]
    );
    await touchUser(client, userId);
    await client.query('COMMIT');
    return [];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  clear,
  isValidColorVariant,
  listIds,
  remove,
  toggle
};
