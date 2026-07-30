import { apiClient, withFallback } from '../httpClient';

// Customer and product review endpoints.
export const reviewApi = {
  getMyReviews: withFallback(async () => {
    const response = await apiClient.get('/api/account/reviews');
    return response.data;
  }, {
    items: []
  }, {
    silentStatuses: [401, 403]
  }),
  getProductReviews: withFallback(async productId => {
    const response = await apiClient.get(`/api/products/${productId}/reviews`);
    return response.data;
  }, {
    averageRating: 0,
    reviewCount: 0,
    items: []
  }),
  createProductReview: withFallback(async (productId, payload) => {
    const response = await apiClient.post(`/api/products/${productId}/reviews`, payload);
    return response.data;
  }, null),
  updateReview: withFallback(async (reviewId, payload) => {
    const response = await apiClient.put(`/api/reviews/${reviewId}`, payload);
    return response.data;
  }, null),
  deleteReview: withFallback(async reviewId => {
    const response = await apiClient.delete(`/api/reviews/${reviewId}`);
    return response.data;
  }, null)
};
