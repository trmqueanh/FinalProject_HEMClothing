const { readInteger } = require('../config/env');

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

const readClientIp = req =>
  String(req.ip || req.socket?.remoteAddress || 'unknown').trim();

const createRateLimit = ({
  windowMs = DEFAULT_WINDOW_MS,
  max = 30,
  message = 'Too many requests. Please try again later.',
  keyGenerator = readClientIp
} = {}) => {
  const normalizedWindowMs = readInteger(windowMs, DEFAULT_WINDOW_MS, {
    min: 1000,
    max: 24 * 60 * 60 * 1000
  });
  const normalizedMax = readInteger(max, 30, { min: 1, max: 10000 });
  const requests = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = String(keyGenerator(req) || 'unknown');
    const current = requests.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + normalizedWindowMs }
      : current;

    entry.count += 1;
    requests.set(key, entry);

    res.setHeader('RateLimit-Limit', String(normalizedMax));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, normalizedMax - entry.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > normalizedMax) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
      return res.status(429).json({ message });
    }

    if (requests.size > 5000) {
      for (const [storedKey, storedEntry] of requests.entries()) {
        if (storedEntry.resetAt <= now) {
          requests.delete(storedKey);
        }
      }
    }

    return next();
  };
};

module.exports = {
  createRateLimit
};
