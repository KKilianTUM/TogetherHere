# S19 Readiness Checklist

## Scope boundary for S19.1

- [x] Fixed test/framework/config blockers that existed before S19 feature work.
- [x] Kept S19.1 focused on test reliability and CI parity only (no new S19 functional scope).

## Preconditions for S19.2 branch work

- [ ] Deterministic CI run confirmed on Node.js 20 with PostgreSQL-backed integration tests.
- [ ] No flaky auth/security tests across repeated runs (local and CI parity mode).
- [ ] Shared test utilities adopted:
  - [x] single test app factory (`backend/test/support/testApp.js`)
  - [x] single auth helper for cookie/CSRF handling (`backend/test/support/authClient.js`)
  - [x] deterministic reset fixture for DB + auth rate-limit state (`backend/test/support/resetFixture.js`)
- [ ] Local and CI env matrix documented and reviewed:
  - [x] `NODE_ENV=test`
  - [x] `TEST_DATABASE_URL` / `DATABASE_URL` target a test-only database
  - [x] aligned security defaults for CORS/CSRF/session/rate-limit

## Merge sequencing rule

- [ ] Merge `task/S19.1-security-test-readiness` first.
- [ ] Create S19.2 branch from the merged S19.1 commit only.
