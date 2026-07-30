const { serializePublicVoucher, validateVoucher } = require('../services/voucherService');
const voucherModel = require('../models/voucherModel');

const getDb = req => req.app.locals.db;

exports.listActive = async (req, res, next) => {
  try {
    const result = await voucherModel.listActive(getDb(req));

    return res.json({
      items: result.rows.map(row => serializePublicVoucher(row))
    });
  } catch (error) {
    return next(error);
  }
};

exports.validate = async (req, res) => {
  try {
    const result = await validateVoucher(getDb(req), {
      code: req.body && req.body.code,
      subtotal: req.body && req.body.subtotal
    });

    return res.json(result.response);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      message: error.message || 'Voucher code is invalid.'
    });
  }
};
