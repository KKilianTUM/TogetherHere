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
- `BACKEND_API_ORIGIN` (for frontend edge rewrites; include scheme, e.g. `https://api.example.com`)
- `COOKIE_DOMAIN` (backend cookie domain for session + csrf cookies)
- `ALLOWED_FRONTEND_ORIGIN`
- `CORS_ALLOWED_ORIGINS` (optional CSV allowlist; `ALLOWED_FRONTEND_ORIGIN` is also accepted and merged in)
- `LOG_LEVEL`

## Frontend API Routing (Same-Origin Calls)

`assets/js/authApi.js` sends credentialed requests to same-origin paths:

- `/auth/*`
- `/csrf-token`

In production, deploy the frontend with edge rewrites so those paths proxy to the backend origin. This keeps browser requests same-origin from the frontend's perspective while still reaching the API service.

The root `vercel.ts` config expects:

- `BACKEND_API_ORIGIN=https://<backend-host>`

Configured rewrites:

- `/auth/(.*)` → `${BACKEND_API_ORIGIN}/auth/$1`
- `/csrf-token` → `${BACKEND_API_ORIGIN}/csrf-token`

## Cookie + CORS Requirements for `credentials: "include"`

Because auth requests include credentials, backend CORS/cookie settings must be explicit:

- Set `ALLOWED_FRONTEND_ORIGIN` to the canonical frontend origin (e.g. `https://www.togetherhere.app`).
- If using multiple origins, set `CORS_ALLOWED_ORIGINS` as a CSV list. The backend merges this list with `ALLOWED_FRONTEND_ORIGIN`.
- Ensure `COOKIE_DOMAIN` and secure/samesite settings align with your production domain strategy.

## Auth Bootstrap Contract (`GET /auth/me`)

Guest-capable pages depend on a deterministic unauthenticated response:

- `GET /auth/me` must return `401` when no valid session exists.
- It must **not** fail as network error / `404` due to missing rewrite config.

Validation tips after deploy:

1. Load frontend app without signing in.
2. In browser devtools, confirm `GET /auth/me` resolves through the frontend origin path.
3. Confirm response status is `401` with JSON body (not network failure).
