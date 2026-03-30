# S19 Implementation Checklist

## S19.1 baseline stabilization

- [x] Security/auth integration test harness stabilized for deterministic runs.
- [x] Shared fixtures and reset helpers wired into integration tests.
- [x] CI parity command documented for local reproduction.

## S19.2 rate-limit + CSRF coverage

- [x] Added integration test coverage for progressive auth throttling after repeated failures.
- [x] Added integration test coverage for lockout enforcement windows and unlock/cooldown recovery.
- [x] Added cookie-session CSRF coverage for missing, malformed, and valid token paths on state-changing auth requests.
- [x] Added CSRF policy checks for safe/idempotent routes.
- [x] Added mixed-origin CORS + credentials behavior checks aligned to configured allowlist policy.
- [x] Ensured deterministic timing in security tests via bounded test-only rate-limit settings and explicit waits with margins.

## Merge gate criteria

- [ ] `npm run check` passes.
- [ ] `npm run test:ci-parity` passes.
- [ ] `./scripts/db-migrate.sh` succeeds against a fresh validation database.
