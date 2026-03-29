# Deployment

## EU/EEA Hosting Requirement

TogetherHere must be hosted in the **EU/EEA**. This requirement applies to:

- API/runtime hosting
- PostgreSQL database hosting
- Any object or file storage
- Logging and monitoring sinks that store production data

## Selected Region

The selected AWS region is **eu-central-1 (Frankfurt, Germany)**.

Use this region consistently across all production services to keep data residency aligned with the EU/EEA hosting requirement.

## Environment Templates

Use the provided templates:

- `backend/.env.development.example`
- `backend/.env.production.example`

Required deployment variables include:

- `DATABASE_URL`
- `AUTH_ACCESS_TOKEN_SECRET`
- `AUTH_REFRESH_TOKEN_SECRET`
- `COOKIE_DOMAIN`
- `ALLOWED_FRONTEND_ORIGIN`
- `LOG_LEVEL`
