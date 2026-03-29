# Security Decisions Contract (Frozen v1)

Status: **frozen for stabilization merge**.

This file captures authentication transport and web security policy decisions that downstream tasks must follow.

## Decision 1: Cookie sessions vs JWT

**Chosen:** cookie-backed server sessions (not JWT access/refresh token pair).

Rationale and required behavior:

- Backend mints a random opaque session token.
- Only a hash of the token is stored (`sessions.token_hash`).
- Session token is delivered in a cookie with `HttpOnly`, `Secure`, `SameSite=Lax`.
- `/auth/logout` revokes the current session (`revoked_at` and optional `revoke_reason`).
- `/auth/me` requires a non-expired and non-revoked session.

## Decision 2: CSRF approach

Current contract:

- Rely on `SameSite=Lax` session cookie as baseline CSRF mitigation.
- Treat state-changing auth endpoints as same-site only unless explicitly opened.
- If cross-site state-changing requests are introduced later, add explicit CSRF token validation as a versioned contract update.

## Decision 3: CORS policy

Current contract:

- Default deny cross-origin credentials requests.
- Allowlist explicit trusted origins only.
- If credentials are enabled for an origin, set `Access-Control-Allow-Credentials: true` and a concrete origin (never `*`).
- Keep auth endpoints private to first-party frontend origin(s) by default.
