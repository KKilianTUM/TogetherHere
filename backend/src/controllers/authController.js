import config from '../config/index.js';
import { loginUser } from '../services/authService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

function parseCookieTtlMs() {
  const configured = Number(process.env.AUTH_SESSION_TTL_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : 1000 * 60 * 60 * 24 * 7;
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      throw new HttpError(400, 'Email and password are required.', 'VALIDATION_ERROR');
    }

    const authState = await loginUser({
      email,
      password,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      sessionTtlMs: parseCookieTtlMs()
    });

    const secureCookie = process.env.AUTH_COOKIE_SECURE
      ? process.env.AUTH_COOKIE_SECURE === 'true'
      : config.env === 'production';

    res.cookie('th_session', authState.sessionToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'strict',
      path: '/',
      maxAge: parseCookieTtlMs()
    });

    sendSuccess(res, {
      user: authState.user,
      session: {
        expiresAt: authState.sessionExpiresAt
      }
    });
  } catch (error) {
    next(error);
  }
}
