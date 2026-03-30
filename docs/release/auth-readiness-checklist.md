# Auth Readiness Checklist

Date: 2026-03-30  
Scope: Contract conformance review against `docs/contracts/auth-api.md` and frontend auth-state contract in `docs/frontend-auth.md`.

## Final Verdict

- **Overall status:** ⚠️ **Mostly compliant, with one contract-shape mismatch to resolve before release sign-off.**
- **Blocking issue:** `/auth/verification/issue` and `/auth/verification/resend` do not always include the documented success-shape keys (`throttled`, `verificationToken`) when account is missing/already active.

---

## 1) Endpoint inventory and routing

- [x] `POST /auth/register` implemented and publicly routed.
- [x] `POST /auth/login` implemented and publicly routed.
- [x] `POST /auth/logout` implemented and protected by authenticated-session middleware.
- [x] `GET /auth/me` implemented and protected by authenticated-session middleware.
- [x] `POST /auth/verification/issue` implemented and publicly routed.
- [x] `POST /auth/verification/resend` implemented and publicly routed.
- [x] `POST /auth/verification/confirm` implemented and publicly routed.

## 2) Request payload conformance

- [x] Register accepts `{ email, password, displayName }` and rejects unknown fields.
- [x] Login accepts `{ email, password }` and rejects unknown fields.
- [x] Verification issue/resend accept `{ email }` and reject unknown fields.
- [x] Verification confirm accepts `{ token }` and rejects unknown fields.
- [x] Frontend login request sends `{ email, password }`.
- [x] Frontend register request sends `{ displayName, email, password }`.
- [x] Frontend auth requests use JSON + `credentials: include`.

## 3) Status-code conformance

### Core auth endpoints

- [x] `POST /auth/register` returns `201` on success.
- [x] `POST /auth/register` maps validation failures to `400`.
- [x] `POST /auth/register` maps duplicate-email conflicts to `409`.
- [x] `POST /auth/login` returns `200` on success.
- [x] `POST /auth/login` maps invalid input to `400`.
- [x] `POST /auth/login` maps invalid credentials/inactive account to `401`.
- [x] `POST /auth/logout` returns `204` on success.
- [x] `POST /auth/logout` returns `401` when no valid authenticated session exists.
- [x] `GET /auth/me` returns `200` with user when authenticated.
- [x] `GET /auth/me` returns `401` when unauthenticated.

### Verification endpoints

- [x] `POST /auth/verification/issue` returns `200` for success paths.
- [x] `POST /auth/verification/resend` returns `200` for success paths.
- [x] `POST /auth/verification/confirm` returns `200` with `{ verified: true }` on success.
- [x] `POST /auth/verification/confirm` returns `400` for invalid/expired/used token cases.

## 4) Response-body shape conformance

### Compliant

- [x] Register success includes `user` with `id`, `email`, `displayName`, `createdAt`, `status`, `verificationToken`.
- [x] Login success includes `user` with `id`, `email`, `displayName`.
- [x] Me success includes `user` with `id`, `email`, `displayName`.
- [x] Logout success returns `204` with no body.
- [x] Verification confirm success returns `{ "verified": true }`.
- [x] Error responses follow `{ error, message }` envelope, with `error = "Internal Server Error"` for 5xx and `error = "Request Error"` for non-5xx failures.

### Mismatch

- [ ] **Contract mismatch:** verification issue/resend responses are not shape-stable across all success cases.
  - Contract documents normal success as:
    - `{ issued: true, throttled: false, verificationToken: "..." }`, and
    - throttled success as `{ issued: true, throttled: true, nextResendAt: "..." }`.
  - Implementation returns only `{ issued: true }` when user is absent or already active/verified, omitting `throttled` (and naturally no token).
  - This can break strict clients expecting a stable response schema.

## 5) Auth state handling (frontend) vs docs

- [x] Bootstrap source of truth is centralized in `authState` module.
- [x] Bootstrap uses `GET /auth/me` and deduplicates concurrent in-flight requests.
- [x] Bootstrap states include `loading`, `authenticated`, `guest`, `error`.
- [x] `401/403` from `/auth/me` resolve to `guest`.
- [x] Unexpected/network failures resolve to `error`.
- [x] Legacy token/session keys are removed from local/session storage during bootstrap.
- [x] Route guards enforce guest-only and auth-only navigation behavior.
- [x] Logout flow calls `/auth/logout`, marks local guest, force-rebootstraps via `/auth/me`, and navigates to `index.html`.

## 6) Evidence run

- Static verification by code inspection completed for routes/controllers/services/frontend auth utilities.
- Integration test suite exists and covers contract-critical lifecycle and auth statuses.
- Full runtime integration test execution in this environment is blocked by unavailable local PostgreSQL test instance (`ECONNREFUSED` to `postgresql://postgres:postgres@localhost:5432/togetherhere_test`).

## 7) Release recommendation

- **Do not mark full auth contract readiness as complete yet.**
- Resolve the verification issue/resend success-shape mismatch by either:
  1. Making backend success responses schema-stable per contract across all success branches, **or**
  2. Updating the frozen contract doc to explicitly document the `{ issued: true }` variant (requires contract-change process).
- After fix, rerun integration tests in an environment with reachable test DB and attach green test output to release artifacts.
