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

- Keep `SameSite=Lax` on the session cookie as baseline browser-level CSRF mitigation.
- Enforce explicit CSRF validation for all state-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`).
- Mint an `HttpOnly` CSRF secret cookie and derive a request token server-side.
- Require clients to send the derived token in `X-CSRF-Token` (or configured equivalent header).
- Expose token retrieval through `GET /csrf-token` for first-party clients.

## Decision 3: CORS policy

Current contract:

- Default deny cross-origin credentials requests.
- Allowlist explicit trusted origins only.
- If credentials are enabled for an origin, set `Access-Control-Allow-Credentials: true` and a concrete origin (never `*`).
- Keep auth endpoints private to first-party frontend origin(s) by default.
