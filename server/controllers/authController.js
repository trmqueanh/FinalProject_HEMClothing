const {
  normalizeEmail,
  serializeUser,
  hashPassword,
  verifyPassword,
  passwordNeedsRehash,
  createToken,
  isValidUuid
} = require('../utils/authUtils');
const { sendTransactionalEmail } = require('../services/emailService');
const { serializePublicVoucher } = require('../services/voucherService');
const {
  createPasswordResetToken,
  passwordFingerprintMatches,
  verifyPasswordResetToken
} = require('../services/passwordResetService');
const {
  EMAIL_VERIFICATION_TTL_MS,
  createEmailVerificationToken,
  emailVerificationFingerprintMatches,
  verifyEmailVerificationToken
} = require('../services/emailVerificationService');
const {
  PASSWORD_RULE_MESSAGE,
  isStrongMemberPassword,
  parseMemberBirthDate,
  serializeMemberBirthDate
} = require('../validators/authValidator');
const { createErrorResponder } = require('../utils/http');
const { normalizeVietnamPhone } = require('../utils/vietnamPhone');
const userAddressModel = require('../models/userAddressModel');
const userModel = require('../models/userModel');
const favoriteModel = require('../models/favoriteModel');
const searchHistoryModel = require('../models/searchHistoryModel');
const voucherModel = require('../models/voucherModel');
const createSessionController = require('./auth/sessionController');
const createAccountController = require('./auth/accountController');
const createProfileController = require('./auth/profileController');
const createFavoriteController = require('./auth/favoriteController');
const createSearchHistoryController = require('./auth/searchHistoryController');
const { PAYMENT_METHODS } = require('../constants/domainConstants');

// Auth controller root:
// shared account/profile helpers stay here; route handlers are grouped in controllers/auth/* for easier debugging.
const PAYMENT_PROVIDERS = PAYMENT_METHODS;
const PROFILE_GENDERS = new Set(['male', 'female', 'other', '']);
const ACTIVE_VOUCHER_CACHE_TTL_MS = 15000;
let activeVoucherCache = null;

const getDb = req => req.app.locals.db;

const sendError = createErrorResponder('Unexpected authentication error.');

const createSessionPayload = user => ({
  token: createToken(user),
  user: serializeUser(user)
});

const getClientBaseUrl = req =>
  String(process.env.CLIENT_URL || process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

const buildPasswordResetEmail = (req, user, resetUrl) => {
  const displayName = serializeUser(user).name;

  return {
    subject: 'HEM password reset',
    ctaLabel: 'Reset password',
    preheader: 'Use this secure link to reset your HEM password.',
    resetUrl,
    expiresInHours: 24,
    body: [
      `Hello ${displayName},`,
      'We received a request to reset your password. If you did not request this change, you can ignore this email and your account will not be affected.',
      'To reset your password, please open the secure link below:',
      resetUrl,
      'This link is valid for 24 hours.',
      'Best regards, HEM Customer Care'
    ].join('\n\n'),
    previewOnly: true,
    from: 'HEM Customer Care <no-reply@hem.local>',
    to: normalizeEmail(user.email),
    websiteUrl: getClientBaseUrl(req)
  };
};

const formatDurationForCopy = durationMs => {
  const minutes = Math.max(1, Math.round(Number(durationMs || 0) / (60 * 1000)));

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.max(1, Math.round(minutes / 60));
  return `${hours} hour${hours === 1 ? '' : 's'}`;
};

const buildEmailVerificationEmail = (req, user, verificationUrl) => {
  const displayName = serializeUser(user).name;
  const expiresIn = formatDurationForCopy(EMAIL_VERIFICATION_TTL_MS);

  return {
    subject: 'Verify your HEM email',
    ctaLabel: 'Verify email',
    preheader: 'Activate your HEM membership within 10 minutes.',
    verificationUrl,
    websiteUrl: getClientBaseUrl(req),
    body: [
      `Hello ${displayName},`,
      'Please verify your email address to activate your HEM membership.',
      `Open the secure link below within ${expiresIn}:`,
      verificationUrl,
      'If you did not create a HEM account, you can ignore this email.',
      'Best regards, HEM Customer Care'
    ].join('\n\n'),
    previewOnly: true,
    from: 'HEM <no-reply@hem.local>',
    to: normalizeEmail(user.email)
  };
};

const buildWelcomeEmail = (req, user) => ({
  subject: 'Welcome to HEM membership',
  ctaLabel: 'Visit HEM',
  preheader: 'Your HEM membership is active.',
  websiteUrl: getClientBaseUrl(req),
  body: [
    `Hello ${serializeUser(user).name},`,
    'Welcome to HEM membership.',
    'Explore every benefit of becoming a HEM member, including rewards, exclusive offers, saved shopping details, and a smoother checkout experience.'
  ].join('\n\n'),
  previewOnly: true,
  from: 'HEM <no-reply@hem.local>',
  to: normalizeEmail(user.email)
});

const buildPasswordChangedEmail = (req, user) => ({
  subject: 'Your HEM password was changed',
  ctaLabel: 'Visit HEM',
  preheader: 'Your HEM account password was updated successfully.',
  websiteUrl: getClientBaseUrl(req),
  body: [
    `Hello ${serializeUser(user).name},`,
    'Your HEM account password was changed successfully.',
    'If you made this change, no further action is needed.',
    'If you did not change your password, please reset your password immediately or contact HEM Customer Care.'
  ].join('\n\n'),
  previewOnly: true,
  from: 'HEM Customer Care <no-reply@hem.local>',
  to: normalizeEmail(user.email)
});

const serializeAccountRecord = account => ({
  ...serializeUser(account),
  createdAt: account.created_at || null,
  updatedAt: account.updated_at || null
});

const serializeProfileRow = row => ({
  id: row && row.id ? String(row.id) : '',
  userId: row && row.user_id ? String(row.user_id) : '',
  fullName: String((row && row.full_name) || ''),
  phone: String((row && row.phone) || ''),
  gender: String((row && row.gender) || ''),
  birthDate: serializeMemberBirthDate(row && row.birth_date),
  avatarUrl: String((row && row.avatar_url) || ''),
  paymentProvider: String((row && row.payment_provider) || 'cod'),
  cardHolderName: String((row && row.card_holder_name) || ''),
  cardLast4: String((row && row.card_last4) || ''),
  cardBrand: String((row && row.card_brand) || ''),
  createdAt: row && row.created_at ? row.created_at : null,
  updatedAt: row && row.updated_at ? row.updated_at : null
});

const serializeAddressRow = row => ({
  id: row && row.id ? String(row.id) : '',
  userId: row && row.user_id ? String(row.user_id) : '',
  receiverName: String((row && row.receiver_name) || ''),
  receiverPhone: String((row && row.receiver_phone) || ''),
  country: String((row && row.country) || 'Vietnam'),
  city: String((row && row.city) || ''),
  district: String((row && row.district) || ''),
  ward: String((row && row.ward) || ''),
  addressLine: String((row && row.address_line) || ''),
  addressLabel: String((row && row.address_label) || ''),
  isDefault: Boolean(row && row.is_default),
  createdAt: row && row.created_at ? row.created_at : null,
  updatedAt: row && row.updated_at ? row.updated_at : null
});

const serializeProfilePayload = (user, profile, addresses) => {
  const serializedAddresses = (Array.isArray(addresses) ? addresses : []).map(serializeAddressRow);

  return {
    user: serializeUser(user),
    profile: serializeProfileRow(profile),
    addresses: serializedAddresses,
    defaultAddress: serializedAddresses.find(address => address.isDefault) || serializedAddresses[0] || null
  };
};

const normalizeProfilePayload = body => {
  const paymentProviderInput = String(body.paymentProvider || body.payment_provider || 'cod').trim().toLowerCase();
  const paymentProvider = paymentProviderInput === 'card'
    ? 'bank_transfer'
    : paymentProviderInput;
  const gender = String(body.gender || '').trim().toLowerCase();
  const rawBirthDate = String(body.birthDate || body.birth_date || '').trim();
  const birthDate = rawBirthDate ? parseMemberBirthDate(rawBirthDate) : null;
  const rawPhone = String(body.phone || '').trim();
  const phone = normalizeVietnamPhone(rawPhone);

  if (!PAYMENT_PROVIDERS.has(paymentProvider)) {
    const error = new Error('Please choose a valid payment provider.');
    error.statusCode = 400;
    throw error;
  }

  if (!PROFILE_GENDERS.has(gender)) {
    const error = new Error('Please choose a valid gender.');
    error.statusCode = 400;
    throw error;
  }

  if (rawBirthDate && !birthDate) {
    const error = new Error('Please choose a valid birth date that is not in the future.');
    error.statusCode = 400;
    throw error;
  }

  if (!phone) {
    const error = new Error('Please enter a valid Vietnamese mobile phone number.');
    error.statusCode = 400;
    throw error;
  }

  return {
    name: String(body.name || '').trim().slice(0, 100),
    fullName: String(body.fullName || body.full_name || '').trim().slice(0, 120),
    phone,
    gender,
    birthDate,
    avatarUrl: String(body.avatarUrl || body.avatar_url || '').trim(),
    paymentProvider,
    cardHolderName: '',
    cardLast4: '',
    cardBrand: ''
  };
};

const normalizeAddressPayload = body => {
  const rawReceiverPhone = String(body.receiverPhone || body.receiver_phone || '').trim();
  const receiverPhone = normalizeVietnamPhone(rawReceiverPhone);
  const payload = {
    receiverName: String(body.receiverName || body.receiver_name || '').trim().slice(0, 120),
    receiverPhone,
    country: String(body.country || 'Vietnam').trim().slice(0, 100) || 'Vietnam',
    city: String(body.city || '').trim().slice(0, 100),
    district: String(body.district || '').trim().slice(0, 100),
    ward: String(body.ward || '').trim().slice(0, 100),
    addressLine: String(body.addressLine || body.address_line || '').trim(),
    addressLabel: String(body.addressLabel || body.address_label || '').trim().slice(0, 50),
    isDefault: Boolean(body.isDefault || body.is_default)
  };

  if (
    !payload.receiverName ||
    !payload.city ||
    !payload.district ||
    !payload.ward ||
    !payload.addressLine
  ) {
    const error = new Error('Please complete all required shipping address fields.');
    error.statusCode = 400;
    throw error;
  }

  if (!receiverPhone) {
    const error = new Error('Please enter a valid Vietnamese mobile phone number.');
    error.statusCode = 400;
    throw error;
  }

  return payload;
};

const readActiveVoucherPayload = async db => {
  const now = Date.now();

  if (activeVoucherCache && activeVoucherCache.payload && activeVoucherCache.expiresAt > now) {
    return activeVoucherCache.payload;
  }

  if (activeVoucherCache && activeVoucherCache.promise) {
    return activeVoucherCache.promise;
  }

  const promise = voucherModel.listMemberCatalog(db).then(result => {
    const payload = {
      items: result.rows.map(row => serializePublicVoucher(row))
    };

    activeVoucherCache = {
      payload,
      expiresAt: Date.now() + ACTIVE_VOUCHER_CACHE_TTL_MS
    };

    return payload;
  }).catch(error => {
    activeVoucherCache = null;
    throw error;
  });

  activeVoucherCache = {
    promise,
    expiresAt: now + ACTIVE_VOUCHER_CACHE_TTL_MS
  };

  return promise;
};

const buildProfileResponse = async (db, user) => {
  const [profile, addressResult] = await Promise.all([
    userModel.findProfileByUserId(db, user.id),
    userAddressModel.listByUser(db, user.id)
  ]);

  return serializeProfilePayload(user, profile, addressResult.rows);
};

const normalizeSearchKeyword = value =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 255);

const serializeSearchHistoryRow = row => ({
  id: String(row.id),
  keyword: String(row.keyword || ''),
  createdAt: row.created_at || null
});

const sessionController = createSessionController({
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RULE_MESSAGE,
  buildEmailVerificationEmail,
  buildPasswordChangedEmail,
  buildPasswordResetEmail,
  buildWelcomeEmail,
  createEmailVerificationToken,
  createPasswordResetToken,
  createSessionPayload,
  emailVerificationFingerprintMatches,
  getClientBaseUrl,
  getDb,
  hashPassword,
  isStrongMemberPassword,
  isValidUuid,
  normalizeEmail,
  parseMemberBirthDate,
  passwordFingerprintMatches,
  passwordNeedsRehash,
  sendError,
  sendTransactionalEmail,
  serializeUser,
  userModel,
  verifyEmailVerificationToken,
  verifyPassword,
  verifyPasswordResetToken
});

exports.register = sessionController.register;
exports.checkEmail = sessionController.checkEmail;
exports.login = sessionController.login;
exports.verifyEmail = sessionController.verifyEmail;
exports.resendEmailVerification = sessionController.resendEmailVerification;
exports.requestPasswordReset = sessionController.requestPasswordReset;
exports.resetPassword = sessionController.resetPassword;
exports.changePassword = sessionController.changePassword;
exports.me = sessionController.me;

const accountController = createAccountController({
  getDb,
  readActiveVoucherPayload,
  sendError,
  serializeAccountRecord,
  userModel
});

exports.listAccounts = accountController.listAccounts;
exports.getMyVouchers = accountController.getMyVouchers;

const profileController = createProfileController({
  buildProfileResponse,
  getDb,
  isValidUuid,
  normalizeAddressPayload,
  normalizeProfilePayload,
  sendError,
  userAddressModel,
  userModel
});

exports.getProfile = profileController.getProfile;
exports.updateProfile = profileController.updateProfile;
exports.createAddress = profileController.createAddress;
exports.updateAddress = profileController.updateAddress;
exports.setDefaultAddress = profileController.setDefaultAddress;
exports.deleteAddress = profileController.deleteAddress;

const favoriteController = createFavoriteController({
  favoriteModel,
  getDb,
  isValidUuid,
  sendError
});

exports.getFavorites = favoriteController.getFavorites;
exports.toggleFavorite = favoriteController.toggleFavorite;
exports.removeFavorite = favoriteController.removeFavorite;
exports.clearFavorites = favoriteController.clearFavorites;

const searchHistoryController = createSearchHistoryController({
  getDb,
  normalizeSearchKeyword,
  searchHistoryModel,
  sendError,
  serializeSearchHistoryRow
});

exports.getSearchHistory = searchHistoryController.getSearchHistory;
exports.saveSearchHistory = searchHistoryController.saveSearchHistory;
exports.clearSearchHistory = searchHistoryController.clearSearchHistory;
