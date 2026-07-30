const SEARCH_HISTORY_TABLE = 'search_history';

const listByUser = (db, userId, limit = 10) => db.query(
  `
    SELECT id, keyword, created_at
    FROM ${SEARCH_HISTORY_TABLE}
    WHERE user_id = $1
    ORDER BY created_at DESC, id DESC
    LIMIT $2
  `,
  [userId, limit]
);

const save = async (db, userId, keyword, maxItems = 12) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `
        DELETE FROM ${SEARCH_HISTORY_TABLE}
        WHERE user_id = $1
          AND LOWER(keyword) = LOWER($2)
      `,
      [userId, keyword]
    );
    const insertResult = await client.query(
      `
        INSERT INTO ${SEARCH_HISTORY_TABLE} (user_id, keyword, created_at)
        VALUES ($1, $2, now())
        RETURNING id, keyword, created_at
      `,
      [userId, keyword]
    );
    await client.query(
      `
        DELETE FROM ${SEARCH_HISTORY_TABLE}
        WHERE user_id = $1
          AND id NOT IN (
            SELECT id
            FROM ${SEARCH_HISTORY_TABLE}
            WHERE user_id = $1
            ORDER BY created_at DESC, id DESC
            LIMIT $2
          )
      `,
      [userId, maxItems]
    );
    const listResult = await listByUser(client, userId, maxItems);
    await client.query('COMMIT');

    return {
      row: insertResult.rows[0],
      rows: listResult.rows
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const clear = (db, userId) => db.query(
  `DELETE FROM ${SEARCH_HISTORY_TABLE} WHERE user_id = $1`,
  [userId]
);

module.exports = {
  clear,
  listByUser,
  save
};
