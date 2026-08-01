// Checkout required fields: used by form validation before placing an order.
export const REQUIRED_CHECKOUT_FIELDS = ['receiverName', 'phoneLocalNumber', 'city', 'district', 'ward', 'addressLine'];

// Default checkout form: creates a fresh object whenever checkout resets state.
export const createDefaultCheckoutForm = () => ({
  addressId: '',
  receiverName: '',
  receiverPhone: '',
  phoneCountryCode: '+84',
  phoneLocalNumber: '',
  country: 'Vietnam',
  city: '',
  district: '',
  ward: '',
  addressLine: '',
  addressLabel: '',
  saveAddress: false,
  updateSavedAddress: false,
  shippingNote: '',
  paymentMethod: 'cod'
});
