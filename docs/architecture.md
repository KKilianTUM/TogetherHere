# Architecture Overview

## Target Architecture

```mermaid
flowchart LR
    U[User Browser] --> CDN[Static Hosting / CDN]
    CDN --> APP[Node.js 20 + Express API]
    APP --> DB[(PostgreSQL 16)]
    APP --> OBJ[Object Storage for Images/Assets]
```

## Data Flow Summary

1. A user loads the web UI from static hosting/CDN.
2. The UI sends API requests to the Express service (Node.js 20 runtime).
3. The API validates input, applies business rules, and reads/writes PostgreSQL 16.
4. Media/static blobs (if needed) are served from object storage, referenced by API records.
5. All services are deployed in **AWS eu-central-1 (Frankfurt)** to keep workloads in an explicit EU region.

## Secrets & Key Management

- Application secrets (database URL, token signing keys, SMTP credentials) are stored in a managed secret manager, not in repository files or container images.
- The API service reads secrets at runtime via IAM role in `eu-central-1`.
- Signing/encryption keys are managed as versioned keys (`kid`) with active and grace-period states to support zero-downtime rotation.
- For runbook-level detail, refer to `docs/security-secrets-and-key-rotation.md`.
