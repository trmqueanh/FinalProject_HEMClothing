const { pool } = require('../config/database');

const cleanupPendingUsers = async () => {
  const result = await pool.query(
    `
      DELETE FROM users
      WHERE email_verified = false
        AND (
          email_verification_expires_at IS NULL
          OR email_verification_expires_at <= now()
        )
      RETURNING id, email
    `
  );

  console.log(`Deleted ${result.rowCount} expired pending user account(s).`);
};

cleanupPendingUsers()
  .catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
