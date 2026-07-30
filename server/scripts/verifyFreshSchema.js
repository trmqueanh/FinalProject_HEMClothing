require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { pool } = require('../config/database');

const schemaFiles = [
  'users.sql',
  'user_profiles.sql',
  'user_addresses.sql',
  'departments.sql',
  'product_groups.sql',
  'categories.sql',
  'collections.sql',
  'fits.sql',
  'styles.sql',
  'materials.sql',
  'products.sql',
  'product_color_variants.sql',
  'product_inventory.sql',
  'inventory_logs.sql',
  'product_images.sql',
  'orders.sql',
  'order_items.sql',
  'product_sales_counters.sql',
  'order_status_history.sql',
  'return_requests.sql',
  'return_items.sql',
  'refunds.sql',
  'carts.sql',
  'cart_items.sql',
  'product_reviews.sql',
  'user_favorites.sql',
  'vouchers.sql',
  'homepage_sections.sql',
  'homepage_section_items.sql',
  'search_history.sql',
  'supporting_tables.sql',
  'transactional_email_logs.sql',
  'landing_collections.sql'
];

const main = async () => {
  const client = await pool.connect();
  const schemaName = `verify_${randomUUID().replaceAll('-', '')}`;
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    await client.query(`SET LOCAL search_path TO "${schemaName}", public`);
    for (const fileName of schemaFiles) {
      const sql = await fs.readFile(path.join(__dirname, '..', '..', 'database', 'schema', fileName), 'utf8');
      await client.query(sql);
    }
    const result = await client.query(
      `
        SELECT
          to_regclass($1) IS NOT NULL AS orders,
          to_regclass($2) IS NOT NULL AS return_items,
          to_regclass($3) IS NOT NULL AS refunds,
          to_regclass($4) IS NOT NULL AS email_logs
      `,
      [
        `${schemaName}.orders`,
        `${schemaName}.return_items`,
        `${schemaName}.refunds`,
        `${schemaName}.transactional_email_logs`
      ]
    );
    if (Object.values(result.rows[0]).some(value => value !== true)) {
      throw new Error('Fresh schema verification did not create every required commerce table.');
    }
    console.log(JSON.stringify({ freshSchema: true, filesExecuted: schemaFiles.length, requiredTables: result.rows[0] }));
    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
