const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 20;

const attemptsByKey = new Map();

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function getRateLimitKey(req) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${getClientIp(req)}:${email}`;
}

function pruneExpired(now) {
  for (const [key, entry] of attemptsByKey.entries()) {
    if (entry.resetAt <= now) {
      attemptsByKey.delete(key);
    }
  }
}

export function authRateLimit(req, res, next) {
  const now = Date.now();
  pruneExpired(now);

  const key = getRateLimitKey(req);
  const existing = attemptsByKey.get(key);

  if (!existing || existing.resetAt <= now) {
    attemptsByKey.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (existing.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));

    return res.status(429).json({
      error: 'Request Error',
      message: 'Too many authentication attempts. Please try again later.'
    });
  }

  existing.count += 1;
  attemptsByKey.set(key, existing);

  next();
}
