import { adminApi as adminEndpoints } from '../api/domains/adminApi';
import { catalogApi } from '../api/domains/catalogApi';
import { profileApi } from '../api/domains/profileApi';

export const adminApi = {
  ...adminEndpoints,
  deleteProduct: catalogApi.deleteProduct,
  getAccounts: profileApi.getAccounts
};
