# S14 Implementation Checklist (Auth Bootstrap + Guards)

Status: **implemented**.

## Auth bootstrap

- [x] App/page startup resolves auth via shared auth API utility (`GET /auth/me` via `meRequest`).
- [x] Global auth state is initialized through a single deduplicated bootstrap flow.
- [x] Bootstrap states include `loading`, `authenticated`, `guest`, and `error`.

## Route guards

- [x] Protected-page guard redirects unauthenticated users to login.
- [x] Protected-page guard includes optional `returnTo` to restore user intent.
- [x] Guest-only guard prevents authenticated users from opening login/register pages.
- [x] Guards expose error fallback hook for unexpected bootstrap failures.

## Conditional navigation

- [x] Guest nav renders login/register only for guest state.
- [x] Auth nav renders user label + protected links + logout only for authenticated state.
- [x] Loading nav state is rendered while auth status is unresolved.

## Logout

- [x] Logout UI calls `POST /auth/logout`.
- [x] Logout clears local auth state and force-refreshes bootstrap state deterministically.
- [x] Logout returns user to public landing page.

## UI lifecycle robustness

- [x] Guest-only forms show loading state while bootstrap is in progress.
- [x] Protected page shows loading/skeleton banner while auth status is unknown.
- [x] Bootstrap error fallback is rendered when `/auth/me` fails unexpectedly.

## Manual verification steps

1. **Unauthenticated -> protected redirect**
   - Open `activities.html` in a fresh session.
   - Confirm redirect to `login.html?returnTo=activities.html`.
2. **Authenticated -> guest-page block**
   - Log in successfully.
   - Open `login.html` and `register.html` directly.
   - Confirm redirect to `activities.html`.
3. **Conditional nav rendering**
   - On `index.html` as guest, confirm login/register links are visible.
   - On `index.html` as authenticated user, confirm profile label, activities link, and logout are visible.
4. **Logout determinism**
   - From authenticated navigation, click logout.
   - Confirm request is sent, app returns to `index.html`, and guest nav is shown.
5. **Bootstrap error fallback**
   - Simulate `/auth/me` network/server failure (e.g., stop backend).
   - Confirm guest pages show error fallback and keep forms blocked.
   - Confirm protected page shows error fallback with Retry action.
