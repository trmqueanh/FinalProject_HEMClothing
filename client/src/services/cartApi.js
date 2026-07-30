import { cartApi as cartEndpoints } from '../api/domains/cartApi';
import { orderApi } from '../api/domains/orderApi';

export const cartApi = {
  ...cartEndpoints,
  buyAgainOrderItem: orderApi.buyAgainOrderItem,
  buyAgainOrderItems: orderApi.buyAgainOrderItems
};
