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

function parseCsv(input, fallback = []) {
  if (!input) {
    return fallback;
  }

  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

const config = {
  env: nodeEnv,
  port: Number(process.env.PORT || 3000),
  ...selectedConfig,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/togetherhere',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || '__Host-th_session',
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 7),
  corsAllowedOrigins: parseCsv(process.env.CORS_ALLOWED_ORIGINS, selectedConfig.corsAllowedOrigins || []),
  corsAllowedMethods: parseCsv(process.env.CORS_ALLOWED_METHODS, selectedConfig.corsAllowedMethods || ['GET']),
  corsAllowedHeaders: parseCsv(process.env.CORS_ALLOWED_HEADERS, selectedConfig.corsAllowedHeaders || ['Content-Type']),
  csrfCookieName: process.env.CSRF_COOKIE_NAME || '__Host-th_csrf',
  csrfHeaderName: (process.env.CSRF_HEADER_NAME || 'x-csrf-token').toLowerCase()
};

export default config;
