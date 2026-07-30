import { apiClient, withFallback } from '../httpClient';

// Profile, addresses, vouchers, and saved search data.
export const profileApi = {
  getProfile: withFallback(async () => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  }, {
    user: null,
    profile: null
  }, {
    silentStatuses: [401, 403]
  }),
  updateProfile: withFallback(async payload => {
    const response = await apiClient.put('/auth/profile', payload);
    return response.data;
  }, null),
  createAddress: withFallback(async payload => {
    const response = await apiClient.post('/auth/addresses', payload);
    return response.data;
  }, null),
  updateAddress: withFallback(async (addressId, payload) => {
    const response = await apiClient.put(`/auth/addresses/${addressId}`, payload);
    return response.data;
  }, null),
  deleteAddress: withFallback(async addressId => {
    const response = await apiClient.delete(`/auth/addresses/${addressId}`);
    return response.data;
  }, null),
  setDefaultAddress: withFallback(async addressId => {
    const response = await apiClient.put(`/auth/addresses/${addressId}/default`);
    return response.data;
  }, null),
  getSearchHistory: withFallback(async () => {
    const response = await apiClient.get('/auth/search-history');
    return response.data;
  }, {
    items: []
  }, {
    silentStatuses: [401, 403]
  }),
  saveSearchHistory: withFallback(async payload => {
    const response = await apiClient.post('/auth/search-history', payload);
    return response.data;
  }, {
    item: null,
    items: []
  }),
  clearSearchHistory: withFallback(async () => {
    const response = await apiClient.delete('/auth/search-history');
    return response.data;
  }, {
    items: []
  }),
  getMyVouchers: withFallback(async () => {
    const response = await apiClient.get('/auth/vouchers');
    return response.data;
  }, {
    items: []
  }, {
    silentStatuses: [401, 403]
  }),
  getAccounts: withFallback(async () => {
    const response = await apiClient.get('/auth/accounts');
    return response.data;
  }, {
    summary: {
      total: 0,
      admins: 0,
      users: 0
    },
    accounts: []
  })
};
