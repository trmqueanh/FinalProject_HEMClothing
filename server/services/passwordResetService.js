const crypto = require('crypto');
const { getPasswordResetSecret, readInteger } = require('../config/env');

const PASSWORD_RESET_TTL_MS = readInteger(
  process.env.PASSWORD_RESET_TTL_MS,
  24 * 60 * 60 * 1000,
  { min: 5 * 60 * 1000, max: 7 * 24 * 60 * 60 * 1000 }
);

const toBase64Url = value => Buffer.from(value).toString('base64url');

const fromBase64Url = value => Buffer.from(String(value || ''), 'base64url').toString('utf8');

const signResetPayload = encodedPayload =>
  crypto
    .createHmac('sha256', getPasswordResetSecret())
    .update(`hem-password-reset:${encodedPayload}`)
    .digest('base64url');

const createPasswordFingerprint = passwordHash =>
  crypto
    .createHash('sha256')
    .update(String(passwordHash || ''))
    .digest('base64url');

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));

  return leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const createPasswordResetToken = (user, now = Date.now()) => {
  const payload = {
    sub: String(user.id),
    email: String(user.email || '').trim().toLowerCase(),
    exp: now + PASSWORD_RESET_TTL_MS,
    pwd: createPasswordFingerprint(user.password_hash || user.passwordHash)
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));

  return `${encodedPayload}.${signResetPayload(encodedPayload)}`;
};

const verifyPasswordResetToken = (token, now = Date.now()) => {
  const parts = String(token || '').split('.');

  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;

  if (!safeEqual(signature, signResetPayload(encodedPayload))) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload));

    if (!payload.sub || !payload.exp || payload.exp < now || !payload.pwd) {
      return null;
    }

    return payload;
  } catch (_error) {
    return null;
  }
};

const passwordFingerprintMatches = (payload, passwordHash) =>
  Boolean(payload?.pwd) &&
  safeEqual(payload.pwd, createPasswordFingerprint(passwordHash));

module.exports = {
  PASSWORD_RESET_TTL_MS,
  createPasswordResetToken,
  passwordFingerprintMatches,
  verifyPasswordResetToken
};
