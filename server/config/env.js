const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
  quiet: true
});

const NODE_ENV = String(process.env.NODE_ENV || 'development').trim().toLowerCase();
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

const readBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const readInteger = (value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
};

const readCsv = value =>
  String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const getJwtSecret = () => {
  const secret = String(process.env.JWT_SECRET || '').trim();

  if (!secret) {
    throw new Error('JWT_SECRET is missing. Add it to server/.env before starting the server.');
  }

  if (isProduction && secret.length < 24) {
    throw new Error('JWT_SECRET must contain at least 24 characters in production.');
  }

  return secret;
};

const getPasswordResetSecret = () =>
  String(process.env.PASSWORD_RESET_SECRET || '').trim() || getJwtSecret();

const getEmailVerificationSecret = () =>
  String(process.env.EMAIL_VERIFICATION_SECRET || '').trim() || getPasswordResetSecret();

const getCorsOrigins = () => {
  const configuredOrigins = [
    ...readCsv(process.env.CORS_ORIGINS),
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL
  ].filter(Boolean);

  if (!isProduction) {
    configuredOrigins.push(
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173'
    );
  }

  return [...new Set(configuredOrigins.map(origin => String(origin).replace(/\/+$/, '')))];
};

const validateRuntimeConfig = () => {
  getJwtSecret();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Add it to server/.env before starting the server.');
  }

  if (isProduction && getCorsOrigins().length === 0) {
    throw new Error('CORS_ORIGINS or CLIENT_URL is required in production.');
  }

  if (
    isProduction &&
    (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS)
  ) {
    throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASS are required in production.');
  }

  if (
    isProduction &&
    (!process.env.BANK_TRANSFER_BANK_ID ||
      !process.env.BANK_TRANSFER_ACCOUNT_NUMBER ||
      !process.env.BANK_TRANSFER_ACCOUNT_HOLDER)
  ) {
    throw new Error('Bank transfer account configuration is required in production.');
  }
};

module.exports = {
  NODE_ENV,
  getCorsOrigins,
  getEmailVerificationSecret,
  getJwtSecret,
  getPasswordResetSecret,
  isProduction,
  isTest,
  readBoolean,
  readCsv,
  readInteger,
  validateRuntimeConfig
};
