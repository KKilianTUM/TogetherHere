import pg from 'pg';
import { resetAuthRateLimitStoreForTests } from '../../src/middleware/authRateLimit.js';

const { Pool } = pg;
const TABLES_TO_TRUNCATE = ['email_verification_tokens', 'password_reset_tokens', 'sessions', 'users'];

export function assertSafeTestDatabaseUrl(databaseUrl) {
  const normalized = String(databaseUrl || '').toLowerCase();
  if (!normalized.includes('test')) {
    throw new Error(`Refusing to run auth integration tests against a non-test database URL: ${databaseUrl}`);
  }
}

export function createResetFixture({ databaseUrl }) {
  assertSafeTestDatabaseUrl(databaseUrl);

  const db = new Pool({ connectionString: databaseUrl, ssl: false });

  return {
    db,
    async resetSecurityState() {
      resetAuthRateLimitStoreForTests();
      await db.query(`TRUNCATE ${TABLES_TO_TRUNCATE.join(', ')} RESTART IDENTITY CASCADE`);
    },
    async close() {
      await db.end();
    }
  };
}
