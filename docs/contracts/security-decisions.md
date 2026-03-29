# Security Decisions Contract (Pre-S11 Baseline)

Status: **definitive for S11.1 merge-readiness**.

This contract freezes security decisions that must stay stable while integrating security middleware.

## 1) Session transport strategy (cookie vs token)

**Decision:** use cookie-backed server sessions as the single auth transport strategy.

- No bearer-token-only auth flow is supported for frontend/browser traffic.
- Backend mints random opaque session tokens and stores only token hashes in `sessions.token_hash`.
- Session cookie attributes are environment-driven through config keys:
  - `SESSION_COOKIE_NAME`
  - `SESSION_COOKIE_SECURE`
  - `SESSION_COOKIE_SAMESITE`
  - `SESSION_MAX_AGE_SECONDS`
- `POST /auth/login` sets the session cookie.
- `POST /auth/logout` revokes current session and clears the session cookie.

## 2) Frontend origin allowlist source

**Decision:** trusted frontend origins are sourced from `CORS_ALLOWED_ORIGINS`.

- `CORS_ALLOWED_ORIGINS` is the only runtime allowlist input used by CORS middleware.
- `FRONTEND_ORIGIN_ALLOWLIST_SOURCE` exists as a decision marker and must stay `CORS_ALLOWED_ORIGINS` unless a future contract version changes this.
- If request origin is not in allowlist, do not set credentialed CORS headers.
- When allowlisted, return concrete origin and `Access-Control-Allow-Credentials: true`.

## 3) CSRF requirement scope

**Decision:** enforce CSRF validation on all non-safe HTTP methods.

- CSRF middleware runs globally and applies to every `POST/PUT/PATCH/DELETE` request.
- Safe methods (`GET`, `HEAD`, `OPTIONS`) are exempt.
- CSRF values use these keys:
  - `CSRF_COOKIE_NAME`
  - `CSRF_COOKIE_SECURE`
  - `CSRF_COOKIE_SAMESITE`
  - `CSRF_HEADER_NAME`
- Missing or invalid CSRF tokens must return the standard error payload shape:
  `{ "error": "Request Error", "message": "Invalid CSRF token." }`.

## 4) Error payload normalization

**Decision:** auth-related middleware and routes must emit one shared non-2xx error format.

- 4xx responses: `error = "Request Error"`.
- 5xx responses: `error = "Internal Server Error"`.
- Payload shape always:

```json
{
  "error": "Request Error",
  "message": "Human-readable message"
}
```
