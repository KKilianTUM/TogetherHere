import { checkAuthRateLimits } from '../services/authSecurityService.js';

export function authRateLimit(route) {
  return function authRateLimitMiddleware(req, res, next) {
    const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';

    const result = checkAuthRateLimits({
      route,
      ipAddress,
      body: req.body
    });

    if (!result.blocked) {
      return next();
    }

    res.set('Retry-After', String(result.retryAfterSeconds));

    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please retry later.',
      retryAfterSeconds: result.retryAfterSeconds
    });
  };
}
