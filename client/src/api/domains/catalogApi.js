import { apiClient, withFallback } from '../httpClient';

const categorySizeGuideCache = new Map();
const categorySizeGuideRequests = new Map();

const getCategorySizeGuide = withFallback(async categoryId => {
  const cacheKey = String(categoryId || '').trim();
  if (!cacheKey) return null;

  if (categorySizeGuideCache.has(cacheKey)) {
    return categorySizeGuideCache.get(cacheKey);
  }

  if (categorySizeGuideRequests.has(cacheKey)) {
    return categorySizeGuideRequests.get(cacheKey);
  }

  const request = apiClient
    .get(`/api/size-guides/category/${cacheKey}`)
    .then(response => {
      categorySizeGuideCache.set(cacheKey, response.data);
      return response.data;
    })
    .finally(() => {
      categorySizeGuideRequests.delete(cacheKey);
    });

  categorySizeGuideRequests.set(cacheKey, request);
  return request;
}, null, {
  silentStatuses: [404]
});

// Storefront catalog data and product CRUD endpoints.
export const catalogApi = {
  getPublicVouchers: withFallback(async () => {
    const response = await apiClient.get('/api/vouchers');
    return response.data;
  }, {
    items: []
  }, {
    silentNetwork: true
  }),
  getCollections: withFallback(async () => {
    const response = await apiClient.get('/collections');
    return response.data;
  }, []),
  getLandingCollections: withFallback(async () => {
    const response = await apiClient.get('/landing-collections');
    return response.data;
  }, []),
  getCategories: withFallback(async () => {
    const response = await apiClient.get('/categories');
    return response.data;
  }, []),
  getMaterials: withFallback(async params => {
    const response = await apiClient.get('/materials', params ? { params } : undefined);
    return response.data;
  }, {
    items: []
  }, { silentNetwork: true }),
  getCategorySizeGuide,
  getDepartments: withFallback(async () => {
    const response = await apiClient.get('/departments');
    return response.data;
  }, []),
	  getProducts: withFallback(async () => {
	    const response = await apiClient.get('/products');
	    return response.data;
	  }, []),
	  searchProducts: withFallback(async params => {
	    const response = await apiClient.get('/products/search', { params });
	    return response.data;
	  }, {
	    products: [],
	    totalCount: 0,
	    availableFilters: {},
	    activeFilters: {}
	  }),
	  getProduct: withFallback(async id => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  }, null),
  deleteProduct: withFallback(async id => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  }, null, { showStatusCode: false }),
  createProduct: withFallback(async payload => {
    const response = await apiClient.post('/products', payload);
    return response.data;
  }, null),
  updateProduct: withFallback(async payload => {
    const response = await apiClient.put(`/products/${payload.id}`, payload);
    return response.data;
  }, null, { showStatusCode: false }),
  uploadProductImage: withFallback(async (productId, formData) => {
    const response = await apiClient.post(`/products/${productId}/images`, formData);
    return response.data;
  }, null),
  syncProductImages: withFallback(async (productId, payload) => {
    const response = await apiClient.put(`/products/${productId}/images`, payload);
    return response.data;
  }, null)
};
