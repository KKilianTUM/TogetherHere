# Frontend Auth Flows

## Auth bootstrap foundation (S14.1)

The frontend now relies on a single auth-state module (`assets/js/authState.js`) as the source of truth for authentication status across pages.

### Bootstrap behavior

- Auth bootstrap uses `GET /auth/me` with `credentials: include`.
- Bootstrap is **deduplicated**: parallel calls share one in-flight request to prevent race conditions.
- Until `/auth/me` resolves, auth state is `loading`; once resolved it becomes either:
  - `authenticated` with `user`
  - `guest` with `user = null`
- Legacy token storage remnants (`token`, `authToken`, `sessionToken`, `user`, `currentUser`) are cleared from `localStorage` and `sessionStorage` during bootstrap to enforce cookie-session-only behavior.

### Route guards

Reusable route guards now standardize page-level access decisions:

- `requireAuthenticated()` for protected pages (e.g. `activities.html`)
  - redirects unauthenticated users to `login.html`
  - appends `returnTo=<current page>` for post-login navigation continuity
- `requireGuest()` for guest-only pages (`login.html`, `register.html`)
  - redirects authenticated users to `activities.html`

### Shared nav rendering contract

`mountAuthNavigation()` in `assets/js/navAuth.js` is used to normalize nav rendering:

- guest navigation actions are shown only when auth state is `guest`
- authenticated actions (`Hi, <name>`, activities shortcut, logout) are shown only when auth state is `authenticated`
- logout uses `POST /auth/logout` and then transitions to guest state + `index.html`

## Registration (`register.html`)

The registration screen is implemented as a progressive enhancement form that submits through shared auth utilities.

### Payload mapping to backend

The submit handler sends `POST /auth/register` through `registerRequest` in `assets/js/authApi.js`.

Payload keys are aligned with the frozen auth contract:

```json
{
  "displayName": "Together User",
  "email": "user@example.com",
  "password": "StrongPassw0rd!"
}
```

### Client-side validation (UX only)

Client validation mirrors backend constraints for faster feedback, but the backend remains the source of truth.

Rules:

- `displayName`: required, trimmed, 2-50 chars, allowed chars `[A-Za-z0-9 _-]`
- `email`: required, valid email shape
- `password`: required, 12-128 chars, must include lowercase, uppercase, number, and symbol

Inline validation behavior:

- each field has an associated error container
- invalid fields are marked with `aria-invalid="true"`
- blur validation updates individual field errors
- submit validation renders all errors before request dispatch

### Submission states

The registration form includes explicit states:

- **idle**: submit enabled (`Create account`)
- **loading**: submit disabled (`Creating…`) and live status message
- **error**: form-level error message with backend-aware mapping
- **success**: confirmation message then transition to login flow

### Backend response handling

`register.js` maps backend responses to clear user guidance:

- `409`: duplicate email account
- `400`: invalid details / weak or invalid password guidance
- `5xx`: generic temporary server failure fallback
- network failure: generic connectivity fallback

### Navigation and post-registration transition

- Header link: `Already have account? Log in` → `login.html`
- Successful registration redirects to `login.html?registered=1` after status feedback delay

## Login (`login.html`)

The login flow remains wired through `loginRequest` and now applies guest-only guarding before rendering.
