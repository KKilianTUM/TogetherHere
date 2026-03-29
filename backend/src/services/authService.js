import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import config from '../config/index.js';
import pool from '../db/pool.js';

const BCRYPT_COST_FACTOR = 12;
const SESSION_TOKEN_BYTES = 48;
const ACTIVE_ACCOUNT_STATUS = 'active';

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

function validateRegistrationInput(input) {
  if (!input || typeof input !== 'object') {
    throw new AuthValidationError('Invalid registration input.');
  }

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = input.password;
  const displayName = input.displayName;

  if (!isValidEmail(email) || !validatePassword(password) || !validateDisplayName(displayName)) {
    throw new AuthValidationError('Unable to process registration input.');
  }

  return {
    email,
    password,
    displayName: typeof displayName === 'string' ? displayName.trim() : null
  };
}

function validateLoginInput(input) {
  if (!input || typeof input !== 'object') {
    throw new AuthValidationError('Invalid login input.');
  }

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = input.password;

  if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
    throw new AuthValidationError('Unable to process login input.');
  }

  return { email, password };
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateSessionToken() {
  return crypto.randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
}

export async function registerUser(input) {
  const { email, password, displayName } = validateRegistrationInput(input);
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name AS "displayName", created_at AS "createdAt"`,
      [email, passwordHash, displayName]
    );

    return result.rows[0];
  } catch (error) {
    if (error?.code === '23505') {
      throw new AuthConflictError('Unable to register account with provided credentials.');
    }

    throw error;
  }
}

export async function loginUser(input) {
  const { email, password } = validateLoginInput(input);

  const userResult = await pool.query(
    `SELECT id, email, display_name AS "displayName", password_hash AS "passwordHash", status
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  const user = userResult.rows[0];

  if (!user) {
    throw new AuthUnauthorizedError('Invalid email or password.');
  }

  const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordMatch) {
    throw new AuthUnauthorizedError('Invalid email or password.');
  }

  if (user.status !== ACTIVE_ACCOUNT_STATUS) {
    throw new AuthUnauthorizedError('Account is not active.');
  }

  const sessionToken = generateSessionToken();
  const sessionTokenHash = hashSessionToken(sessionToken);

  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 second'))`,
    [user.id, sessionTokenHash, config.sessionTtlSeconds]
  );

  return {
    sessionToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName
    }
  };
}
