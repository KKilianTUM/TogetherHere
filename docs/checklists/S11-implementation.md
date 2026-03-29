# S11.2 Implementation Verification Checklist

Use this checklist to verify deployed behavior matches implemented web security controls.

## CORS

- [ ] Request from allowlisted origin receives `Access-Control-Allow-Origin` echo value.
- [ ] Request from non-allowlisted origin does **not** receive CORS allow headers.
- [ ] `Access-Control-Allow-Methods` only includes required methods (`GET, POST, PUT, PATCH, DELETE, OPTIONS`).
- [ ] `Access-Control-Allow-Headers` only includes required headers (`content-type, authorization, x-csrf-token`).
- [ ] `Access-Control-Allow-Credentials: true` is present only for `AUTH_TRANSPORT_STRATEGY=cookie-session`.
- [ ] Preflight `OPTIONS` requests return `204`.

## Session cookie flags

- [ ] Login response sets session cookie with `HttpOnly`.
- [ ] Session cookie `Secure` matches environment policy.
- [ ] Session cookie `SameSite` matches runtime config.
- [ ] Session cookie `Path` and `Domain` match runtime config.
- [ ] Session cookie `Max-Age` equals configured `SESSION_MAX_AGE_SECONDS`.
- [ ] Logout clears session cookie (`Max-Age=0`) with same path/domain scope.

## CSRF behavior

- [ ] `GET /csrf-token` returns token JSON payload.
- [ ] CSRF cookie is issued when absent and carries expected flags (`HttpOnly`, `Secure`, `SameSite`, `Path`, `Domain`, `Max-Age`).
- [ ] State-changing request without CSRF header returns `403` and standardized error payload.
- [ ] State-changing request with valid CSRF header is accepted (subject to route auth rules).
- [ ] Safe methods (`GET`, `HEAD`, `OPTIONS`) do not require CSRF token.

## Route behavior consistency

- [ ] `/health` remains publicly accessible without auth.
- [ ] `/csrf-token` remains publicly accessible for token bootstrap.
- [ ] `/auth/register` and `/auth/login` enforce CSRF on write semantics.
- [ ] `/auth/logout` and `/auth/me` keep existing auth requirements intact.
- [ ] Error payload shape remains standardized for CSRF/auth failures.

