import { authApi as authEndpoints } from '../api/domains/authApi';
import { profileApi } from '../api/domains/profileApi';

// Auth service: groups account/session calls so auth views stay focused on form flow.
export const authApi = {
  ...authEndpoints,
  getAccounts: profileApi.getAccounts
};
