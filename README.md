# TogetherHere

## Chosen Stack

This project standardizes on **Node.js + Express + PostgreSQL** for future backend and data services.

## Runtime & Deployment Targets

- **Runtime version:** Node.js **20 LTS** (target: `20.x`)
- **Package manager:** **pnpm** (target: `pnpm@9`)
- **Database engine/version:** **PostgreSQL 16**
- **Hosting provider:** **Amazon Web Services (AWS)**
- **Explicit EU/EEA region:** **eu-central-1 (Frankfurt, Germany)**

## Why this stack

- Node.js/Express keeps API development fast and straightforward.
- PostgreSQL provides reliable relational modeling for users, activities, and participation data.
- AWS eu-central-1 keeps hosting in an EU region suitable for data residency planning.

## Security Baseline

- Runtime secrets (DB URL, token keys, SMTP credentials) must be loaded from a managed secret store (for AWS, use Secrets Manager + KMS in `eu-central-1`).
- A checked-in `.env.example` is provided with placeholders and secret references only; raw key/credential values must never be committed.
- Signing and encryption keys follow a rotation lifecycle with active + grace-period keys; see `docs/security-secrets-and-key-rotation.md`.
