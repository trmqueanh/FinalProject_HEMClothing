import { apiClient, toErrorPayload, withFallback } from '../httpClient';

// Customer order history and order actions.
export const orderApi = {
  getMyOrders: withFallback(async (params = null) => {
    const response = await apiClient.get('/orders/history', params ? { params } : undefined);
    return response.data;
  }, [], {
    silentStatuses: [401, 403]
  }),
  getMyOrder: withFallback(async orderId => {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data;
  }, null, {
    silentStatuses: [401, 403, 404]
  }),
  getMyReturns: withFallback(async (params = null) => {
    const response = await apiClient.get('/orders/returns', params ? { params } : undefined);
    return response.data;
  }, { items: [] }, { silentStatuses: [401, 403] }),
  getMyReturn: withFallback(async returnRequestId => {
    const response = await apiClient.get(`/orders/returns/${returnRequestId}`);
    return response.data;
  }, null, { silentStatuses: [401, 403, 404] }),
  saveRefundAccount: withFallback(async (returnRequestId, payload = {}) => {
    const response = await apiClient.put(`/orders/returns/${returnRequestId}/refund-account`, payload);
    return response.data;
  }, null),
  saveOrderRefundAccount: withFallback(async (refundId, payload = {}) => {
    const response = await apiClient.put(`/orders/refunds/${refundId}/refund-account`, payload);
    return response.data;
  }, null),
  buyAgainOrderItem: async (orderId, orderItemId) => {
    try {
      const response = await apiClient.post(`/orders/${orderId}/items/${orderItemId}/buy-again`);
      return response.data;
    } catch (error) {
      return toErrorPayload(error);
    }
  },
  buyAgainOrderItems: async (orderId, payload = {}) => {
    try {
      const response = await apiClient.post(`/orders/${orderId}/buy-again`, payload);
      return response.data;
    } catch (error) {
      return toErrorPayload(error);
    }
  },
  confirmOrderReceived: withFallback(async orderId => {
    const response = await apiClient.put(`/orders/${orderId}/confirm-received`);
    return response.data;
  }, null),
  cancelOrder: withFallback(async (orderId, payload = {}) => {
    const response = await apiClient.put(`/orders/${orderId}/cancel`, payload);
    return response.data;
  }, null),
  requestReturn: withFallback(async (orderId, payload = {}) => {
    const response = await apiClient.post(`/orders/${orderId}/returns`, payload);
    return response.data;
  }, null)
};
