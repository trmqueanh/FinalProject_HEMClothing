const {
  normalizeEmail,
  normalizeRole,
  serializeUser,
  verifyToken,
  isValidUuid
} = require('../utils/authUtils');
const userModel = require('../models/userModel');

const extractToken = req => {
  const authHeader = String(req.headers.authorization || '');

  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return String(req.headers['x-auth-token'] || '').trim();
};

const AUTH_USER_CACHE_TTL_MS = Math.max(
  0,
  Number.parseInt(process.env.AUTH_USER_CACHE_TTL_MS || '5000', 10) || 0
);
const AUTH_USER_CACHE_MAX_ENTRIES = 500;
const authUserCache = new Map();

const getAuthCacheKey = payload =>
  isValidUuid(payload.sub)
    ? `id:${payload.sub}`
    : `email:${normalizeEmail(payload.email)}`;

const trimAuthUserCache = () => {
  while (authUserCache.size > AUTH_USER_CACHE_MAX_ENTRIES) {
    authUserCache.delete(authUserCache.keys().next().value);
  }
};

const invalidateUser = user => {
  if (user && isValidUuid(user.id)) {
    authUserCache.delete(`id:${user.id}`);
  }

  if (user && user.email) {
    authUserCache.delete(`email:${normalizeEmail(user.email)}`);
  }
};

const loadAuthUser = async (db, payload) => {
  const cacheKey = getAuthCacheKey(payload);
  const cached = authUserCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.user && cached.expiresAt > now) {
    return cached.user;
  }

  if (cached && cached.promise) {
    return cached.promise;
  }

  const promise = userModel.findAuthUserByIdentity(db, {
    id: payload.sub,
    email: payload.email
  }).then(user => {

    if (!user) {
      return null;
    }

    return {
      ...serializeUser(user),
      role: normalizeRole(user)
    };
  });

  authUserCache.set(cacheKey, { promise });
  trimAuthUserCache();

  try {
    const user = await promise;

    if (user && AUTH_USER_CACHE_TTL_MS > 0) {
      authUserCache.set(cacheKey, {
        user,
        expiresAt: Date.now() + AUTH_USER_CACHE_TTL_MS
      });
    } else {
      authUserCache.delete(cacheKey);
    }

    return user;
  } catch (error) {
    authUserCache.delete(cacheKey);
    throw error;
  }
};

module.exports = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        message: 'Please log in to continue.'
      });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({
        message: 'Your session is invalid or expired.'
      });
    }

    const user = await loadAuthUser(db, payload);

    if (!user) {
      return res.status(401).json({
        message: 'Your account could not be found.'
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before continuing.',
        email: user.email
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        code: 'ACCOUNT_INACTIVE',
        message: 'Your account is inactive. Please contact HEM Customer Care.'
      });
    }

    req.authUser = user;

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports.invalidateUser = invalidateUser;
