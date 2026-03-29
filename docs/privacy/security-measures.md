# Privacy Security Measures

This document lists baseline technical and organizational controls that protect personal data in auth and session systems.

## Data minimization and handling

- Collect only data fields required by the auth/session contracts.
- Do not store plaintext credentials or plaintext session tokens.
- Prefer hashed identifiers for sensitive authentication material (`password_hash`, `token_hash`).
- Restrict access to account/session tables by least privilege.

## Access controls

- Enforce role-based access for production data stores.
- Require strong operator authentication (SSO + MFA where available).
- Log administrative access to user/session records.
- Review privileged access grants on a recurring schedule.

## Encryption and transport

- Encrypt client-server traffic with TLS.
- Use encrypted storage/backups for databases containing personal data.
- Protect secrets (DB credentials, signing keys) in managed secret stores.

## Monitoring and detection

- Monitor failed login spikes, unusual IP/user-agent changes, and mass session revocations.
- Alert on anomalous access to auth tables and credential-related operations.
- Maintain incident-response playbooks for account/session compromise scenarios.

## Retention and deletion controls

- Enforce retention windows defined in `docs/privacy/data-inventory.md`.
- Run scheduled cleanup for expired/revoked session records at or before 90 days.
- Run account-deletion cleanup within 30 days after approved deletion requests.
- Preserve records only when a legal hold or active incident requires temporary delay.

## Assurance activities

- Periodically test account deletion and session cleanup jobs.
- Validate that API responses expose only required user fields.
- Track security control changes through code review and documented approvals.
