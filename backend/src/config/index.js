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

const config = {
  env: nodeEnv,
  port: Number(process.env.PORT || 3000),
  ...selectedConfig,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/togetherhere'
};

export default config;
