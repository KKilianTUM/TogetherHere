import config from '../config/index.js';
import { serializeCookie } from '../middleware/security.js';
import { loginUser, registerUser } from '../services/authService.js';

function notImplemented(endpoint) {
  const error = new Error(`${endpoint} is not implemented yet.`);
  error.statusCode = 501;
  return error;
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
    const { user, sessionToken } = await loginUser(req.body);

    res.append(
      'Set-Cookie',
      serializeCookie(config.sessionCookieName, sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        path: '/',
        maxAgeSeconds: config.sessionTtlSeconds
      })
    );

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  next(notImplemented('POST /auth/logout'));
}

export async function me(req, res, next) {
  next(notImplemented('GET /auth/me'));
}
