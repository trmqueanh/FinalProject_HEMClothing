const express = require('express');
const voucherController = require('../controllers/voucherController');
const { createRateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const voucherLimit = createRateLimit({
  max: 60,
  message: 'Too many voucher validation attempts. Please try again later.'
});

router.route('/api/vouchers/validate').post(voucherLimit, voucherController.validate);
router.route('/api/vouchers').get(voucherController.listActive);

module.exports = router;
