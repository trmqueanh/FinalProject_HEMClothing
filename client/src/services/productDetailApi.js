import { catalogApi } from '../api/domains/catalogApi';
import { orderApi } from '../api/domains/orderApi';
import { reviewApi } from '../api/domains/reviewApi';

// Product detail API service: size guide and review context calls for ProductDetail.vue.
export const productDetailApi = {
  createProductReview: reviewApi.createProductReview,
  getCategorySizeGuide: catalogApi.getCategorySizeGuide,
  getMyOrders: orderApi.getMyOrders,
  getMyReviews: reviewApi.getMyReviews,
  getProductReviews: reviewApi.getProductReviews,
  updateReview: reviewApi.updateReview
};
