const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/env');
const { USER_ROLE } = require('../constants/domainConstants');

const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const USERS_TABLE = 'users';

const normalizeEmail = email => String(email || '').trim().toLowerCase();

const normalizeRole = user => {
  const role = String(user?.role || '').trim().toLowerCase();
  return role === USER_ROLE.ADMIN ? USER_ROLE.ADMIN : USER_ROLE.USER;
};

const serializeUser = user => ({
  id: String(user.id),
  name:
    String(user.name || '').trim() ||
    String(user.email || '').split('@')[0] ||
    'Customer',
  email: normalizeEmail(user.email),
  role: normalizeRole(user),
  status: String(user.status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active',
  emailVerified: user.email_verified === undefined && user.emailVerified === undefined
    ? true
    : Boolean(user.email_verified ?? user.emailVerified)
});

const hashPassword = password => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto
    .scryptSync(String(password), salt, 64)
    .toString('hex');

  return `scrypt$${salt}$${derivedKey}`;
};

const verifyHashedPassword = (password, storedValue) => {
  const parts = String(storedValue || '').split('$');

  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    const storedBuffer = Buffer.from(String(storedValue || ''));
    const passwordBuffer = Buffer.from(String(password));

    return storedBuffer.length === passwordBuffer.length &&
      crypto.timingSafeEqual(storedBuffer, passwordBuffer);
  }

  try {
    const [, salt, storedHash] = parts;
    const derivedKey = crypto
      .scryptSync(String(password), salt, 64)
      .toString('hex');

    const derivedBuffer = Buffer.from(derivedKey, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');

    if (derivedBuffer.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedBuffer, storedBuffer);
  } catch (_error) {
    return false;
  }
};

const verifyPassword = (password, user) => {
  if (user && user.password_hash) {
    return verifyHashedPassword(password, user.password_hash);
  }

  if (user && user.passwordHash) {
    return verifyHashedPassword(password, user.passwordHash);
  }

  if (user && typeof user.password === 'string') {
    return verifyHashedPassword(password, user.password);
  }

  return false;
};

const createToken = user => {
  const payload = {
    sub: String(user.id),
    email: normalizeEmail(user.email),
    role: normalizeRole(user)
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRES_IN
  });
};

const verifyToken = token => {
  try {
    return jwt.verify(String(token || ''), getJwtSecret());
  } catch (_error) {
    return null;
  }
};

const passwordNeedsRehash = user => {
  const storedValue = user?.password_hash || user?.passwordHash || user?.password || '';
  return !String(storedValue).startsWith('scrypt$');
};

const isValidUuid = value =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());

module.exports = {
  USERS_TABLE,
  normalizeRole,
  normalizeEmail,
  serializeUser,
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
  createToken,
  verifyToken,
  isValidUuid
};
