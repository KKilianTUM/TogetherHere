# User & Session Schema Contract (Frozen v1)

Status: **frozen for stabilization merge**.

This file defines canonical user/session table contracts. Any change requires a new migration and a dedicated `contract-change:` PR.

## `users`

Required columns:

- `id BIGINT` primary key
- `email TEXT NOT NULL` (case-insensitive unique index on `LOWER(email)`)
- `password_hash TEXT NOT NULL`
- `display_name TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `email_verified_at TIMESTAMPTZ NULL`
- `status TEXT NOT NULL DEFAULT 'pending_verification'` with check values:
  - `pending_verification`
  - `active`
  - `suspended`
  - `disabled`


## `email_verification_tokens`

Required columns:

- `id BIGINT` primary key
- `user_id BIGINT NOT NULL` references `users(id)` with `ON DELETE CASCADE`
- `token_hash TEXT NOT NULL UNIQUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `expires_at TIMESTAMPTZ NOT NULL` (`expires_at > created_at`)
- `used_at TIMESTAMPTZ NULL`
- `last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

## `sessions`

Source of truth for active sessions.

Required columns:

- `id BIGINT` primary key
- `user_id BIGINT NOT NULL` references `users(id)` with `ON DELETE CASCADE`
- `token_hash TEXT NOT NULL UNIQUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `expires_at TIMESTAMPTZ NOT NULL` (`expires_at > created_at`)
- `revoked_at TIMESTAMPTZ NULL`
- `revoke_reason TEXT NULL`
- `ip_address INET NULL`
- `user_agent TEXT NULL`

## Migration policy for this contract

- Never rewrite already-applied shared migrations.
- Any schema evolution must be additive/forward-only via a new migration file.
- Keep migration naming pattern: `NNNN_<verb>_<subject>.sql`.
