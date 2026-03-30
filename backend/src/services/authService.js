import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../db/pool.js';
import config from '../config/index.js';

const BCRYPT_COST_FACTOR = 12;
const ALLOWED_REGISTER_FIELDS = new Set(['email', 'password', 'displayName']);
const ALLOWED_LOGIN_FIELDS = new Set(['email', 'password']);
const ALLOWED_FORGOT_PASSWORD_FIELDS = new Set(['email']);
const ALLOWED_RESET_PASSWORD_FIELDS = new Set(['token', 'password']);
const ALLOWED_ISSUE_VERIFICATION_FIELDS = new Set(['email']);
const ALLOWED_CONFIRM_VERIFICATION_FIELDS = new Set(['token']);
const INVALID_REGISTRATION_INPUT_MESSAGE = 'Invalid registration input.';
const INVALID_LOGIN_INPUT_MESSAGE = 'Invalid login input.';
const INVALID_FORGOT_PASSWORD_INPUT_MESSAGE = 'Invalid forgot password input.';
const INVALID_RESET_PASSWORD_INPUT_MESSAGE = 'Invalid reset password input.';
const INVALID_ISSUE_VERIFICATION_INPUT_MESSAGE = 'Invalid verification issue input.';
const INVALID_CONFIRM_VERIFICATION_INPUT_MESSAGE = 'Invalid verification confirm input.';
const INACTIVE_ACCOUNT_MESSAGE = 'Account is not active.';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashSessionToken(token) {
  return hashToken(token);
}

function hashPasswordResetToken(token) {
  return hashToken(token);
}

function hashEmailVerificationToken(token) {
  return hashToken(token);
}

export class AuthValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthValidationError';
    this.statusCode = 400;
  }
}

export class AuthConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthConflictError';
    this.statusCode = 409;
  }
}

export class AuthUnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthUnauthorizedError';
    this.statusCode = 401;
  }
}

function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    return false;
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  return hasLower && hasUpper && hasNumber && hasSymbol;
}

function validateDisplayName(displayName) {
  if (displayName == null) {
    return true;
  }

  if (typeof displayName !== 'string') {
    return false;
  }

  const trimmed = displayName.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return false;
  }

  return /^[A-Za-z0-9 _-]+$/.test(trimmed);
}

function ensureOnlyAllowedFields(input, allowedFields, errorMessage) {
  for (const field of Object.keys(input)) {
    if (!allowedFields.has(field)) {
      throw new AuthValidationError(errorMessage);
    }
  }
}

function validateRegistrationInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthValidationError(INVALID_REGISTRATION_INPUT_MESSAGE);
  }

  ensureOnlyAllowedFields(input, ALLOWED_REGISTER_FIELDS, INVALID_REGISTRATION_INPUT_MESSAGE);

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = input.password;
  const displayName = input.displayName;

  if (!isValidEmail(email)) {
    throw new AuthValidationError(INVALID_REGISTRATION_INPUT_MESSAGE);
  }

  if (!validatePassword(password)) {
    throw new AuthValidationError(INVALID_REGISTRATION_INPUT_MESSAGE);
  }

  if (!validateDisplayName(displayName)) {
    throw new AuthValidationError(INVALID_REGISTRATION_INPUT_MESSAGE);
  }

  return {
    email,
    password,
    displayName: typeof displayName === 'string' ? displayName.trim() : null
  };
}

function validateLoginInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthValidationError(INVALID_LOGIN_INPUT_MESSAGE);
  }

  ensureOnlyAllowedFields(input, ALLOWED_LOGIN_FIELDS, INVALID_LOGIN_INPUT_MESSAGE);

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = input.password;

  if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
    throw new AuthValidationError(INVALID_LOGIN_INPUT_MESSAGE);
  }

  return { email, password };
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function generatePasswordResetToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateEmailVerificationToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function validateForgotPasswordInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthValidationError(INVALID_FORGOT_PASSWORD_INPUT_MESSAGE);
  }

  ensureOnlyAllowedFields(input, ALLOWED_FORGOT_PASSWORD_FIELDS, INVALID_FORGOT_PASSWORD_INPUT_MESSAGE);

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    throw new AuthValidationError(INVALID_FORGOT_PASSWORD_INPUT_MESSAGE);
  }

  return { email };
}

function validateResetPasswordInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthValidationError(INVALID_RESET_PASSWORD_INPUT_MESSAGE);
  }

  ensureOnlyAllowedFields(input, ALLOWED_RESET_PASSWORD_FIELDS, INVALID_RESET_PASSWORD_INPUT_MESSAGE);

  const token = typeof input.token === 'string' ? input.token.trim() : '';
  const password = input.password;

  if (!token || !validatePassword(password)) {
    throw new AuthValidationError(INVALID_RESET_PASSWORD_INPUT_MESSAGE);
  }

  return { token, password };
}

function validateIssueVerificationInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthValidationError(INVALID_ISSUE_VERIFICATION_INPUT_MESSAGE);
  }

  ensureOnlyAllowedFields(input, ALLOWED_ISSUE_VERIFICATION_FIELDS, INVALID_ISSUE_VERIFICATION_INPUT_MESSAGE);

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    throw new AuthValidationError(INVALID_ISSUE_VERIFICATION_INPUT_MESSAGE);
  }

  return { email };
}

function validateConfirmVerificationInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthValidationError(INVALID_CONFIRM_VERIFICATION_INPUT_MESSAGE);
  }

  ensureOnlyAllowedFields(input, ALLOWED_CONFIRM_VERIFICATION_FIELDS, INVALID_CONFIRM_VERIFICATION_INPUT_MESSAGE);

  const token = typeof input.token === 'string' ? input.token.trim() : '';
  if (!token) {
    throw new AuthValidationError(INVALID_CONFIRM_VERIFICATION_INPUT_MESSAGE);
  }

  return { token };
}

async function issueVerificationTokenForUser(userId) {
  const existingTokenResult = await pool.query(
    `SELECT id, expires_at AS "expiresAt", last_sent_at AS "lastSentAt"
     FROM email_verification_tokens
     WHERE user_id = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  const existingToken = existingTokenResult.rows[0];
  if (existingToken?.lastSentAt) {
    const now = Date.now();
    const nextResendAtMs = new Date(existingToken.lastSentAt).getTime() + config.verificationResendCooldownSeconds * 1000;

    if (Number.isFinite(nextResendAtMs) && now < nextResendAtMs) {
      return {
        issued: true,
        throttled: true,
        nextResendAt: new Date(nextResendAtMs).toISOString()
      };
    }
  }

  const verificationToken = generateEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(verificationToken);

  if (existingToken) {
    await pool.query(
      `UPDATE email_verification_tokens
       SET used_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [existingToken.id]
    );
  }

  await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at, last_sent_at)
     VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 second'), NOW())`,
    [userId, tokenHash, config.verificationTokenTtlSeconds]
  );

  return {
    issued: true,
    throttled: false,
    verificationToken
  };
}

export async function registerUser(input) {
  const { email, password, displayName } = validateRegistrationInput(input);

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, status)
       VALUES ($1, $2, $3, 'pending_verification')
       RETURNING id, email, display_name AS "displayName", created_at AS "createdAt", status`,
      [email, passwordHash, displayName]
    );

    const user = result.rows[0];
    const verification = await issueVerificationTokenForUser(user.id);

    return {
      ...user,
      verificationToken: verification.verificationToken || null
    };
  } catch (error) {
    if (error?.code === '23505') {
      throw new AuthConflictError('Account already exists for this email.');
    }

    throw error;
  }
}

export async function loginUser(input) {
  const { email, password } = validateLoginInput(input);

  const userResult = await pool.query(
    `SELECT id, email, password_hash, display_name AS "displayName", status
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  const userRecord = userResult.rows[0];
  if (!userRecord) {
    throw new AuthUnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  const passwordMatches = await bcrypt.compare(password, userRecord.password_hash);
  if (!passwordMatches) {
    throw new AuthUnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  if (typeof userRecord.status !== 'string' || userRecord.status.toLowerCase() !== 'active') {
    throw new AuthUnauthorizedError(INACTIVE_ACCOUNT_MESSAGE);
  }

  const sessionToken = generateSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 second'))`,
    [userRecord.id, tokenHash, config.sessionMaxAgeSeconds]
  );

  return {
    sessionToken,
    user: {
      id: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.displayName
    }
  };
}

export async function getSessionUserByToken(sessionToken) {
  if (typeof sessionToken !== 'string' || !sessionToken.trim()) {
    return null;
  }

  const tokenHash = hashSessionToken(sessionToken.trim());
  const result = await pool.query(
    `SELECT u.id, u.email, u.display_name AS "displayName"
     FROM sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );

  return result.rows[0] || null;
}

export async function revokeSessionByToken(sessionToken, revokeReason = 'logout') {
  if (typeof sessionToken !== 'string' || !sessionToken.trim()) {
    throw new AuthUnauthorizedError('No authenticated session.');
  }

  const tokenHash = hashSessionToken(sessionToken.trim());
  const result = await pool.query(
    `UPDATE sessions
     SET revoked_at = NOW(),
         updated_at = NOW()
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()
     RETURNING id`,
    [tokenHash]
  );

  if (result.rowCount === 0) {
    throw new AuthUnauthorizedError('No authenticated session.');
  }

  return { revoked: true, reason: revokeReason };
}

export async function requestPasswordReset(input) {
  const { email } = validateForgotPasswordInput(input);

  const userResult = await pool.query(
    `SELECT id, status
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  const userRecord = userResult.rows[0];
  if (!userRecord) {
    return { requested: true };
  }

  if (typeof userRecord.status === 'string' && userRecord.status.toLowerCase() !== 'active') {
    return { requested: true };
  }

  const resetToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(resetToken);

  await pool.query(
    `DELETE FROM password_reset_tokens
     WHERE user_id = $1
       AND used_at IS NULL`,
    [userRecord.id]
  );

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 second'))`,
    [userRecord.id, tokenHash, config.passwordResetTokenTtlSeconds]
  );

  return {
    requested: true,
    resetToken
  };
}

export async function resetPassword(input) {
  const { token, password } = validateResetPasswordInput(input);
  const tokenHash = hashPasswordResetToken(token);
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

  const result = await pool.query(
    `UPDATE password_reset_tokens prt
     SET used_at = NOW(),
         updated_at = NOW()
     FROM users u
     WHERE prt.user_id = u.id
       AND prt.token_hash = $1
       AND prt.used_at IS NULL
       AND prt.expires_at > NOW()
       AND (
         u.status IS NULL
         OR LOWER(u.status) = 'active'
       )
     RETURNING u.id AS "userId"`,
    [tokenHash]
  );

  if (result.rowCount === 0) {
    throw new AuthValidationError(INVALID_RESET_PASSWORD_INPUT_MESSAGE);
  }

  const userId = result.rows[0].userId;

  await pool.query(
    `UPDATE users
     SET password_hash = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, userId]
  );

  await pool.query(
    `UPDATE sessions
     SET revoked_at = NOW(),
         updated_at = NOW()
     WHERE user_id = $1
       AND revoked_at IS NULL`,
    [userId]
  );

  return { reset: true };
}

export async function issueVerification(input) {
  const { email } = validateIssueVerificationInput(input);

  const userResult = await pool.query(
    `SELECT id, status, email_verified_at AS "emailVerifiedAt"
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  const user = userResult.rows[0];
  if (!user) {
    return { issued: true };
  }

  if (user.emailVerifiedAt || String(user.status || '').toLowerCase() === 'active') {
    return { issued: true };
  }

  return issueVerificationTokenForUser(user.id);
}

export async function resendVerification(input) {
  return issueVerification(input);
}

export async function confirmVerification(input) {
  const { token } = validateConfirmVerificationInput(input);
  const tokenHash = hashEmailVerificationToken(token);

  const verificationResult = await pool.query(
    `UPDATE email_verification_tokens evt
     SET used_at = NOW(),
         updated_at = NOW()
     FROM users u
     WHERE evt.user_id = u.id
       AND evt.token_hash = $1
       AND evt.used_at IS NULL
       AND evt.expires_at > NOW()
       AND (
         u.email_verified_at IS NULL
         OR LOWER(COALESCE(u.status, '')) = 'pending_verification'
       )
     RETURNING u.id AS "userId"`,
    [tokenHash]
  );

  if (verificationResult.rowCount === 0) {
    throw new AuthValidationError(INVALID_CONFIRM_VERIFICATION_INPUT_MESSAGE);
  }

  const userId = verificationResult.rows[0].userId;
  await pool.query(
    `UPDATE users
     SET email_verified_at = COALESCE(email_verified_at, NOW()),
         status = 'active',
         updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );

  await pool.query(
    `UPDATE email_verification_tokens
     SET used_at = COALESCE(used_at, NOW()),
         updated_at = NOW()
     WHERE user_id = $1
       AND used_at IS NULL`,
    [userId]
  );

  return { verified: true };
}
