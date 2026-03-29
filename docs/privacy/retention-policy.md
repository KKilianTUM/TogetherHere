# Privacy Retention Policy

This policy defines how long TogetherHere keeps personal data tied to authentication and session management.

## Retention principles

1. **Purpose limitation**: Keep personal data only as long as required for the stated purpose.
2. **Storage limitation**: Delete or anonymize data after retention windows end.
3. **Security-first exceptions**: Temporary extensions are allowed only for legal hold, fraud, or incident-response needs.
4. **Documented controls**: All retention/deletion behavior should be implemented through auditable jobs and runbooks.

## Standard retention schedule

| Data domain | Fields | Default retention |
|---|---|---|
| Account records | `users.*` | Life of account; deleted within **30 days** of approved account deletion. |
| Active sessions | `sessions` rows where session is still valid | Until `expires_at` or explicit revocation. |
| Expired/revoked session audit records | `sessions.*` including `ip_address`, `user_agent`, `revoke_reason` | **90 days** after session termination. |

## Deletion workflow

1. **Trigger**: User deletion request, account closure, or timed expiration.
2. **Queue**: Mark records eligible for deletion with a scheduled timestamp.
3. **Execute**: Hard-delete eligible rows after waiting period.
4. **Verify**: Log deletion batch counts and failures for operator review.

## Exception handling

Retention may be extended beyond defaults when:
- A valid legal preservation request exists.
- A security incident requires forensic preservation.
- Abuse-prevention teams need temporary evidence retention.

Any extension must include:
- Owner approval,
- Scope of affected records,
- Start/end date,
- Reason and ticket reference.

## Field-to-retention mapping reference

For field-level mapping of purpose + retention windows, see `docs/privacy/data-inventory.md`.
