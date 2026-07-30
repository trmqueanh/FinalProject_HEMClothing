import { adminApi } from '../api/domains/adminApi';
import { catalogApi } from '../api/domains/catalogApi';

// Admin product service: keeps create/edit pages away from raw API helper calls.
export const adminProductApi = {
  getProduct: adminApi.getAdminProduct,
  createProduct: catalogApi.createProduct,
  updateProduct: catalogApi.updateProduct
};
