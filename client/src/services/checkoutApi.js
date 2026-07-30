import { cartApi } from '../api/domains/cartApi';
import { profileApi } from '../api/domains/profileApi';

// Checkout API service: profile preload, vouchers, and manual bank transfer payment actions.
export const checkoutApi = {
  getEligibleVouchers: cartApi.getEligibleVouchers,
  getProfile: profileApi.getProfile,
  activateBankTransferPayment: cartApi.activateBankTransferPayment,
  markBankTransferPaid: cartApi.markBankTransferPaid,
  expireBankTransferPayment: cartApi.expireBankTransferPayment,
  updateProfile: profileApi.updateProfile,
  validateVoucher: cartApi.validateSelectedVoucher
};
