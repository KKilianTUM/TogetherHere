const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 20;

const store = new Map();

function clientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function keyFor(req) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${clientIp(req)}:${email}`;
}

export function authRateLimit(req, res, next) {
  const now = Date.now();
  const key = keyFor(req);
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (current.count >= MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));

    return res.status(429).json({
      error: 'Request Error',
      message: 'Too many authentication attempts. Please try again later.'
    });
  }

  current.count += 1;
  store.set(key, current);
  next();
}
