const { validateRuntimeConfig } = require('./config/env');
const { pool } = require('./config/database');
const createApp = require('./app');
const { autoCompleteDeliveredOrders } = require('./controllers/orderController');
const { startBankTransferExpirationWorker } = require('./services/bankTransferExpirationService');

const port = Number(process.env.PORT || process.env.SERVER_PORT) || 3000;
const app = createApp(pool);
let httpServer = null;
let stopBankTransferExpirationWorker = null;
let stopDeliveryConfirmationWorker = null;

const startDeliveryConfirmationWorker = db => {
  const intervalMs = Math.max(15000, Number(process.env.DELIVERY_CONFIRMATION_POLL_MS || 60000));
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await autoCompleteDeliveredOrders(db);
    } catch (error) {
      console.error('Delivery confirmation worker failed:', error.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(run, intervalMs);
  timer.unref();
  run();
  return () => clearInterval(timer);
};

const startServer = async () => {
  validateRuntimeConfig();
  await pool.query('SELECT 1');
  await app.locals.warmupReady;
  stopBankTransferExpirationWorker = startBankTransferExpirationWorker(pool);
  stopDeliveryConfirmationWorker = startDeliveryConfirmationWorker(pool);

  return new Promise(resolve => {
    httpServer = app.listen(port, () => {
      console.log(`Fashion server connected to Neon PostgreSQL and started on port ${port}`);
      resolve(httpServer);
    });
  });
};

const shutdown = async signal => {
  console.log(`${signal} received. Closing the server.`);

  if (stopBankTransferExpirationWorker) {
    stopBankTransferExpirationWorker();
    stopBankTransferExpirationWorker = null;
  }

  if (stopDeliveryConfirmationWorker) {
    stopDeliveryConfirmationWorker();
    stopDeliveryConfirmationWorker = null;
  }

  if (httpServer) {
    await new Promise(resolve => httpServer.close(resolve));
  }

  await pool.end();
};

if (require.main === module) {
  startServer().catch(error => {
    console.error('Server startup failed:', error.message);
    pool.end().finally(() => process.exit(1));
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      shutdown(signal)
        .catch(error => {
          console.error('Server shutdown failed:', error.message);
          process.exitCode = 1;
        })
        .finally(() => process.exit());
    });
  }
}

module.exports = app;
module.exports.startServer = startServer;
module.exports.shutdown = shutdown;
