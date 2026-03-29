import pool from '../db/pool.js';

export async function getHealthStatus() {
  let db = 'unknown';

  try {
    await pool.query('SELECT 1');
    db = 'up';
  } catch {
    db = 'down';
  }

  return {
    status: db === 'up' ? 'ok' : 'degraded',
    db,
    timestamp: new Date().toISOString()
  };
}
