import { apiClient, toErrorPayload, withFallback } from '../httpClient';

// Cart and checkout endpoints used after authentication.
export const cartApi = {
  getCart: withFallback(async () => {
    const response = await apiClient.get('/cart');
    return response.data;
  }, null, {
    silentStatuses: [401, 403]
  }),
  addCartItem: withFallback(async payload => {
    const response = await apiClient.post('/cart/items', payload);
    return response.data;
  }, null),
  updateCartItem: withFallback(async (cartItemId, payload) => {
    const response = await apiClient.put(`/cart/items/${cartItemId}`, payload);
    return response.data;
  }, null),
  removeCartItem: withFallback(async cartItemId => {
    const response = await apiClient.delete(`/cart/items/${cartItemId}`);
    return response.data;
  }, null),
  clearCart: withFallback(async () => {
    const response = await apiClient.delete('/cart');
    return response.data;
  }, null),
  checkoutOrder: withFallback(async payload => {
    const response = await apiClient.post('/orders/checkout', payload);
    return response.data;
  }, null),
  activateBankTransferPayment: withFallback(async orderId => {
    const response = await apiClient.put(`/orders/${orderId}/bank-transfer/activate`);
    return response.data;
  }, null),
  markBankTransferPaid: withFallback(async orderId => {
    const response = await apiClient.put(`/orders/${orderId}/bank-transfer/paid`);
    return response.data;
  }, null),
  expireBankTransferPayment: withFallback(async orderId => {
    const response = await apiClient.put(`/orders/${orderId}/bank-transfer/expire`);
    return response.data;
  }, null),
  getEligibleVouchers: withFallback(async payload => {
    const response = await apiClient.post('/orders/vouchers/eligible', payload);
    return response.data;
  }, {
    items: []
  }),
  validateSelectedVoucher: async payload => {
    try {
      const response = await apiClient.post('/orders/vouchers/validate', payload);
      return response.data;
    } catch (error) {
      return toErrorPayload(error);
    }
  },
  validateVoucher: async payload => {
    try {
      const response = await apiClient.post('/api/vouchers/validate', payload);
      return response.data;
    } catch (error) {
      return toErrorPayload(error);
    }
  }
};
