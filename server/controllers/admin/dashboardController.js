const dashboardModel = require('../../models/dashboardModel');

const DASHBOARD_CACHE_TTL_MS = 15000;
const DASHBOARD_LIMIT = 5;
const dashboardResponseCache = new Map();
const dashboardResponsePromises = new Map();
let dashboardCacheGeneration = 0;

const invalidateDashboardCache = () => {
  dashboardCacheGeneration += 1;
  dashboardResponseCache.clear();
  dashboardResponsePromises.clear();
};

const getCachedDashboardResponse = key => {
  const cached = dashboardResponseCache.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    dashboardResponseCache.delete(key);
    return null;
  }
  return cached.payload;
};

const setCachedDashboardResponse = (key, payload) => {
  dashboardResponseCache.set(key, {
    expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
    payload
  });
  return payload;
};

const getOrCreateDashboardResponsePromise = (key, producer) => {
  const existingPromise = dashboardResponsePromises.get(key);
  if (existingPromise) return existingPromise;

  const generation = dashboardCacheGeneration;
  const promise = Promise.resolve()
    .then(producer)
    .then(payload => {
      if (generation === dashboardCacheGeneration) {
        setCachedDashboardResponse(key, payload);
      }
      return payload;
    })
    .finally(() => {
      if (dashboardResponsePromises.get(key) === promise) {
        dashboardResponsePromises.delete(key);
      }
    });
  dashboardResponsePromises.set(key, promise);
  return promise;
};

const warmDashboardResponse = (key, producer) => {
  if (getCachedDashboardResponse(key) || dashboardResponsePromises.has(key)) return;
  getOrCreateDashboardResponsePromise(key, producer).catch(() => {});
};

const rowsFrom = value => Array.isArray(value) ? value : [];

const createDashboardController = ({
  LOW_STOCK_THRESHOLD,
  buildPaginationPayload,
  getDb,
  sendError,
  serializeOrderTrendPoint,
  serializeRecentOrder,
  toInteger
}) => async (req, res) => {
  try {
    const db = getDb(req);
    const recentOrderPage = Math.max(1, Number.parseInt(req.query.recentOrderPage, 10) || 1);
    const buyerPage = Math.max(1, Number.parseInt(req.query.buyerPage, 10) || 1);
    const topProductPage = Math.max(1, Number.parseInt(req.query.topProductPage, 10) || 1);
    const currentYear = new Date().getFullYear();
    const requestedYear = Number.parseInt(req.query.year, 10);
    const dashboardYear = Number.isFinite(requestedYear)
      ? Math.min(Math.max(requestedYear, 2020), currentYear + 1)
      : currentYear;
    const requestedScope = String(req.query.scope || 'summary').trim().toLowerCase();
    const scope = requestedScope === 'details' ? 'details' : 'summary';
    const recentOrderOffset = (recentOrderPage - 1) * DASHBOARD_LIMIT;
    const buyerOffset = (buyerPage - 1) * DASHBOARD_LIMIT;
    const topProductOffset = (topProductPage - 1) * DASHBOARD_LIMIT;
    const cacheSuffix = [dashboardYear, recentOrderPage, buyerPage, topProductPage].join(':');
    const cacheKey = `admin-dashboard:${scope}:${cacheSuffix}`;
    const detailsCacheKey = `admin-dashboard:details:${cacheSuffix}`;

    const loadDetailsResponse = async () => {
      const row = await dashboardModel.loadDetailsRow(db, {
        year: dashboardYear,
        limit: DASHBOARD_LIMIT,
        recentOrderOffset,
        topProductOffset,
        buyerOffset
      });
      const topProductsByGender = rowsFrom(row.top_products_by_gender).reduce(
        (groups, item) => {
          const gender = String(item.gender || '').toLowerCase();
          if (!Object.prototype.hasOwnProperty.call(groups, gender)) return groups;
          groups[gender].push({
            productId: String(item.product_id || ''),
            productName: String(item.product_name || ''),
            quantitySold: Number(item.quantity_sold || 0),
            revenue: Number(item.revenue || 0)
          });
          return groups;
        },
        { women: [], men: [] }
      );

      return {
        scope: 'details',
        range: 'year',
        year: dashboardYear,
        recentOrders: rowsFrom(row.recent_orders).map(serializeRecentOrder),
        orderTrend: rowsFrom(row.order_trend).map(serializeOrderTrendPoint),
        orderStatusSummary: rowsFrom(row.order_status_summary).map(item => ({
          status: String(item.order_status || ''),
          count: Number(item.count || 0)
        })),
        topProducts: rowsFrom(row.top_products).map(item => ({
          productId: String(item.product_id || ''),
          productName: String(item.product_name || ''),
          quantitySold: Number(item.quantity_sold || 0),
          revenue: Number(item.revenue || 0)
        })),
        topProductsByGender,
        topBuyers: rowsFrom(row.top_buyers).map(item => ({
          id: String(item.id || ''),
          name: String(item.name || ''),
          email: String(item.email || ''),
          orderCount: Number(item.order_count || 0),
          totalSpent: Number(item.total_spent || 0)
        })),
        recentOrdersPagination: buildPaginationPayload(
          { page: recentOrderPage, limit: DASHBOARD_LIMIT },
          row.recent_orders_total
        ),
        topBuyersPagination: buildPaginationPayload(
          { page: buyerPage, limit: DASHBOARD_LIMIT },
          row.top_buyers_total
        ),
        topProductsPagination: buildPaginationPayload(
          { page: topProductPage, limit: DASHBOARD_LIMIT },
          row.top_products_total
        )
      };
    };

    const cachedResponse = getCachedDashboardResponse(cacheKey);
    if (cachedResponse) {
      if (scope === 'summary') warmDashboardResponse(detailsCacheKey, loadDetailsResponse);
      return res.json(cachedResponse);
    }

    if (scope === 'details') {
      const payload = await getOrCreateDashboardResponsePromise(cacheKey, loadDetailsResponse);
      return res.json(payload);
    }

    const rows = await dashboardModel.loadSummaryRows(db, LOW_STOCK_THRESHOLD);
    const summaryPayload = setCachedDashboardResponse(cacheKey, {
      scope: 'summary',
      range: 'year',
      year: dashboardYear,
      metrics: {
        products: toInteger(rows.products.total_products),
        stockProducts: toInteger(rows.products.stock_products),
        categories: toInteger(rows.categories.total_categories),
        lowStockProducts: toInteger(rows.products.low_stock_products),
        outOfStockProducts: toInteger(rows.products.out_of_stock_products),
        users: toInteger(rows.users.total_users),
        admins: toInteger(rows.users.total_admins),
        orders: toInteger(rows.orders.total_orders),
        completedOrders: toInteger(rows.orders.completed_orders),
        revenue: Number(rows.orders.total_revenue || 0),
        refundRequests: toInteger(rows.refunds.pending_refunds),
        ordersTableReady: true
      }
    });

    warmDashboardResponse(detailsCacheKey, loadDetailsResponse);
    return res.json(summaryPayload);
  } catch (error) {
    return sendError(res, error);
  }
};

createDashboardController.invalidateDashboardCache = invalidateDashboardCache;

module.exports = createDashboardController;
