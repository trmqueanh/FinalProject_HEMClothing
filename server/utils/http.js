const { isProduction } = require('../config/env');

const createErrorResponder = (fallbackMessage, defaultStatus = 500) =>
  (res, error, fallbackStatus = defaultStatus) => {
    const statusCode = error?.statusCode || fallbackStatus;
    const shouldHideMessage = isProduction && statusCode >= 500;

    if (statusCode >= 500) {
      console.error(error);
    }

    return res.status(statusCode).json({
      message: shouldHideMessage ? fallbackMessage : error?.message || fallbackMessage
    });
  };

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = {
  createErrorResponder,
  createHttpError
};
