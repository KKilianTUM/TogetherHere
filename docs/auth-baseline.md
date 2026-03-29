# Auth & DB Baseline (v1)

This document freezes the **integration baseline** for auth-related work. New feature branches should be based on `integration/auth-baseline` and must keep this contract stable unless a deliberate versioned change is approved.

## 1) Database schema v1

### `users`
Required columns for auth and identity:

- `id BIGINT` primary key
- `email TEXT NOT NULL` (case-insensitive unique index on `LOWER(email)`)
- `password_hash TEXT NOT NULL`
- `display_name TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `email_verified_at TIMESTAMPTZ NULL`
- `status TEXT NOT NULL DEFAULT 'pending_verification'` with check:
  - `pending_verification`
  - `active`
  - `suspended`
  - `disabled`

### `sessions`
Session records are the source of truth for active sessions:

- `id BIGINT` primary key
- `user_id BIGINT NOT NULL` references `users(id)` with `ON DELETE CASCADE`
- `token_hash TEXT NOT NULL UNIQUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `expires_at TIMESTAMPTZ NOT NULL` (`expires_at > created_at`)
- `revoked_at TIMESTAMPTZ NULL`
- `revoke_reason TEXT NULL`
- `ip_address INET NULL`
- `user_agent TEXT NULL`

## 2) Auth API contract (v1)

Base path: same API host as backend app.

### `POST /auth/register`
Creates a new user account.

Request body:

```json
{
  "email": "user@example.com",
  "password": "StrongPassw0rd!",
  "displayName": "Together User"
}
```

Success response (`201`):

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "Together User",
    "createdAt": "2026-03-29T00:00:00.000Z"
  }
}
```

### `POST /auth/login`
Authenticates credentials and creates a server-side session.

Request body:

```json
{
  "email": "user@example.com",
  "password": "StrongPassw0rd!"
}
```

Success response (`200`):

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "Together User"
  }
}
```

### `POST /auth/logout`
Revokes the current session.

Success response (`204`): no response body.

### `GET /auth/me`
Returns the currently authenticated user from active session context.

Success response (`200`):

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "Together User"
  }
}
```

## 3) Token/session approach (v1 decision)

**Chosen approach: cookie-backed server sessions** (not JWT access/refresh tokens).

- Backend issues a random opaque session token.
- Only the **hash** of the token is stored in `sessions.token_hash`.
- Session token is sent in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- `POST /auth/logout` revokes current session (`revoked_at` + optional `revoke_reason`).
- `GET /auth/me` requires non-expired, non-revoked session.

## 4) Error response format (v1)

All non-2xx responses from auth endpoints should use:

```json
{
  "error": "Request Error",
  "message": "Human-readable message"
}
```

For server failures (`5xx`), `error` must be `Internal Server Error`.
