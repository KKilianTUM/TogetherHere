# Privacy Data Inventory

This document inventories personal data processed by TogetherHere auth and session flows.

## Scope

In scope:
- User account data stored in `users`.
- Session and device metadata stored in `sessions`.

Out of scope:
- Product analytics and third-party integrations (none defined in current frozen contracts).

## Data field inventory

| System | Data field | Category | Purpose | Retention window |
|---|---|---|---|---|
| `users` | `id` | Account identifier | Primary key used to link account and session records. | Kept for life of account; removed within **30 days** of account deletion request completion. |
| `users` | `email` | Contact / login identifier | Unique account login and account-recovery communications. | Kept for life of account; removed within **30 days** of account deletion request completion. |
| `users` | `password_hash` | Credential secret (hashed) | Verifies user credentials during sign-in. | Kept for life of account; removed within **30 days** of account deletion request completion. |
| `users` | `display_name` | Profile data | Displays user-chosen name in UI/API responses. | Kept for life of account or until user updates/removes it; hard-deleted with account within **30 days**. |
| `users` | `created_at` | Audit metadata | Tracks account creation for support, audit, and fraud investigations. | Kept for life of account; removed within **30 days** of account deletion request completion. |
| `users` | `updated_at` | Audit metadata | Tracks account profile/status changes. | Kept for life of account; removed within **30 days** of account deletion request completion. |
| `users` | `email_verified_at` | Verification metadata | Records successful email verification to enforce account activation rules. | Kept for life of account; removed within **30 days** of account deletion request completion. |
| `users` | `status` | Account state | Enforces access control (`pending_verification`, `active`, `suspended`, `disabled`). | Kept for life of account; removed within **30 days** of account deletion request completion. |
| `sessions` | `id` | Session identifier | Primary key for session lifecycle and revocation events. | Kept while session is active, then retained for **90 days** after expiration/revocation for security audits. |
| `sessions` | `user_id` | Account linkage | Associates session with account. | Kept while session is active, then retained for **90 days** after expiration/revocation for security audits. |
| `sessions` | `token_hash` | Credential secret (hashed) | Authenticates server-side session without storing plaintext tokens. | Kept while session is active, then retained for **90 days** after expiration/revocation for incident response. |
| `sessions` | `created_at` | Audit metadata | Records session issuance time. | Kept while session is active, then retained for **90 days** after expiration/revocation. |
| `sessions` | `expires_at` | Security metadata | Enforces maximum session lifetime. | Kept while session is active, then retained for **90 days** after expiration/revocation. |
| `sessions` | `revoked_at` | Security metadata | Records explicit logout/admin revocation time. | Kept for **90 days** after revocation for abuse investigation. |
| `sessions` | `revoke_reason` | Security metadata | Explains session invalidation (logout, compromise response, etc.). | Kept for **90 days** after revocation for abuse investigation. |
| `sessions` | `ip_address` | Device/network metadata | Detects suspicious access patterns and supports account security reviews. | Kept for **90 days** after session end. |
| `sessions` | `user_agent` | Device metadata | Supports device/session display and anomaly detection. | Kept for **90 days** after session end. |

## Notes

- Retention windows are operational defaults and should be implemented via scheduled cleanup jobs.
- If a legal hold or active security investigation exists, deletion can be delayed until hold removal is approved.
