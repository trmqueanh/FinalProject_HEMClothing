const { performance } = require('node:perf_hooks');
const createApp = require('../app');
const { pool } = require('../config/database');
const { createToken, hashPassword } = require('../utils/authUtils');

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

const readJson = async response => {
  const body = await response.text();

  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch (_error) {
    return body;
  }
};

const requestJson = async (baseUrl, token, method, path, body, options = {}) => {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await readJson(response);
  const durationMs = Math.round(performance.now() - startedAt);

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload && payload.message;
    throw new Error(`${method} ${path} returned ${response.status}: ${message || 'Unknown error'}`);
  }

  return {
    durationMs,
    payload,
    status: response.status
  };
};

const findBenchmarkVariant = async () => {
  const result = await pool.query(
    `
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        pi.id AS variant_id,
        pi.size_label,
        pi.color_name,
        pi.reserved_quantity
      FROM products p
      JOIN product_inventory pi ON pi.product_id = p.id
      WHERE COALESCE(p.status, 'active') = 'active'
        AND p.deleted_at IS NULL
        AND GREATEST(pi.stock_quantity - COALESCE(pi.reserved_quantity, 0), 0) >= 2
      ORDER BY p.created_at DESC, pi.created_at DESC
      LIMIT 1
    `
  );

  if (!result.rowCount) {
    throw new Error('No active product variant with at least 2 available items was found.');
  }

  return result.rows[0];
};

const createTemporaryUser = async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const result = await pool.query(
    `
      INSERT INTO users (name, email, password_hash, role, email_verified, email_verified_at, created_at, updated_at)
      VALUES ($1, $2, $3, 'user', true, now(), now(), now())
      RETURNING id, name, email, role
    `,
    [
      'Storefront Benchmark',
      `storefront-benchmark-${suffix}@hem.local`,
      hashPassword(`StorefrontBenchmark-${suffix}`)
    ]
  );

  return result.rows[0];
};

const cleanupTemporaryUser = async ({ userId, variantId, checkedOutQuantity }) => {
  if (!userId) {
    return;
  }

  await pool.query('DELETE FROM inventory_logs WHERE created_by = $1', [userId]);

  if (variantId && checkedOutQuantity > 0) {
    await pool.query(
      `
        UPDATE product_inventory
        SET reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - $2, 0),
            updated_at = now()
        WHERE id = $1
      `,
      [variantId, checkedOutQuantity]
    );
  }

  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
};

const main = async () => {
  const variant = await findBenchmarkVariant();
  const user = await createTemporaryUser();
  const token = createToken(user);
  const server = await listen(createApp(pool));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const checkoutQuantity = 1;
  let checkedOutQuantity = 0;

  try {
    const addPayload = {
      productId: variant.product_id,
      quantity: 1,
      size: variant.size_label,
      color: variant.color_name
    };
    const timings = [];

    const add = await requestJson(baseUrl, token, 'POST', '/cart/items', addPayload);
    timings.push({ action: 'add to cart', status: add.status, durationMs: add.durationMs });

    const firstLine = add.payload.items && add.payload.items[0];
    if (!firstLine) {
      throw new Error('Add to cart did not return a cart line.');
    }

    const view = await requestJson(baseUrl, token, 'GET', '/cart');
    timings.push({ action: 'view cart', status: view.status, durationMs: view.durationMs });

    const update = await requestJson(baseUrl, token, 'PUT', `/cart/items/${firstLine.cartItemId || firstLine.lineId}`, {
      quantity: 2
    });
    timings.push({ action: 'update quantity', status: update.status, durationMs: update.durationMs });

    const remove = await requestJson(baseUrl, token, 'DELETE', `/cart/items/${firstLine.cartItemId || firstLine.lineId}`);
    timings.push({ action: 'remove cart line', status: remove.status, durationMs: remove.durationMs });

    const addForCheckout = await requestJson(baseUrl, token, 'POST', '/cart/items', {
      ...addPayload,
      quantity: checkoutQuantity
    });
    timings.push({ action: 'add before checkout', status: addForCheckout.status, durationMs: addForCheckout.durationMs });
    const checkoutLine = addForCheckout.payload.items && addForCheckout.payload.items[0];

    const checkoutCart = await requestJson(baseUrl, token, 'GET', '/cart');
    timings.push({ action: 'checkout first render cart', status: checkoutCart.status, durationMs: checkoutCart.durationMs });

    const profile = await requestJson(baseUrl, token, 'GET', '/auth/profile');
    timings.push({ action: 'checkout profile deferred', status: profile.status, durationMs: profile.durationMs });

    const vouchers = await requestJson(baseUrl, token, 'GET', '/auth/vouchers');
    timings.push({ action: 'checkout vouchers deferred', status: vouchers.status, durationMs: vouchers.durationMs });

    const checkout = await requestJson(
      baseUrl,
      token,
      'POST',
      '/orders/checkout',
      {
        receiverName: 'Storefront Benchmark',
        receiverPhone: '+84901234567',
        country: 'Vietnam',
        city: 'Ho Chi Minh City',
        district: 'District 1',
        ward: 'Ben Nghe',
        addressLine: '1 Benchmark Street',
        addressLabel: 'Benchmark',
        saveAddress: false,
        updateSavedAddress: false,
        setDefaultAddress: false,
        shippingNote: '',
        paymentMethod: 'cod',
        voucherCode: '',
        cartItemIds: checkoutLine ? [checkoutLine.cartItemId || checkoutLine.lineId] : []
      },
      {
        headers: {
          'x-debug-timing': 'checkout'
        }
      }
    );
    checkedOutQuantity = checkoutQuantity;
    timings.push({
      action: 'place checkout order',
      status: checkout.status,
      durationMs: checkout.durationMs,
      backendMs: checkout.payload && checkout.payload.debugTiming
        ? Math.round(checkout.payload.debugTiming.totalMs)
        : null
    });

    console.log(`Product: ${variant.product_name} / ${variant.color_name} / ${variant.size_label}`);
    console.table(timings);
    if (checkout.payload && checkout.payload.debugTiming && Array.isArray(checkout.payload.debugTiming.steps)) {
      console.log('Checkout backend timing blocks:');
      console.table(checkout.payload.debugTiming.steps);
    }
  } finally {
    await closeServer(server);
    await cleanupTemporaryUser({
      userId: user.id,
      variantId: variant.variant_id,
      checkedOutQuantity
    });
    await pool.end();
  }
};

main().catch(async error => {
  console.error(error.stack || error.message);
  try {
    await pool.end();
  } catch (_error) {
    // ignore shutdown errors
  }
  process.exit(1);
});
