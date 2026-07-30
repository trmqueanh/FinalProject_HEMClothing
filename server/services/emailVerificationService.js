const crypto = require('crypto');
const { getEmailVerificationSecret, readInteger } = require('../config/env');

const EMAIL_VERIFICATION_TTL_MS = readInteger(
  process.env.EMAIL_VERIFICATION_TTL_MS,
  10 * 60 * 1000,
  { min: 60 * 1000, max: 24 * 60 * 60 * 1000 }
);

const toBase64Url = value => Buffer.from(value).toString('base64url');

const fromBase64Url = value => Buffer.from(String(value || ''), 'base64url').toString('utf8');

const signVerificationPayload = encodedPayload =>
  crypto
    .createHmac('sha256', getEmailVerificationSecret())
    .update(`hem-email-verification:${encodedPayload}`)
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

const createEmailVerificationToken = (user, now = Date.now()) => {
  const payload = {
    sub: String(user.id),
    email: String(user.email || '').trim().toLowerCase(),
    exp: now + EMAIL_VERIFICATION_TTL_MS,
    pwd: createPasswordFingerprint(user.password_hash || user.passwordHash)
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));

  return `${encodedPayload}.${signVerificationPayload(encodedPayload)}`;
};

const verifyEmailVerificationToken = (token, now = Date.now()) => {
  const parts = String(token || '').split('.');

  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;

  if (!safeEqual(signature, signVerificationPayload(encodedPayload))) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload));

    if (!payload.sub || !payload.email || !payload.exp || payload.exp < now || !payload.pwd) {
      return null;
    }

    return payload;
  } catch (_error) {
    return null;
  }
};

const emailVerificationFingerprintMatches = (payload, passwordHash) =>
  Boolean(payload?.pwd) &&
  safeEqual(payload.pwd, createPasswordFingerprint(passwordHash));

module.exports = {
  EMAIL_VERIFICATION_TTL_MS,
  createEmailVerificationToken,
  emailVerificationFingerprintMatches,
  verifyEmailVerificationToken
};
