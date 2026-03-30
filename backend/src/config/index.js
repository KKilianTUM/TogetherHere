import dotenv from 'dotenv';
import localConfig from './env.local.js';
import developmentConfig from './env.development.js';
import productionConfig from './env.production.js';

const nodeEnv = process.env.NODE_ENV || 'development';

const envFileByEnv = {
  local: '.env.local',
  development: '.env.development',
  production: '.env.production'
};

const selectedEnvFile = envFileByEnv[nodeEnv] || '.env';

dotenv.config({ path: selectedEnvFile });
dotenv.config();

const configByEnv = {
  local: localConfig,
  development: developmentConfig,
  production: productionConfig
};

const selectedConfig = configByEnv[nodeEnv] || developmentConfig;

const SUPPORTED_CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const SUPPORTED_CORS_HEADERS = ['content-type', 'authorization', 'x-csrf-token'];

function parseCsv(input, fallback = []) {
  if (!input) {
    return fallback;
  }

  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseBoolean(input, fallback) {
  if (typeof input !== 'string') {
    return fallback;
  }

  if (input.toLowerCase() === 'true') {
    return true;
  }

  if (input.toLowerCase() === 'false') {
    return false;
  }

  return fallback;
}

function parseNumber(input, fallback) {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCorsMethods(methods) {
  const normalized = methods
    .map((method) => method.toUpperCase())
    .filter((method) => SUPPORTED_CORS_METHODS.includes(method));

  return normalized.length > 0 ? [...new Set(normalized)] : ['GET', 'POST', 'OPTIONS'];
}

function normalizeCorsHeaders(headers) {
  const normalized = headers
    .map((header) => header.toLowerCase())
    .filter((header) => SUPPORTED_CORS_HEADERS.includes(header));

  return normalized.length > 0 ? [...new Set(normalized)] : ['content-type', 'x-csrf-token'];
}

const config = {
  env: nodeEnv,
  port: Number(process.env.PORT || 3000),
  ...selectedConfig,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/togetherhere',
  authTransportStrategy: process.env.AUTH_TRANSPORT_STRATEGY || selectedConfig.authTransportStrategy || 'cookie-session',
  frontendOriginAllowlistSource:
    process.env.FRONTEND_ORIGIN_ALLOWLIST_SOURCE || selectedConfig.frontendOriginAllowlistSource || 'CORS_ALLOWED_ORIGINS',
  corsAllowedOrigins: parseCsv(process.env.CORS_ALLOWED_ORIGINS, selectedConfig.corsAllowedOrigins || []),
  corsAllowedMethods: normalizeCorsMethods(
    parseCsv(process.env.CORS_ALLOWED_METHODS, selectedConfig.corsAllowedMethods || ['GET', 'POST', 'OPTIONS'])
  ),
  corsAllowedHeaders: normalizeCorsHeaders(
    parseCsv(process.env.CORS_ALLOWED_HEADERS, selectedConfig.corsAllowedHeaders || ['Content-Type', 'X-CSRF-Token'])
  ),
  sessionMaxAgeSeconds: Number(process.env.SESSION_MAX_AGE_SECONDS || 60 * 60 * 24 * 7),
  passwordResetTokenTtlSeconds: Number(process.env.PASSWORD_RESET_TOKEN_TTL_SECONDS || 60 * 30),
  sessionCookieName: process.env.SESSION_COOKIE_NAME || '__Host-th_session',
  sessionCookieSecure: parseBoolean(process.env.SESSION_COOKIE_SECURE, selectedConfig.sessionCookieSecure ?? true),
  sessionCookieSameSite: process.env.SESSION_COOKIE_SAMESITE || selectedConfig.sessionCookieSameSite || 'Lax',
  sessionCookiePath: process.env.SESSION_COOKIE_PATH || selectedConfig.sessionCookiePath || '/',
  sessionCookieDomain: process.env.SESSION_COOKIE_DOMAIN || selectedConfig.sessionCookieDomain || '',
  csrfCookieName: process.env.CSRF_COOKIE_NAME || '__Host-th_csrf',
  csrfCookieSecure: parseBoolean(process.env.CSRF_COOKIE_SECURE, selectedConfig.csrfCookieSecure ?? true),
  csrfCookieSameSite: process.env.CSRF_COOKIE_SAMESITE || selectedConfig.csrfCookieSameSite || 'Strict',
  csrfCookiePath: process.env.CSRF_COOKIE_PATH || selectedConfig.csrfCookiePath || '/',
  csrfCookieDomain: process.env.CSRF_COOKIE_DOMAIN || selectedConfig.csrfCookieDomain || '',
  csrfCookieMaxAgeSeconds: parseNumber(
    process.env.CSRF_COOKIE_MAX_AGE_SECONDS,
    selectedConfig.csrfCookieMaxAgeSeconds || 60 * 60 * 12
  ),
  csrfHeaderName: (process.env.CSRF_HEADER_NAME || 'x-csrf-token').toLowerCase(),
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  authRateLimitBaseBackoffMs: Number(process.env.AUTH_RATE_LIMIT_BASE_BACKOFF_MS || 1000),
  authRateLimitMaxBackoffMs: Number(process.env.AUTH_RATE_LIMIT_MAX_BACKOFF_MS || 60 * 1000),
  authRateLimitLockoutThreshold: Number(process.env.AUTH_RATE_LIMIT_LOCKOUT_THRESHOLD || 10),
  authRateLimitLockoutMs: Number(process.env.AUTH_RATE_LIMIT_LOCKOUT_MS || 15 * 60 * 1000)
};

export default config;
