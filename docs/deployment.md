# Deployment (Canonical)

This document defines the **single supported deployment flow** for TogetherHere.

## Hosting model

- **Frontend:** Vercel static hosting (project root).
- **Backend API:** single production API origin at `https://api.togetherhere.example`.
- **Database + API infrastructure region:** EU/EEA (target region: **eu-central-1**, Frankfurt).

Do not mix alternate routing approaches (per-page hardcoded API origins, ad-hoc proxy snippets, or environment-specific route logic outside `vercel.json`).

## 1) Configure frontend routing in one place

Routing/proxy behavior is centralized in root `vercel.json`.

Expected behavior:
- `/auth/*` is rewritten to `https://api.togetherhere.example/auth/*`.
- `/csrf-token` is rewritten to `https://api.togetherhere.example/csrf-token`.

This keeps frontend auth calls relative-path based while still reaching the API origin in production.

## 2) Keep frontend auth calls relative

`assets/js/authApi.js` is the source of truth for frontend auth transport.

Required paths:
- `/csrf-token`
- `/auth/me`
- `/auth/login`
- `/auth/register`
- `/auth/logout`

Do not introduce absolute auth URLs in page scripts or feature modules.

## 3) Configure backend environment

Use both templates as references:

- `backend/.env.example` (baseline required keys)
- `backend/.env.production.example` (production values)

Required production values:
- `DATABASE_URL`
- `ALLOWED_FRONTEND_ORIGIN`
- `CORS_ALLOWED_ORIGINS`
- `SESSION_COOKIE_DOMAIN`
- `CSRF_COOKIE_DOMAIN`
- `AUTH_ACCESS_TOKEN_SECRET`
- `AUTH_REFRESH_TOKEN_SECRET`
- `LOG_LEVEL`

## 4) Deploy in this order

1. Provision/update backend infrastructure in EU/EEA and apply environment variables from `backend/.env.production.example`.
2. Deploy backend API and verify health/auth endpoints (`/csrf-token`, `/auth/me`) on `https://api.togetherhere.example`.
3. Deploy frontend on Vercel with root `vercel.json` present.
4. Run smoke checks from frontend origin:
   - `GET /csrf-token` succeeds.
   - Login/logout/auth bootstrap flows complete using relative paths.

## 5) Operational guardrails

- Keep routing changes in `vercel.json` only.
- Keep auth path changes in `assets/js/authApi.js` only.
- Keep deploy variable changes in backend env templates only.

If a deployment requires changes outside those three locations, document and review the exception before release.
