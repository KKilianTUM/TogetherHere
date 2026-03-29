import { forbiddenError, unauthorizedError } from '../errors/ApiError.js';
import { findSessionById, hasRequiredRoles } from '../services/authService.js';

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export function requireSession(requiredRoles = []) {
  return function authMiddleware(req, res, next) {
    const token = extractBearerToken(req.get('authorization'));
    const sessionId = req.get('x-session-id');

    if (!token || !sessionId) {
      return next(
        unauthorizedError(
          'AUTH_CREDENTIALS_REQUIRED',
          'A bearer token and x-session-id header are required.'
        )
      );
    }

    const session = findSessionById(sessionId);

    if (!session) {
      return next(unauthorizedError('AUTH_INVALID_SESSION', 'Session is invalid or expired.'));
    }

    if (session.token !== token) {
      return next(
        forbiddenError(
          'AUTH_TOKEN_SESSION_MISMATCH',
          'Token does not match the active session.'
        )
      );
    }

    if (!hasRequiredRoles(session.roles, requiredRoles)) {
      return next(
        forbiddenError('AUTH_INSUFFICIENT_SCOPE', 'User does not have permission for this action.')
      );
    }

    req.auth = {
      userId: session.userId,
      sessionId: session.sessionId,
      roles: session.roles
    };

    return next();
  };
}
