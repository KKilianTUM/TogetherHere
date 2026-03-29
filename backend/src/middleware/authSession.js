import config from '../config/index.js';
import { getSessionUserByToken } from '../services/authService.js';

const AUTH_REQUIRED_MESSAGE = 'No authenticated session.';

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

function parseBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  const [scheme, credentials] = authorizationHeader.split(' ');
  if (!scheme || !credentials || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return credentials.trim() || null;
}

function getSessionTokenFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const cookieToken = cookies[config.sessionCookieName];

  if (cookieToken) {
    return cookieToken;
  }

  return parseBearerToken(req.headers.authorization);
}

export function requireAuthenticated(req, res, next) {
  if (req.auth?.user) {
    return next();
  }

  return res.status(401).json({
    error: 'Request Error',
    message: AUTH_REQUIRED_MESSAGE
  });
}

export async function attachAuthIdentity(req, res, next) {
  const sessionToken = getSessionTokenFromRequest(req);

  req.auth = {
    sessionToken: sessionToken || null,
    user: null
  };

  if (!sessionToken) {
    return next();
  }

  try {
    const user = await getSessionUserByToken(sessionToken);
    if (user) {
      req.auth.user = user;
    }

    next();
  } catch (error) {
    next(error);
  }
}
