# Frontend Auth Flows

## Auth bootstrap foundation (S14.2)

The frontend relies on a single auth-state module (`assets/js/authState.js`) as the source of truth for authentication status across pages.

### Bootstrap behavior

- App/page startup calls `bootstrapAuthState()` and resolves auth through shared `meRequest()` (`GET /auth/me`) in `assets/js/authApi.js`.
- Bootstrap is **deduplicated**: parallel calls share one in-flight request.
- Bootstrap states are explicit:
  - `loading` while session status is unresolved
  - `authenticated` with `user` when `/auth/me` returns `200`
  - `guest` when `/auth/me` returns `401/403`
  - `error` for unexpected failures (network/5xx/unexpected response)
- Legacy token storage remnants (`token`, `authToken`, `sessionToken`, `user`, `currentUser`) are cleared from `localStorage` and `sessionStorage` during bootstrap to enforce cookie-session-only behavior.

## Route-guard flow

Reusable route guards in `assets/js/routeGuards.js` standardize page-level access decisions:

- `requireAuthenticated()` for protected pages (e.g. `activities.html`)
  - redirects unauthenticated users to `login.html`
  - appends `returnTo=<current page>` for post-login continuity
  - supports `onError` fallback rendering when bootstrap fails unexpectedly
- `requireGuest()` for guest-only pages (`login.html`, `register.html`)
  - redirects authenticated users to `activities.html`
  - supports `onError` fallback rendering when bootstrap fails unexpectedly

## Navigation rendering contract

`mountAuthNavigation()` in `assets/js/navAuth.js` controls conditional navigation rendering:

- while auth is unresolved (`unknown`/`loading`), nav loading nodes are shown and guest/auth links are hidden
- guest nav actions (login/register) are shown only when state is `guest`
- authenticated actions (`Hi, <name>`, activities, logout) are shown only when state is `authenticated`

## Logout flow

Logout UI is wired through `POST /auth/logout` via `logoutRequest()`.

On logout click:

1. send logout request
2. mark local state as logged out (`guest`)
3. force a fresh bootstrap (`GET /auth/me`) for deterministic state reconciliation
4. navigate to `index.html`

## Page lifecycle states

### Guest-only pages (`login.html`, `register.html`)

- disable form controls and show `Checking your session…` while auth bootstrap runs
- if bootstrap resolves to authenticated, redirect to `activities.html`
- if bootstrap resolves to guest, enable form controls and render normal form UX
- if bootstrap resolves to error, render explicit error fallback and keep form submission blocked

### Protected page (`activities.html`)

- show a bootstrap banner (`Checking your session…`) before protected content initialization
- if unauthenticated, redirect to login with `returnTo`
- if bootstrap fails unexpectedly, show an error fallback with `Retry` action
- initialize activities module only after authenticated access is confirmed

## Registration (`register.html`)

Registration submits through shared auth utilities using `POST /auth/register`:

```json
{
  "displayName": "Together User",
  "email": "user@example.com",
  "password": "StrongPassw0rd!"
}
```

Client-side validation remains UX-only; backend validation is authoritative.

## Login (`login.html`)

Login submits through shared auth utilities (`POST /auth/login`) and:

- stores authenticated user in global auth state
- redirects to `returnTo` target (if valid `*.html`) or `activities.html`
