import pool from '../db/pool.js';
import { hashToken } from '../utils/token.js';

const AUTH_CONTEXT_QUERY = `
  SELECT
    s.id AS session_id,
    s.user_id,
    s.expires_at,
    u.email,
    u.status,
    u.email_verified_at,
    u.created_at
  FROM public.sessions s
  INNER JOIN public.users u ON u.id = s.user_id
  WHERE s.token_hash = $1
    AND s.revoked_at IS NULL
    AND s.expires_at > NOW()
  LIMIT 1
`;

export const getSessionAuthContextByToken = async (rawToken) => {
  const tokenHash = hashToken(rawToken);

  const { rows } = await pool.query(AUTH_CONTEXT_QUERY, [tokenHash]);
  if (!rows.length) {
    return null;
  }

  const row = rows[0];

  return {
    session: {
      id: row.session_id,
      userId: row.user_id,
      expiresAt: row.expires_at
    },
    user: {
      id: row.user_id,
      email: row.email,
      status: row.status,
      emailVerifiedAt: row.email_verified_at,
      createdAt: row.created_at
    }
  };
};

export const revokeSessionById = async (sessionId, reason = 'user_logout') => {
  const REVOKE_QUERY = `
    UPDATE public.sessions
    SET revoked_at = NOW(),
        revoke_reason = COALESCE($2, 'user_logout')
    WHERE id = $1
      AND revoked_at IS NULL
  `;

  await pool.query(REVOKE_QUERY, [sessionId, reason]);
};
