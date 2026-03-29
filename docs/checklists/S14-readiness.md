# S14 Readiness Checklist

## Resolved blockers (auth-state foundation)

- [x] Single auth-state source introduced (`assets/js/authState.js`) and shared by pages/components.
- [x] Duplicate auth initialization removed by deduplicated `bootstrapAuthState()` flow.
- [x] Route-guard behavior standardized:
  - [x] one reusable protected-page guard (`requireAuthenticated`)
  - [x] one reusable guest-only guard (`requireGuest`)
- [x] Initial render/auth resolution race addressed via guard-first page entrypoints (`activities-entry.js`, guarded login/register init).
- [x] Cookie-session assumption enforced and token-storage remnants cleared during bootstrap.
- [x] Nav rendering contract centralized (`mountAuthNavigation`) for guest vs authenticated actions.

## Merge preconditions

- [ ] Verify login -> protected route redirect with `returnTo` survives the full flow.
- [ ] Verify authenticated user cannot access `login.html` or `register.html`.
- [ ] Verify unauthenticated user is redirected from `activities.html` to `login.html`.
- [ ] Verify logout consistently clears session and renders guest navigation on landing pages.
- [ ] Confirm docs (`contracts/auth-api.md`, `frontend-auth.md`) align with actual bootstrap implementation.
