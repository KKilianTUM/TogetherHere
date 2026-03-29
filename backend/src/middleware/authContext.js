import { getSessionAuthContextByToken } from '../services/authService.js';

const BEARER_PREFIX = 'Bearer ';

const extractBearerToken = (authorizationHeader = '') => {
  if (!authorizationHeader.startsWith(BEARER_PREFIX)) {
    return null;
  }

  const token = authorizationHeader.slice(BEARER_PREFIX.length).trim();
  return token || null;
};

export const resolveAuthContext = async (req, _res, next) => {
  req.auth = null;

  const rawToken = extractBearerToken(req.headers.authorization);
  if (!rawToken) {
    return next();
  }

  try {
    const authContext = await getSessionAuthContextByToken(rawToken);
    req.auth = authContext;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireAuth = (req, res, next) => {
  if (!req.auth) {
    return res.status(401).json({
      error: 'unauthenticated',
      message: 'Authentication is required for this resource.'
    });
  }

  return next();
};
