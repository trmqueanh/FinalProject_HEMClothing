import { getVietnamCurrentYear } from '../../helpers/dateTime';
import { apiClient, withFallback } from '../httpClient';

const createPaginatedFallback = () => ({
  items: [],
  pagination: {
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1
  }
});

// Admin dashboard, catalog, account, order, voucher, and inventory endpoints.
export const adminApi = {
  getAdminNotifications: withFallback(async (params = null) => {
    const response = await apiClient.get('/admin/notifications', params ? { params } : undefined);
    return response.data;
  }, {
    items: null,
    totalActions: 0,
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 1
    }
  }, { silentNetwork: true }),
  getAdminDashboard: withFallback(async (params = null) => {
    const response = await apiClient.get('/admin/dashboard', params ? { params } : undefined);
    return response.data;
  }, {
    metrics: {
      products: 0,
      stockProducts: 0,
      categories: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      users: 0,
      admins: 0,
      orders: 0,
      completedOrders: 0,
      revenue: 0,
      ordersTableReady: false
    },
    recentProducts: [],
    recentUsers: [],
    recentOrders: [],
    orderTrend: [],
    orderStatusSummary: [],
    topProducts: [],
    topBuyers: [],
    year: getVietnamCurrentYear(),
    recentOrdersPagination: {
      page: 1,
      limit: 5,
      totalItems: 0,
      totalPages: 1
    },
    topProductsPagination: {
      page: 1,
      limit: 5,
      totalItems: 0,
      totalPages: 1
    },
    topBuyersPagination: {
      page: 1,
      limit: 5,
      totalItems: 0,
      totalPages: 1
    }
  }, { silentNetwork: true }),
  getAdminProducts: withFallback(async (params = null) => {
    const response = await apiClient.get('/admin/products', params ? { params } : undefined);
    return response.data;
  }, createPaginatedFallback, { silentNetwork: true }),
  getAdminProduct: withFallback(async productId => {
    const response = await apiClient.get(`/admin/products/${productId}`);
    return response.data;
  }, null),
  updateAdminProductStatus: withFallback(async (productId, status) => {
    const response = await apiClient.patch(`/admin/products/${productId}/status`, { status });
    return response.data;
  }, null),
  getAdminProductReviews: withFallback(async (params = null) => {
    const response = await apiClient.get('/admin/product-reviews', params ? { params } : undefined);
    return response.data;
  }, createPaginatedFallback, { silentNetwork: true }),
  updateAdminProductReviewReply: withFallback(async (reviewId, adminReply) => {
    const response = await apiClient.put(`/admin/product-reviews/${reviewId}/reply`, { adminReply });
    return response.data;
  }, null),
  deleteAdminProductReviewReply: withFallback(async reviewId => {
    const response = await apiClient.delete(`/admin/product-reviews/${reviewId}/reply`);
    return response.data;
  }, null),
  getAdminProductGroups: withFallback(async () => {
    const response = await apiClient.get('/admin/product-groups');
    return response.data;
  }, {
    items: []
  }, { silentNetwork: true }),
  getAdminStyles: withFallback(async () => {
    const response = await apiClient.get('/admin/styles');
    return response.data;
  }, {
    items: []
  }, { silentNetwork: true }),
  getAdminFits: withFallback(async () => {
    const response = await apiClient.get('/admin/fits');
    return response.data;
  }, {
    items: []
  }, { silentNetwork: true }),
  getAdminMaterials: withFallback(async () => {
    const response = await apiClient.get('/admin/materials');
    return response.data;
  }, {
    items: []
  }, { silentNetwork: true }),
  getAdminCategories: withFallback(async (params = null) => {
    const response = await apiClient.get('/admin/categories', params ? { params } : undefined);
    return response.data;
  }, createPaginatedFallback, { silentNetwork: true }),
  getAdminCategory: withFallback(async categoryId => {
    const response = await apiClient.get(`/admin/categories/${categoryId}`);
    return response.data;
  }, null),
  getAdminCollections: withFallback(async (params = null) => {
    const response = await apiClient.get('/admin/collections', params ? { params } : undefined);
    return response.data;
  }, createPaginatedFallback, { silentNetwork: true }),
  getAdminCollection: withFallback(async collectionId => {
    const response = await apiClient.get(`/admin/collections/${collectionId}`);
    return response.data;
  }, null),
  createAdminCategory: withFallback(async payload => {
    const response = await apiClient.post('/admin/categories', payload);
    return response.data;
  }, null),
  updateAdminCategory: withFallback(async (categoryId, payload) => {
    const response = await apiClient.put(`/admin/categories/${categoryId}`, payload);
    return response.data;
  }, null),
  updateAdminCategoryStatus: withFallback(async (categoryId, status) => {
    const response = await apiClient.patch(`/admin/categories/${categoryId}/status`, { status });
    return response.data;
  }, null),
  deleteAdminCategory: withFallback(async categoryId => {
    const response = await apiClient.delete(`/admin/categories/${categoryId}`);
    return response.data;
  }, null),
  createAdminCollection: withFallback(async payload => {
    const response = await apiClient.post('/admin/collections', payload);
    return response.data;
  }, null),
  updateAdminCollection: withFallback(async (collectionId, payload) => {
    const response = await apiClient.put(`/admin/collections/${collectionId}`, payload);
    return response.data;
  }, null),
  updateAdminCollectionStatus: withFallback(async (collectionId, status) => {
    const response = await apiClient.patch(`/admin/collections/${collectionId}/status`, { status });
    return response.data;
  }, null),
  deleteAdminCollection: withFallback(async collectionId => {
    const response = await apiClient.delete(`/admin/collections/${collectionId}`);
    return response.data;
  }, null),
  getAdminAccounts: withFallback(async (params = null) => {
    const response = await apiClient.get('/admin/accounts', params ? { params } : undefined);
    return response.data;
  }, {
    summary: {
      total: 0,
      admins: 0,
      users: 0
    },
    items: [],
    accounts: [],
    pagination: createPaginatedFallback().pagination
  }, { silentNetwork: true }),
  getAdminCustomer: withFallback(async (customerId, params = null) => {
    const response = await apiClient.get(
      `/admin/accounts/${customerId}`,
      params ? { params } : undefined
    );
    return response.data;
  }, null),
  getAdminCustomerOrders: withFallback(async (customerId, params = null) => {
    const response = await apiClient.get(
      `/admin/accounts/${customerId}/orders`,
      params ? { params } : undefined
    );
    return response.data;
  }, null),
  deleteAdminAccount: withFallback(async accountId => {
    const response = await apiClient.delete(`/admin/accounts/${accountId}`);
    return response.data;
  }, null),
  updateAdminAccountStatus: withFallback(async (accountId, status) => {
    const response = await apiClient.patch(`/admin/accounts/${accountId}/status`, { status });
    return response.data;
  }, null),
  getAdminOrders: withFallback(async (params = null) => {
    const response = await apiClient.get('/admin/orders', params ? { params } : undefined);
    return response.data;
  }, [], { silentNetwork: true }),
  getAdminOrder: withFallback(async orderId => {
    const response = await apiClient.get(`/admin/orders/${orderId}`);
    return response.data;
  }, null),
  updateAdminOrder: withFallback(async (orderId, payload) => {
    const response = await apiClient.put(`/admin/orders/${orderId}`, payload);
    return response.data;
  }, null),
  cancelAdminOrder: withFallback(async (orderId, payload = {}) => {
    const response = await apiClient.put(`/admin/orders/${orderId}/cancel`, payload);
    return response.data;
  }, null),
  markAdminDeliveryFailed: withFallback(async (orderId, payload = {}) => {
    const response = await apiClient.put(`/admin/orders/${orderId}/delivery-failed`, payload);
    return response.data;
  }, null),
  markAdminReturnedToWarehouse: withFallback(async (orderId, payload = {}) => {
    const response = await apiClient.put(`/admin/orders/${orderId}/returned-to-warehouse`, payload);
    return response.data;
  }, null),
  getAdminBankTransferPayments: withFallback(async (params = null) => {
    const response = await apiClient.get('/admin/bank-transfer-payments', params ? { params } : undefined);
    return response.data;
  }, {
    items: []
  }, { silentNetwork: true }),
  confirmAdminBankTransferPayment: withFallback(async (orderId, payload = {}) => {
    const response = await apiClient.put(`/admin/bank-transfer-payments/${orderId}/confirm`, payload);
    return response.data;
  }, null),
  rejectAdminBankTransferPayment: withFallback(async (orderId, payload = {}) => {
    const response = await apiClient.put(`/admin/bank-transfer-payments/${orderId}/reject`, payload);
    return response.data;
  }, null),
  getAdminReturnRequests: withFallback(async (params = null) => {
    const response = await apiClient.get('/admin/return-requests', params ? { params } : undefined);
    return response.data;
  }, {
    items: []
  }, { silentNetwork: true }),
  getAdminReturnRequest: withFallback(async returnRequestId => {
    const response = await apiClient.get(`/admin/return-requests/${returnRequestId}`);
    return response.data;
  }, null),
  approveAdminReturnRequest: withFallback(async (returnRequestId, payload = {}) => {
    const response = await apiClient.put(`/admin/return-requests/${returnRequestId}/approve`, payload);
    return response.data;
  }, null),
  rejectAdminReturnRequest: withFallback(async (returnRequestId, payload = {}) => {
    const response = await apiClient.put(`/admin/return-requests/${returnRequestId}/reject`, payload);
    return response.data;
  }, null),
  receiveAdminReturnRequest: withFallback(async (returnRequestId, payload = {}) => {
    const response = await apiClient.put(`/admin/return-requests/${returnRequestId}/received`, payload);
    return response.data;
  }, null),
  startAdminReturnInspection: withFallback(async (returnRequestId, payload = {}) => {
    const response = await apiClient.put(`/admin/return-requests/${returnRequestId}/inspect/start`, payload);
    return response.data;
  }, null),
  inspectAdminReturnRequest: withFallback(async (returnRequestId, payload = {}) => {
    const response = await apiClient.put(`/admin/return-requests/${returnRequestId}/inspect`, payload);
    return response.data;
  }, null),
  getAdminRefundRequests: withFallback(async (params = null) => {
    const response = await apiClient.get('/admin/refunds', params ? { params } : undefined);
    return response.data;
  }, {
    items: []
  }, { silentNetwork: true }),
  startAdminRefund: withFallback(async (refundId, payload = {}) => {
    const response = await apiClient.put(`/admin/refunds/${refundId}/processing`, payload);
    return response.data;
  }, null),
  completeAdminRefund: withFallback(async (refundId, payload = {}) => {
    const response = await apiClient.put(`/admin/refunds/${refundId}/complete`, payload);
    return response.data;
  }, null),
  failAdminRefund: withFallback(async (refundId, payload = {}) => {
    const response = await apiClient.put(`/admin/refunds/${refundId}/fail`, payload);
    return response.data;
  }, null),
  retryAdminRefund: withFallback(async (refundId, payload = {}) => {
    const response = await apiClient.put(`/admin/refunds/${refundId}/retry`, payload);
    return response.data;
  }, null),
  getAdminVouchers: withFallback(async (params = null) => {
    const response = await apiClient.get('/admin/vouchers', params ? { params } : undefined);
    return response.data;
  }, createPaginatedFallback, { silentNetwork: true }),
  getAdminVoucher: withFallback(async voucherId => {
    const response = await apiClient.get(`/admin/vouchers/${voucherId}`);
    return response.data;
  }, null),
  createAdminVoucher: withFallback(async payload => {
    const response = await apiClient.post('/admin/vouchers', payload);
    return response.data;
  }, null),
  updateAdminVoucher: withFallback(async (voucherId, payload) => {
    const response = await apiClient.put(`/admin/vouchers/${voucherId}`, payload);
    return response.data;
  }, null),
  deleteAdminVoucher: withFallback(async voucherId => {
    const response = await apiClient.delete(`/admin/vouchers/${voucherId}`);
    return response.data;
  }, null),
  getAdminInventory: withFallback(async (params = null) => {
    const response = await apiClient.get('/admin/inventory', params ? { params } : undefined);
    return response.data;
  }, {
    items: [],
    logs: [],
    stats: {
      totalProducts: 0,
      inStockProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0
    },
    pagination: createPaginatedFallback().pagination
  }, { silentNetwork: true }),
  getAdminInventoryHistory: withFallback(async variantId => {
    const response = await apiClient.get(`/admin/inventory/${variantId}/history`);
    return response.data;
  }, null),
  importAdminInventory: withFallback(async payload => {
    const response = await apiClient.post('/admin/inventory/import', payload);
    return response.data;
  }, null)
};
