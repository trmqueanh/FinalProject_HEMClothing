import { apiClient, withFallback } from '../httpClient';

// Authenticated wishlist endpoints.
export const wishlistApi = {
  getFavorites: withFallback(async () => {
    const response = await apiClient.get('/auth/favorites');
    return response.data;
  }, null, {
    silentStatuses: [401, 403]
  }),
  toggleFavorite: withFallback(async (productId, options = {}) => {
    const colorVariantId = String(options.colorVariantId || options.color_variant_id || '').trim();
    const response = await apiClient.post(`/auth/favorites/${productId}/toggle`, colorVariantId ? { colorVariantId } : {});
    return response.data;
  }, null),
  removeFavorite: withFallback(async (productId, options = {}) => {
    const colorVariantId = String(options.colorVariantId || options.color_variant_id || '').trim();
    const response = await apiClient.delete(`/auth/favorites/${productId}`, colorVariantId ? { params: { colorVariantId } } : {});
    return response.data;
  }, null),
  clearFavorites: withFallback(async () => {
    const response = await apiClient.delete('/auth/favorites');
    return response.data;
  }, null)
};
