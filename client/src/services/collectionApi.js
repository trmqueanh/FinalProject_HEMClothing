import { catalogApi } from '../api/domains/catalogApi';

export const collectionApi = {
  getCollections: catalogApi.getCollections,
  getLandingCollections: catalogApi.getLandingCollections,
  getCategories: catalogApi.getCategories,
  getDepartments: catalogApi.getDepartments
};
