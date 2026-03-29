# Web Security Runtime Configuration (S11.2)

This document records the **implemented** runtime controls for the API web-security layer.

## 1) CORS policy

### Source of truth

- Frontend origin allowlist is read from `CORS_ALLOWED_ORIGINS`.
- `FRONTEND_ORIGIN_ALLOWLIST_SOURCE` remains a decision marker and should be `CORS_ALLOWED_ORIGINS`.

### Behavior

- CORS headers are only returned when request `Origin` is explicitly allowlisted.
- `Access-Control-Allow-Origin` is set to the concrete origin value (never `*`).
- `Access-Control-Allow-Methods` is restricted to: `GET, POST, PUT, PATCH, DELETE, OPTIONS` (and runtime values are normalized to this supported set).
- `Access-Control-Allow-Headers` is restricted to: `content-type, authorization, x-csrf-token` (and runtime values are normalized to this supported set).
- `Access-Control-Allow-Credentials: true` is only returned when `AUTH_TRANSPORT_STRATEGY=cookie-session`.
- Preflight requests (`OPTIONS`) return `204`.

### Environment defaults

- `local` and `development`
  - `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`
  - Methods/headers use the restricted set above.
- `production`
  - `CORS_ALLOWED_ORIGINS` default is empty and must be set explicitly at deploy time.

## 2) Session cookie policy

When using cookie-backed auth (`AUTH_TRANSPORT_STRATEGY=cookie-session`), the session cookie is configured with:

- `HttpOnly` always enabled
- `Secure` controlled by `SESSION_COOKIE_SECURE`
- `SameSite` controlled by `SESSION_COOKIE_SAMESITE` (default `Lax`)
- `Path` controlled by `SESSION_COOKIE_PATH` (default `/`)
- `Domain` controlled by `SESSION_COOKIE_DOMAIN` (default unset)
- `Max-Age` controlled by `SESSION_MAX_AGE_SECONDS` (default 7 days)

### Environment defaults

- `local` and `development`
  - `SESSION_COOKIE_SECURE=false`
  - `SESSION_COOKIE_SAMESITE=Lax`
  - `SESSION_COOKIE_PATH=/`
  - `SESSION_COOKIE_DOMAIN=` (unset)
- `production`
  - `SESSION_COOKIE_SECURE=true`
  - `SESSION_COOKIE_SAMESITE=Lax`
  - `SESSION_COOKIE_PATH=/`
  - `SESSION_COOKIE_DOMAIN=` (set explicitly if multi-subdomain deployment requires it)

## 3) CSRF protection

### Issuance/bootstrap

- `GET /csrf-token` returns `{ "csrfToken": "..." }`.
- CSRF middleware also ensures a CSRF secret cookie exists and sets it if missing.

CSRF cookie policy:

- Cookie name: `CSRF_COOKIE_NAME` (default `__Host-th_csrf`)
- `HttpOnly` always enabled
- `Secure` controlled by `CSRF_COOKIE_SECURE`
- `SameSite` controlled by `CSRF_COOKIE_SAMESITE` (default `Strict`)
- `Path` controlled by `CSRF_COOKIE_PATH` (default `/`)
- `Domain` controlled by `CSRF_COOKIE_DOMAIN` (default unset)
- `Max-Age` controlled by `CSRF_COOKIE_MAX_AGE_SECONDS` (default 12 hours)

### Validation

- All non-safe methods (`POST`, `PUT`, `PATCH`, `DELETE`) require a matching token via `CSRF_HEADER_NAME` (default `x-csrf-token`).
- Safe methods (`GET`, `HEAD`, `OPTIONS`) are exempt.
- Missing/invalid token returns `403` with standardized error payload.

### Client integration note

Browser clients should:

1. Call `GET /csrf-token` before the first state-changing request.
2. Store the returned token in memory.
3. Send token on each write request in the configured header (default `x-csrf-token`).
4. Send credentials/cookies with requests when using cookie-session auth.

## 4) Security headers baseline

The API sets this header baseline in middleware:

- `Content-Security-Policy`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-site`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

