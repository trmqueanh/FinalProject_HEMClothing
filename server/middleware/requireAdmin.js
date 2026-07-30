const requireAuth = require('./requireAuth');
const { normalizeRole } = require('../utils/authUtils');
const { USER_ROLE } = require('../constants/domainConstants');

module.exports = (req, res, next) =>
  requireAuth(req, res, error => {
    if (error) {
      return next(error);
    }

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    if (normalizeRole(req.authUser) !== USER_ROLE.ADMIN) {
      return res.status(403).json({
        message: 'Admin access only.'
      });
    }

    return next();
  });
