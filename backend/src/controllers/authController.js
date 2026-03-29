import config from '../config/index.js';
import { loginUser, registerUser, revokeSessionByToken } from '../services/authService.js';
import { createHttpError } from '../middleware/httpError.js';

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

export async function register(req, res, next) {
  try {
    const user = await registerUser(req.body);

    res.status(201).json({
      user
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { sessionToken, user } = await loginUser(req.body);

    res.append('Set-Cookie', serializeCookie(config.sessionCookieName, sessionToken, {
      maxAgeSeconds: config.sessionMaxAgeSeconds,
      path: '/',
      httpOnly: true,
      secure: config.sessionCookieSecure,
      sameSite: config.sessionCookieSameSite
    }));

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const sessionToken = req.auth?.sessionToken;
    await revokeSessionByToken(sessionToken);

    res.append('Set-Cookie', serializeCookie(config.sessionCookieName, '', {
      maxAgeSeconds: 0,
      path: '/',
      httpOnly: true,
      secure: config.sessionCookieSecure,
      sameSite: config.sessionCookieSameSite
    }));

    res.status(204).send();
  } catch (error) {
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
