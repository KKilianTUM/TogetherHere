# Secrets Management & Key Rotation

This project should never store live credentials in source control, checked-in configs, or container images.
Use a managed secret store and short-lived runtime access.

## 1) Move all secrets to a secret manager

Store these items only in your secret manager (for example: AWS Secrets Manager + KMS):

- Database credentials (`DATABASE_URL` or split DB host/user/password) behind `DATABASE_SECRET_ID`
- JWT signing material in KMS/HSM or secret manager, referenced by `TOKEN_KEYS_SECRET_ID`
- Encryption keys / key references (`ENCRYPTION_ACTIVE_KEY_ID`, keyset metadata, `ENCRYPTION_KEYS_SECRET_ID`)
- SMTP credentials referenced through `SMTP_SECRET_ID`
- Any API tokens and integration credentials

### Recommended AWS layout (eu-central-1)

Use path-based names:

- `/togetherhere/<env>/db`
- `/togetherhere/<env>/tokens`
- `/togetherhere/<env>/encryption`
- `/togetherhere/<env>/smtp`

Grant runtime access through IAM roles only (no long-lived shared secrets in code or CI variables where avoidable).

## 2) Runtime loading pattern

1. App starts with only non-sensitive bootstrap config (region, secret prefix, environment).
2. App reads secret payloads from secret manager at boot.
3. App validates required fields and exits fast on missing data.
4. App caches secrets in memory with a short refresh window (for example 5–15 minutes) or fetches on demand.
5. App never logs secret values.

## 3) Key rotation strategy (signing + encryption)

Adopt multi-key verification/decryption with one active key for new operations.

### Key model

- Each key has a unique `kid` (key id), `created_at`, `status` (`active`, `verify-only`, `decrypt-only`, `retired`), and optional `expires_at`.
- **Active key**: used for new token signing or encryption.
- **Allowed old keys**: accepted only for verify/decrypt until sunset.

### Token signing rotation (JWT example)

1. Generate new keypair in KMS/HSM or secure key pipeline.
2. Publish public key in JWKS and add `kid` to `TOKEN_ALLOWED_KIDS`.
3. Switch signer to the new `TOKEN_ACTIVE_KID` and update `TOKEN_KEYS_SECRET_ID` version/reference.
4. Keep previous key(s) verify-only for at least `max_token_ttl + clock_skew`.
5. Retire old key by removing from JWKS after grace period.

### Encryption key rotation

1. Create new encryption key and set `ENCRYPTION_ACTIVE_KEY_ID`.
2. Encrypt all newly written data with the active key id.
3. Decrypt using key id embedded in ciphertext metadata.
4. Re-encrypt old records in background batches.
5. Retire decrypt-only keys once re-encryption completion is verified.

### Suggested cadence

- Signing keys: every 60–90 days
- Encryption keys: every 90–180 days
- Immediate rotation on suspected compromise or personnel offboarding events

## 4) Operational safeguards

- Enable secret versioning and audit logs in secret manager.
- Alert on secret access anomalies and failed decrypt/verify spikes.
- Use least-privilege IAM and split read access by environment.
- Document and test emergency rotation runbooks quarterly.
- Ensure backups and restore procedures keep key/version mappings intact.

## 5) CI/CD and local development

- CI pipelines fetch secrets at runtime using workload identity/OIDC where possible.
- Do not print secrets in build logs.
- `.env.example` contains placeholders and secret *references* only (not raw key material).
- Developers use a personal `.env` (gitignored) or local secret-sync tooling.
