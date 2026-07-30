import { getVietnamDateParts } from '../dateTime';

// Checkout required fields: used by form validation before placing an order.
export const REQUIRED_CHECKOUT_FIELDS = ['receiverName', 'phoneLocalNumber', 'city', 'district', 'ward', 'addressLine'];
export const REQUIRED_CARD_FIELDS = ['cardHolderName'];

const CARD_NUMBER_MAX_DIGITS = 19;

// Card input helpers: keep user typing normalized before it reaches checkout state.
export const getDigits = value => String(value || '').replace(/\D/g, '');

export const formatCardNumber = value =>
  getDigits(value)
    .slice(0, CARD_NUMBER_MAX_DIGITS)
    .replace(/(.{4})/g, '$1 ')
    .trim();

export const formatExpiry = value => {
  const digits = getDigits(value).slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

export const detectCardBrand = value => {
  const digits = getDigits(value);

  if (digits.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(digits)) return 'Mastercard';
  return '';
};

export const detectCardBrandValue = value => {
  const brand = detectCardBrand(value);
  if (brand === 'Visa') return 'visa';
  if (brand === 'Mastercard') return 'mastercard';
  return '';
};

// Checkout validators: small pure checks shared by blur and submit validation.
export const isValidCardHolderName = value => {
  const name = String(value || '').trim();
  return name.length >= 2 && /\p{L}/u.test(name) && /^[\p{L}\s.'-]+$/u.test(name);
};

export const isValidExpiry = value => {
  const match = String(value || '').match(/^(0[1-9]|1[0-2])\/(\d{2})$/);

  if (!match) return false;

  const month = Number(match[1]);
  const year = Number(`20${match[2]}`);
  const vietnamNow = getVietnamDateParts();

  return year > vietnamNow.year || (year === vietnamNow.year && month >= vietnamNow.month);
};

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
  paymentMethod: 'cod',
  cardHolderName: '',
  cardNumber: '',
  cardExpiry: '',
  cardCvv: '',
  cardLast4: '',
  cardBrand: '',
  useSavedCard: false,
  saveCard: false
});
