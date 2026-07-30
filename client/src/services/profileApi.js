import { authApi } from '../api/domains/authApi';
import { orderApi } from '../api/domains/orderApi';
import { profileApi as profileEndpoints } from '../api/domains/profileApi';
import { reviewApi } from '../api/domains/reviewApi';

// Profile API service: all account, order, review, voucher, address calls used by Profile.vue.
export const profileApi = {
  ...profileEndpoints,
  ...orderApi,
  ...reviewApi,
  changePassword: authApi.changePassword
};
