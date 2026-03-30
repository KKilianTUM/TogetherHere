import config from '../config/index.js';
import {
  confirmVerification,
  issueVerification,
  loginUser,
  registerUser,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  revokeSessionByToken
} from '../services/authService.js';
import { createHttpError } from '../middleware/httpError.js';
import { logAuthEvent } from '../middleware/authEventLogger.js';

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${options.maxAgeSeconds}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
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

export async function register(req, res, next) {
  try {
    const user = await registerUser(req.body);
    logAuthEvent(req, 'register', { userId: user.id, email: user.email, outcome: 'success', statusCode: 201 });

    res.status(201).json({
      user
    });
  } catch (error) {
    logAuthEvent(req, 'register', { outcome: 'failure', statusCode: error?.statusCode || 500 }, 'warn');
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { sessionToken, user } = await loginUser(req.body);
    logAuthEvent(req, 'login', { userId: user.id, email: user.email, outcome: 'success', statusCode: 200 });

    res.append('Set-Cookie', serializeCookie(config.sessionCookieName, sessionToken, {
      maxAgeSeconds: config.sessionMaxAgeSeconds,
      path: config.sessionCookiePath,
      domain: config.sessionCookieDomain,
      httpOnly: true,
      secure: config.sessionCookieSecure,
      sameSite: config.sessionCookieSameSite
    }));

    res.status(200).json({ user });
  } catch (error) {
    logAuthEvent(req, 'login', { outcome: 'failure', statusCode: error?.statusCode || 500 }, 'warn');
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const sessionToken = req.auth?.sessionToken;
    await revokeSessionByToken(sessionToken);
    logAuthEvent(req, 'logout', { userId: req.auth?.user?.id, email: req.auth?.user?.email, outcome: 'success', statusCode: 204 });

    res.append('Set-Cookie', serializeCookie(config.sessionCookieName, '', {
      maxAgeSeconds: 0,
      path: config.sessionCookiePath,
      domain: config.sessionCookieDomain,
      httpOnly: true,
      secure: config.sessionCookieSecure,
      sameSite: config.sessionCookieSameSite
    }));

    res.status(204).send();
  } catch (error) {
    logAuthEvent(req, 'logout', { userId: req.auth?.user?.id, email: req.auth?.user?.email, outcome: 'failure', statusCode: error?.statusCode || 500 }, 'warn');
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = req.auth?.user;
    if (!user) {
      throw createHttpError(401, 'No authenticated session.');
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const result = await requestPasswordReset(req.body);
    logAuthEvent(req, 'password_reset_request', { outcome: 'success', statusCode: 200 });
    res.status(200).json(result);
  } catch (error) {
    logAuthEvent(req, 'password_reset_request', { outcome: 'failure', statusCode: error?.statusCode || 500 }, 'warn');
    next(error);
  }
}

export async function resetPasswordWithToken(req, res, next) {
  try {
    await resetPassword(req.body);
    logAuthEvent(req, 'password_reset_confirm', { outcome: 'success', statusCode: 200 });
    res.status(200).json({ reset: true });
  } catch (error) {
    logAuthEvent(req, 'password_reset_confirm', { outcome: 'failure', statusCode: error?.statusCode || 500 }, 'warn');
    next(error);
  }
}

export async function issueVerificationToken(req, res, next) {
  try {
    const result = await issueVerification(req.body);
    logAuthEvent(req, 'verification_issue', { outcome: 'success', statusCode: 200 });
    res.status(200).json(result);
  } catch (error) {
    logAuthEvent(req, 'verification_issue', { outcome: 'failure', statusCode: error?.statusCode || 500 }, 'warn');
    next(error);
  }
}

export async function resendVerificationToken(req, res, next) {
  try {
    const result = await resendVerification(req.body);
    logAuthEvent(req, 'verification_resend', { outcome: 'success', statusCode: 200 });
    res.status(200).json(result);
  } catch (error) {
    logAuthEvent(req, 'verification_resend', { outcome: 'failure', statusCode: error?.statusCode || 500 }, 'warn');
    next(error);
  }
}

export async function confirmVerificationToken(req, res, next) {
  try {
    const result = await confirmVerification(req.body);
    logAuthEvent(req, 'verification_confirm', { outcome: 'success', statusCode: 200 });
    res.status(200).json(result);
  } catch (error) {
    logAuthEvent(req, 'verification_confirm', { outcome: 'failure', statusCode: error?.statusCode || 500 }, 'warn');
    next(error);
  }
}
