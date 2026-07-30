const { pool } = require('../config/database');
const { hashPassword } = require('../utils/authUtils');

const shouldApply = process.argv.includes('--apply');

const migrateLegacyPasswords = async () => {
  const result = await pool.query(
    `
      SELECT id, password_hash
      FROM users
      WHERE password_hash NOT LIKE 'scrypt$%'
      ORDER BY id
    `
  );

  if (!shouldApply) {
    console.log(`Legacy password rows found: ${result.rowCount}. Run with --apply to migrate them.`);
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const account of result.rows) {
      await client.query(
        `
          UPDATE users
          SET password_hash = $2,
              updated_at = now()
          WHERE id = $1
            AND password_hash = $3
        `,
        [account.id, hashPassword(account.password_hash), account.password_hash]
      );
    }

    await client.query('COMMIT');
    console.log(`Migrated ${result.rowCount} legacy password rows to scrypt.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

migrateLegacyPasswords()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
