import config from '../config/index.js';
import { registerUser, revokeSessionByToken } from '../services/authService.js';

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
  next(notImplemented('POST /auth/login'));
}

export async function logout(req, res, next) {
  try {
    const sessionToken = req.auth?.sessionToken;
    await revokeSessionByToken(sessionToken);

    res.append(
      'Set-Cookie',
      `${config.sessionCookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = req.auth?.user;
    if (!user) {
      const error = new Error('No authenticated session.');
      error.statusCode = 401;
      throw error;
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}
