const express = require('express');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');
const deprecatedRoute = require('../middleware/deprecatedRoute');
const { createRateLimit } = require('../middleware/rateLimit');
const { readInteger } = require('../config/env');

const router = express.Router();
const authLimit = createRateLimit({
  max: readInteger(process.env.AUTH_RATE_LIMIT_MAX, 20, { min: 5, max: 500 })
});
const passwordResetLimit = createRateLimit({
  max: readInteger(process.env.PASSWORD_RESET_RATE_LIMIT_MAX, 5, { min: 2, max: 100 }),
  message: 'Too many password reset attempts. Please try again later.'
});

router.route('/auth/register').post(authLimit, authController.register);
router.route('/auth/check-email').post(authLimit, authController.checkEmail);
router.route('/auth/login').post(authLimit, authController.login);
router.route('/auth/email/verify').post(authLimit, authController.verifyEmail);
router.route('/auth/email/resend').post(authLimit, authController.resendEmailVerification);
router.route('/auth/password/forgot').post(passwordResetLimit, authController.requestPasswordReset);
router.route('/auth/password/reset').post(passwordResetLimit, authController.resetPassword);
router.route('/auth/password').put(
  deprecatedRoute('/api/account/password'),
  requireAuth,
  authController.changePassword
);
router.route('/api/account/password').patch(requireAuth, authController.changePassword);
router.route('/auth/me').get(requireAuth, authController.me);
router.route('/auth/profile').get(requireAuth, authController.getProfile).put(requireAuth, authController.updateProfile);
router.route('/auth/addresses').post(requireAuth, authController.createAddress);
router.route('/auth/addresses/:addressId').put(requireAuth, authController.updateAddress).delete(requireAuth, authController.deleteAddress);
router.route('/auth/addresses/:addressId/default').put(requireAuth, authController.setDefaultAddress);
router.route('/auth/accounts').get(
  deprecatedRoute('/admin/accounts'),
  requireAdmin,
  authController.listAccounts
);
router.route('/auth/vouchers').get(requireAuth, authController.getMyVouchers);
router.route('/auth/reviews').get(
  deprecatedRoute('/api/account/reviews'),
  requireAuth,
  reviewController.getAccountReviews
);
router.route('/auth/favorites').get(requireAuth, authController.getFavorites).delete(requireAuth, authController.clearFavorites);
router.route('/auth/favorites/:productId/toggle').post(requireAuth, authController.toggleFavorite);
router.route('/auth/favorites/:productId').delete(requireAuth, authController.removeFavorite);
router.route('/auth/search-history').get(requireAuth, authController.getSearchHistory);
router.route('/auth/search-history').post(requireAuth, authController.saveSearchHistory);
router.route('/auth/search-history').delete(requireAuth, authController.clearSearchHistory);

module.exports = router;
