# Auth API Contract (Frozen v1)

Status: **frozen for stabilization merge**.

This file defines the canonical auth endpoint payloads and error codes. Any change requires a dedicated `contract-change:` PR.

## Base path

All endpoints are served from the backend API host.

## Session model assumptions

- Authentication is cookie-session based.
- Frontend clients must send `credentials: include` for auth endpoints.
- Frontend must not rely on bearer tokens in `localStorage`/`sessionStorage`.
- `GET /auth/me` is the canonical bootstrap endpoint to determine initial auth state.

## Endpoints

### `POST /auth/register`

Creates a user account in `pending_verification` status and issues an email verification token.

Request body:

```json
{
  "email": "user@example.com",
  "password": "StrongPassw0rd!",
  "displayName": "Together User"
}
```

Success (`201`):

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "Together User",
    "createdAt": "2026-03-29T00:00:00.000Z",
    "status": "pending_verification",
    "verificationToken": "raw-token-for-delivery"
  }
}
```

Error codes:

- `400` invalid request payload / validation failure
- `409` account already exists for email
- `500` internal server error

### `POST /auth/login`

Authenticates credentials and creates a server-side session. Account status must be `active`.

Request body:

```json
{
  "email": "user@example.com",
  "password": "StrongPassw0rd!"
}
```

Success (`200`):

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "Together User"
  }
}
```

Error codes:

- `400` invalid request payload / validation failure
- `401` invalid email/password or account is not active
- `500` internal server error

### `POST /auth/logout`

Revokes the current session.

Success (`204`): no response body.

Error codes:

- `401` no authenticated session
- `500` internal server error

### `GET /auth/me`

Returns the currently authenticated user from active session context.

Success (`200`):

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "Together User"
  }
}
```

Error codes:

- `401` unauthenticated / session invalid or expired
- `500` internal server error

### `POST /auth/verification/issue`

Issues a verification token for a pending account.

Request body:

```json
{
  "email": "user@example.com"
}
```

Success (`200`):

```json
{
  "issued": true,
  "throttled": false,
  "verificationToken": "raw-token-for-delivery"
}
```

Throttled success (`200`):

```json
{
  "issued": true,
  "throttled": true,
  "nextResendAt": "2026-03-30T10:00:00.000Z"
}
```

### `POST /auth/verification/resend`

Resends verification token with the same payload/response contract as `/auth/verification/issue`.

### `POST /auth/verification/confirm`

Confirms a verification token and activates account status.

Request body:

```json
{
  "token": "raw-token"
}
```

Success (`200`):

```json
{
  "verified": true
}
```

Error codes:

- `400` invalid token payload or expired/used token
- `500` internal server error

## Error response shape

All non-2xx responses from auth endpoints use:

```json
{
  "error": "Request Error",
  "message": "Human-readable message"
}
```

For server failures (`5xx`), `error` is always `Internal Server Error`.

## Frontend UI payload mapping (stabilization)

The current frontend UI layer must submit auth requests with these exact keys:

- Login form payload: `{ "email": string, "password": string }`
- Register form payload: `{ "displayName": string, "email": string, "password": string }`

Normalization rules used by frontend helpers:

- Request body is always JSON with `Content-Type: application/json`.
- Session-bearing auth calls send credentials with `credentials: include`.
- Error messaging prefers `message` from API response body when present.
