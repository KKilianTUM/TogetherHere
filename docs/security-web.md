# Web Security Decisions (v1)

This document captures the browser-facing security posture for TogetherHere API integrations.

## 1) CORS allowlist

We use an explicit origin allowlist for credentialed requests.

- **Default policy:** deny cross-origin requests unless `Origin` is explicitly listed in `CORS_ALLOWED_ORIGINS`.
- **Allowed origins:** receive:
  - `Access-Control-Allow-Origin: <origin>` (never `*`)
  - `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` from config
- **Disallowed origins:** receive `403` with a generic request error (including preflight `OPTIONS`).
- **No `Origin` header:** request is treated as same-origin/non-browser and proceeds normally.

Why:

- Prevent accidental exposure of cookie-authenticated endpoints to arbitrary third-party sites.
- Keep production secure-by-default when `CORS_ALLOWED_ORIGINS` is empty.

## 2) Secure cookie flags

Session and CSRF cookies are hardened with browser security attributes.

### Session cookie (`__Host-th_session`)

- `HttpOnly` (not readable by JavaScript)
- `Secure` (HTTPS only)
- `SameSite=Lax` (mitigates ambient cross-site sends while preserving common same-site flows)
- `Path=/`

### CSRF secret cookie (`__Host-th_csrf`)

- `HttpOnly`
- `Secure`
- `SameSite=Strict`
- `Path=/`
- short TTL (`Max-Age=43200`, 12 hours)

Why:

- `HttpOnly` reduces token/cookie exfiltration risk via XSS.
- `Secure` prevents transport over plain HTTP.
- `SameSite` provides baseline CSRF resistance at the browser layer.
- Host-prefixed cookie names (`__Host-...`) enforce additional browser constraints.

## 3) CSRF mechanism for cookie-based auth

Because auth uses cookies, we enforce a server-validated CSRF token for all non-safe HTTP methods.

Mechanism:

1. Server ensures a per-client CSRF secret exists in an `HttpOnly` cookie.
2. Server derives a deterministic token from that secret via HMAC-SHA256.
3. `GET /csrf-token` returns `{ "csrfToken": "..." }`.
4. Frontend sends that token in header `X-CSRF-Token` (configurable via `CSRF_HEADER_NAME`) on `POST/PUT/PATCH/DELETE`.
5. Server recomputes expected token and compares using timing-safe equality.
6. Mismatch/missing token returns `403 Invalid CSRF token`.

This is a synchronized-token pattern suitable for cookie-backed sessions while keeping the secret inaccessible to JavaScript.

## Frontend integration checklist

- Call `GET /csrf-token` before first state-changing request (or on app bootstrap).
- Include `credentials: 'include'` on fetch/XHR calls.
- Send `X-CSRF-Token` for every non-GET/HEAD/OPTIONS API request.
- On `403 Invalid CSRF token`, refresh token (`GET /csrf-token`) and retry once.
