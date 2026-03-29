# Security Decisions Contract (S11.2 Implemented)

Status: **definitive for S11.2 implementation**.

This contract records the implemented web security decisions.

## 1) Session transport strategy and credentialed CORS

**Decision:** primary browser auth strategy remains `cookie-session`.

- Session token is transported through session cookie name `SESSION_COOKIE_NAME`.
- For allowlisted origins, CORS sets `Access-Control-Allow-Credentials: true` only when `AUTH_TRANSPORT_STRATEGY=cookie-session`.
- Non-allowlisted origins do not receive credentialed CORS headers.

## 2) Frontend origin allowlist source

**Decision:** trusted frontend origins are sourced from `CORS_ALLOWED_ORIGINS`.

- `FRONTEND_ORIGIN_ALLOWLIST_SOURCE` remains `CORS_ALLOWED_ORIGINS`.
- CORS returns concrete origin (no wildcard) when origin is in allowlist.

## 3) Allowed methods and headers for CORS

**Decision:** CORS exposure is constrained to application needs.

- Supported methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- Supported request headers: `content-type`, `authorization`, `x-csrf-token`.
- Runtime config values are normalized to this supported set; unsupported values are ignored.

## 4) Cookie security policy

**Decision:** auth/session and CSRF cookies must carry explicit attributes.

Session cookie values:

- `HttpOnly=true`
- `Secure=SESSION_COOKIE_SECURE`
- `SameSite=SESSION_COOKIE_SAMESITE`
- `Path=SESSION_COOKIE_PATH` (default `/`)
- `Domain=SESSION_COOKIE_DOMAIN` (default unset)
- `Max-Age=SESSION_MAX_AGE_SECONDS`

CSRF cookie values:

- `HttpOnly=true`
- `Secure=CSRF_COOKIE_SECURE`
- `SameSite=CSRF_COOKIE_SAMESITE`
- `Path=CSRF_COOKIE_PATH` (default `/`)
- `Domain=CSRF_COOKIE_DOMAIN` (default unset)
- `Max-Age=CSRF_COOKIE_MAX_AGE_SECONDS` (default 43200)

## 5) CSRF protection scope and bootstrap

**Decision:** validate CSRF token for all non-safe methods.

- Safe methods (`GET`, `HEAD`, `OPTIONS`) are exempt.
- Protected methods (`POST`, `PUT`, `PATCH`, `DELETE`) require token in `CSRF_HEADER_NAME` (default `x-csrf-token`).
- `GET /csrf-token` provides bootstrap token for client apps.
- Missing/invalid token returns standard payload with message `Invalid CSRF token.` and status `403`.

## 6) Security headers baseline

**Decision:** security middleware sets baseline response headers:

- `Content-Security-Policy`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-site`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

