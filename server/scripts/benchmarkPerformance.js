const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const createApp = require('../app');
const { pool } = require('../config/database');
const { createToken } = require('../utils/authUtils');

const SAMPLE_COUNT = Math.max(1, Number.parseInt(process.env.PERF_SAMPLES || '3', 10) || 3);
const VERIFY_PRODUCT_MUTATIONS = String(process.env.PERF_VERIFY_PRODUCT_MUTATIONS || '').toLowerCase() === 'true';

const percentile = (values, ratio) => {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
};

const listen = async app => {
  if (app.locals && app.locals.warmupReady) {
    await app.locals.warmupReady;
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
};

const closeServer = server =>
  new Promise(resolve => server.close(resolve));

const measureEndpoint = async (baseUrl, token, path) => {
  const samples = [];
  let responseSize = 0;
  let status = 0;

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const startedAt = performance.now();
    const response = await fetch(`${baseUrl}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const body = await response.text();

    samples.push(Math.round(performance.now() - startedAt));
    responseSize = Buffer.byteLength(body);
    status = response.status;

    if (!response.ok) {
      throw new Error(`${path} returned ${response.status}: ${body.slice(0, 240)}`);
    }
  }

  return {
    endpoint: path,
    status,
    medianMs: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    minMs: Math.min(...samples),
    maxMs: Math.max(...samples),
    bytes: responseSize
  };
};

const verifyCartMutationSql = async userId => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const cartResult = await client.query(
      `
        INSERT INTO carts (user_id, created_at, updated_at)
        VALUES ($1, now(), now())
        ON CONFLICT (user_id) DO UPDATE
        SET user_id = EXCLUDED.user_id
        RETURNING id
      `,
      [userId]
    );
    const cartId = cartResult.rows[0].id;
    const missingItemId = randomUUID();

    await client.query(
      `
        WITH changed_item AS (
          UPDATE cart_items
          SET quantity = 2, updated_at = now()
          WHERE id = $1 AND cart_id = $2
          RETURNING id, cart_id
        ),
        touched_cart AS (
          UPDATE carts
          SET updated_at = now()
          WHERE id = (SELECT cart_id FROM changed_item)
        )
        SELECT id
        FROM changed_item
      `,
      [missingItemId, cartId]
    );

    await client.query(
      `
        WITH deleted_item AS (
          DELETE FROM cart_items
          WHERE id = $1 AND cart_id = $2
          RETURNING id, cart_id
        ),
        touched_cart AS (
          UPDATE carts
          SET updated_at = now()
          WHERE id = (SELECT cart_id FROM deleted_item)
        )
        SELECT id
        FROM deleted_item
      `,
      [missingItemId, cartId]
    );

    await client.query(
      `
        WITH deleted_items AS (
          DELETE FROM cart_items
          WHERE cart_id = $1
        )
        UPDATE carts
        SET updated_at = now()
        WHERE id = $1
      `,
      [cartId]
    );

    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const measureProductMutation = async (baseUrl, token, method, path, payload) => {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: payload ? JSON.stringify(payload) : undefined
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${method} ${path} returned ${response.status}: ${body.slice(0, 240)}`);
  }

  return {
    durationMs: Math.round(performance.now() - startedAt),
    payload: body ? JSON.parse(body) : null
  };
};

const verifyProductMutations = async (baseUrl, token, reference) => {
  const suffix = Date.now();
  const payload = {
    slug: `performance-benchmark-${suffix}`,
    name: `Performance Benchmark ${suffix}`,
    gender: reference.department_name,
    category: reference.category_slug || reference.category_name,
    collection: '',
    styleName: '',
    status: 'active',
    pricingMode: 'regular',
    price: 100000,
    originalPrice: 100000,
    salePrice: null,
    description: 'Created and removed automatically by the performance benchmark.',
    fit: 'Regular fit',
    materials: ['Cotton'],
    materialInformation: {
      title: 'ADDITIONAL MATERIAL INFORMATION',
      content: 'Temporary benchmark material information.'
    },
    colors: [{ name: 'Black', hex: '#111111', productCode: `PERF-${suffix}-BLACK` }],
    inventoryItems: [
      {
        colorName: 'Black',
        colorHex: '#111111',
        sizeLabel: 'M',
        stockQuantity: 1,
        reservedQuantity: 0,
        soldQuantity: 0,
        productCode: `PERF-${suffix}-BLACK`
      }
    ],
    productImages: []
  };
  let productId = '';
  let deleted = false;

  try {
    const created = await measureProductMutation(baseUrl, token, 'POST', '/products', payload);
    productId = String(created.payload && created.payload.id || '');
    const updated = await measureProductMutation(baseUrl, token, 'PUT', `/products/${productId}`, {
      ...payload,
      id: productId
    });
    const removed = await measureProductMutation(baseUrl, token, 'DELETE', `/products/${productId}`);
    deleted = true;

    console.table([
      { action: 'create product', durationMs: created.durationMs },
      { action: 'update product', durationMs: updated.durationMs },
      { action: 'delete product', durationMs: removed.durationMs }
    ]);
  } finally {
    if (productId && !deleted) {
      await measureProductMutation(baseUrl, token, 'DELETE', `/products/${productId}`);
    }
  }
};

const main = async () => {
  const [adminResult, userResult, productResult, referenceResult] = await Promise.all([
    pool.query("SELECT id, name, email, role FROM users WHERE LOWER(role) = 'admin' LIMIT 1"),
    pool.query("SELECT id, name, email, role FROM users WHERE LOWER(role) <> 'admin' LIMIT 1"),
    pool.query("SELECT id FROM products WHERE COALESCE(status, 'active') = 'active' AND deleted_at IS NULL LIMIT 1"),
    pool.query(`
      SELECT
        c.name AS category_name,
        c.slug AS category_slug,
        d.name AS department_name
      FROM categories c
      JOIN departments d ON d.id = c.department_id
      WHERE COALESCE(c.status, 'active') = 'active'
        AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
      LIMIT 1
    `)
  ]);
  const admin = adminResult.rows[0];
  const user = userResult.rows[0];
  const product = productResult.rows[0];
  const reference = referenceResult.rows[0];

  if (!admin || !user || !product || !reference) {
    throw new Error('Benchmark requires an admin, a customer, an active product, and an active category.');
  }

  const tokens = {
    admin: createToken(admin),
    user: createToken(user)
  };
  const server = await listen(createApp(pool));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const cases = [
    { path: '/products' },
    { path: `/products/${product.id}` },
    { path: '/landing-collections' },
    { path: '/departments' },
    { path: '/admin/dashboard?scope=summary', token: tokens.admin },
    { path: '/admin/dashboard?scope=details', token: tokens.admin },
    { path: '/admin/products?page=1&limit=10', token: tokens.admin },
    { path: '/admin/orders?page=1&limit=10', token: tokens.admin },
    { path: '/admin/inventory?page=1&limit=10', token: tokens.admin },
    { path: '/orders/history?page=1&limit=10', token: tokens.user },
    { path: '/cart', token: tokens.user },
    { path: '/auth/profile', token: tokens.user }
  ];

  try {
    const results = [];

    for (const benchmarkCase of cases) {
      results.push(await measureEndpoint(baseUrl, benchmarkCase.token, benchmarkCase.path));
    }

    await verifyCartMutationSql(user.id);
    console.table(results);
    console.log(`Cart mutation SQL verified with rollback. Samples per endpoint: ${SAMPLE_COUNT}.`);

    if (VERIFY_PRODUCT_MUTATIONS) {
      await verifyProductMutations(baseUrl, tokens.admin, reference);
      console.log('Temporary product mutation benchmark completed and cleaned up.');
    }
  } finally {
    await closeServer(server);
    await pool.end();
  }
};

main().catch(async error => {
  console.error(error.stack || error.message);
  try {
    await pool.end();
  } catch (_error) {
    // The pool may already be closed by the normal cleanup path.
  }
  process.exitCode = 1;
});
