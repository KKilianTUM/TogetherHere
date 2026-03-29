import crypto from 'crypto';
import config from '../config/index.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce((cookies, segment) => {
      const separatorIndex = segment.indexOf('=');
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = segment.slice(0, separatorIndex).trim();
      const value = segment.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAgeSeconds) {
    parts.push(`Max-Age=${options.maxAgeSeconds}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.secure) {
    parts.push('Secure');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  return parts.join('; ');
}

function createCsrfToken(secret) {
  return crypto.createHmac('sha256', secret).update('togetherhere-csrf-v1').digest('hex');
}

export function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  if (origin && config.corsAllowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', config.corsAllowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', config.corsAllowedHeaders.join(', '));
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}

export function securityHeaders(req, res, next) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}

export function csrfProtection(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);

  let csrfSecret = cookies[config.csrfCookieName];

  if (!csrfSecret) {
    csrfSecret = crypto.randomBytes(32).toString('hex');
    res.append(
      'Set-Cookie',
      serializeCookie(config.csrfCookieName, csrfSecret, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/',
        maxAgeSeconds: 60 * 60 * 12
      })
    );
  }

  const csrfToken = createCsrfToken(csrfSecret);
  res.locals.csrfToken = csrfToken;

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const headerToken = req.headers[config.csrfHeaderName];

  if (!headerToken || headerToken !== csrfToken) {
    return res.status(403).json({
      error: 'Request Error',
      message: 'Invalid CSRF token'
    });
  }

  next();
}
