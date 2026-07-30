const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const productController = require('./controllers/productController');
const reviewRoutes = require('./routes/reviewRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const securityHeaders = require('./middleware/securityHeaders');
const { getCorsOrigins, isProduction } = require('./config/env');

const createApp = pool => {
  const app = express();
  const allowedOrigins = getCorsOrigins();

  app.disable('x-powered-by');
  app.set('trust proxy', isProduction ? 1 : false);
  app.use(securityHeaders);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(String(origin).replace(/\/+$/, ''))) {
        return callback(null, true);
      }

      const error = new Error('Origin is not allowed by CORS.');
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true
  }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(path.resolve(__dirname, 'public/uploads')));

  // All controllers read the PostgreSQL pool from app.locals.db.
  app.locals.db = pool;

  app.locals.warmupReady = Promise.allSettled([
    pool.query('SELECT 1'),
    typeof productController.warmProductListCache === 'function'
      ? productController.warmProductListCache(pool)
      : Promise.resolve()
  ]).catch(() => {});

  app.get('/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      return res.json({
        status: 'ok',
        database: 'connected'
      });
    } catch (_error) {
      return res.status(503).json({
        status: 'error',
        database: 'unavailable'
      });
    }
  });

  app.get('/', (req, res) => {
    res.json({
      name: 'HEM. Catalog API',
      message: 'Editorial fashion storefront data service is running on Neon PostgreSQL.',
      endpoints: [
        '/auth/register',
        '/auth/login',
        '/auth/email/verify',
        '/auth/me',
        '/cart',
        '/collections',
        '/landing-collections',
        '/products',
        '/products/:productId'
      ]
    });
  });

  app.use(authRoutes);
  app.use(adminRoutes);
  app.use(cartRoutes);
  app.use(orderRoutes);
  app.use(productRoutes);
  app.use(reviewRoutes);
  app.use(voucherRoutes);

  app.use((req, res) => {
    res.status(404).json({
      message: `${req.originalUrl} not found`
    });
  });

  app.use(errorMiddleware);

  return app;
};

module.exports = createApp;
