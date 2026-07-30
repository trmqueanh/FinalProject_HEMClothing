const { Pool } = require('pg');
const { isProduction } = require('./env');

process.env.TZ = 'Asia/Ho_Chi_Minh';

const POSTGRES_ERROR_HANDLERS_ATTACHED = Symbol('postgresErrorHandlersAttached');

const formatPostgresError = error => {
  const message = String(error && error.message || 'Unknown PostgreSQL connection error')
    .replace(/\s+/g, ' ')
    .trim();
  const code = String(error && error.code || '').trim();

  return code ? `${message} (${code})` : message;
};

const attachPostgresErrorHandlers = (databasePool, logger = console) => {
  if (!databasePool || typeof databasePool.on !== 'function') {
    throw new TypeError('A PostgreSQL pool is required.');
  }

  if (databasePool[POSTGRES_ERROR_HANDLERS_ATTACHED]) {
    return databasePool;
  }

  Object.defineProperty(databasePool, POSTGRES_ERROR_HANDLERS_ATTACHED, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });

  const observedClients = new WeakSet();
  const logError = (message, error) => {
    const output = `${message}: ${formatPostgresError(error)}`;
    if (logger && typeof logger.error === 'function') {
      logger.error(output);
      return;
    }
    console.error(output);
  };

  databasePool.on('connect', client => {
    if (!client || typeof client.on !== 'function' || observedClients.has(client)) {
      return;
    }

    observedClients.add(client);
    client.on('error', error => {
      logError(
        'Unexpected PostgreSQL client error; the affected pooled connection will be discarded',
        error
      );
    });
  });

  databasePool.on('error', error => {
    logError(
      'Unexpected PostgreSQL idle pool error; the server will continue running',
      error
    );
  });

  return databasePool;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing. Add it to server/.env before starting the server.');
}

const normalizeDatabaseUrl = value => {
  try {
    const url = new URL(value);
    url.searchParams.delete('sslmode');
    return url.toString();
  } catch (_error) {
    return value;
  }
};

const pool = new Pool({
  connectionString: normalizeDatabaseUrl(databaseUrl),
  options: '-c timezone=Asia/Ho_Chi_Minh',
  max: Math.max(2, Number.parseInt(process.env.DB_POOL_MAX || '10', 10) || 10),
  idleTimeoutMillis: Math.max(10000, Number.parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10) || 30000),
  connectionTimeoutMillis: Math.max(3000, Number.parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '10000', 10) || 10000),
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  ssl: databaseUrl && /localhost|127\.0\.0\.1/.test(databaseUrl)
    ? false
    : {
        rejectUnauthorized: String(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() === 'true'
          ? true
          : !isProduction
            ? false
            : true
  }
});

attachPostgresErrorHandlers(pool);

module.exports = {
  attachPostgresErrorHandlers,
  pool
};
