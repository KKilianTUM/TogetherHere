import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

const sslConfig = config.dbSsl
  ? {
      rejectUnauthorized: false
    }
  : false;

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: sslConfig
});

export default pool;
