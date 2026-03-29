import crypto from 'crypto';
import pool from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function timingSafeHexEqual(leftHex, rightHex) {
  const left = Buffer.from(leftHex, 'hex');
  const right = Buffer.from(rightHex, 'hex');

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function verifyPasswordHash(password, storedHash) {
  if (typeof storedHash !== 'string' || !storedHash) {
    return false;
  }

  if (storedHash.startsWith('sha256$')) {
    const [, expectedHex] = storedHash.split('$');
    if (!expectedHex) {
      return false;
    }

    return timingSafeHexEqual(sha256(password), expectedHex);
  }

  if (storedHash.startsWith('pbkdf2$')) {
    const [, digest, iterationsRaw, salt, expectedHex] = storedHash.split('$');
    const iterations = Number(iterationsRaw);

    if (!digest || !iterations || !salt || !expectedHex) {
      return false;
    }

    const derived = crypto.pbkdf2Sync(password, salt, iterations, Buffer.from(expectedHex, 'hex').length, digest);
    return crypto.timingSafeEqual(derived, Buffer.from(expectedHex, 'hex'));
  }

  if (storedHash.startsWith('scrypt$')) {
    const [, nRaw, rRaw, pRaw, salt, expectedHex] = storedHash.split('$');
    const n = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);

    if (!n || !r || !p || !salt || !expectedHex) {
      return false;
    }

    const expected = Buffer.from(expectedHex, 'hex');
    const derived = crypto.scryptSync(password, salt, expected.length, { N: n, r, p });
    return crypto.timingSafeEqual(derived, expected);
  }

  return false;
}

export async function loginUser({ email, password, ipAddress, userAgent, sessionTtlMs }) {
  const normalizedEmail = email.trim().toLowerCase();

  const userResult = await pool.query(
    `SELECT id, email, password_hash, status, email_verified_at
     FROM public.users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [normalizedEmail]
  );

  if (userResult.rowCount === 0) {
    throw new HttpError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  const user = userResult.rows[0];
  const passwordMatches = verifyPasswordHash(password, user.password_hash);

  if (!passwordMatches) {
    throw new HttpError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  if (user.status !== 'active' || !user.email_verified_at) {
    throw new HttpError(
      403,
      'Account must be active and email verified before login.',
      'ACCOUNT_NOT_ELIGIBLE'
    );
  }

  const ttlMs = Number(sessionTtlMs) > 0 ? Number(sessionTtlMs) : DEFAULT_SESSION_TTL_MS;
  const rawSessionToken = crypto.randomBytes(48).toString('base64url');
  const tokenHash = sha256(rawSessionToken);
  const expiresAt = new Date(Date.now() + ttlMs);

  await pool.query(
    `INSERT INTO public.sessions (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, tokenHash, expiresAt.toISOString(), ipAddress || null, userAgent || null]
  );

  return {
    sessionToken: rawSessionToken,
    sessionExpiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      email: user.email,
      status: user.status,
      emailVerifiedAt: user.email_verified_at
    }
  };
}
