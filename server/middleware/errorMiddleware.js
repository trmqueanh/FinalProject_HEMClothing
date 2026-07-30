const { isProduction } = require('../config/env');

module.exports = (error, req, res, next) => {
  if (!error) {
    return next();
  }

  const statusCode = error.statusCode || (error.name === 'MulterError' ? 400 : 500);
  const message = isProduction && statusCode >= 500
    ? 'Unexpected server error.'
    : error.message || 'Unexpected server error.';

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, error);
  }

  return res.status(statusCode).json({
    message
  });
};
