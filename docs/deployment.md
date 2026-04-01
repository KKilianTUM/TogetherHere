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
- `/auth` is rewritten to `https://api.togetherhere.example/auth`.
- `/auth/*` is rewritten to `https://api.togetherhere.example/auth/*`.
- `/csrf-token` is rewritten to `https://api.togetherhere.example/csrf-token`.

Rewrite contract:
- Requests remain same-origin from the browser perspective (`/auth/*`, `/csrf-token` from the frontend origin).
- Vercel rewrites forward the incoming HTTP method, request headers, and cookies to the backend target.
- Response headers/cookies from the backend are returned to the browser, so `credentials: "include"` in `assets/js/authApi.js` continues to work for session + CSRF cookies.

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
- `SESSION_COOKIE_NAME=__Secure-th_session`
- `CSRF_COOKIE_NAME=__Secure-th_csrf`
- `SESSION_COOKIE_SECURE=true`
- `CSRF_COOKIE_SECURE=true`
- `SESSION_COOKIE_PATH=/`
- `CSRF_COOKIE_PATH=/`
- `AUTH_ACCESS_TOKEN_SECRET`
- `AUTH_REFRESH_TOKEN_SECRET`
- `LOG_LEVEL`

CORS/cookie contract for production:
- `ALLOWED_FRONTEND_ORIGIN` must include the deployed frontend origin (for example, `https://app.togetherhere.example`).
- `CORS_ALLOWED_ORIGINS` should contain that same origin (comma-separated when multiple origins are needed).
- Backend runtime merges both values into the active CORS allowlist so auth bootstrap calls (`GET /auth/me`) are accepted from the deployed frontend.
- `SESSION_COOKIE_DOMAIN` and `CSRF_COOKIE_DOMAIN` should be set to the shared parent domain (for example, `.togetherhere.example`).
- When cookie `Domain` is set for cross-subdomain auth, use `__Secure-` cookie name prefixes (not `__Host-`) because `__Host-` cookies must not include a `Domain` attribute.
- Keep cookie SameSite policy at `Lax` (session) and `Strict` (CSRF) unless architecture changes from this same-site app/api model.

## 4) Deploy in this order

1. Provision/update backend infrastructure in EU/EEA and apply environment variables from `backend/.env.production.example`.
   - At minimum set: `DATABASE_URL`, `ALLOWED_FRONTEND_ORIGIN=https://<your-vercel-domain-or-custom-domain>`, `CORS_ALLOWED_ORIGINS=https://<same-frontend-origin>`, `SESSION_COOKIE_DOMAIN=.yourdomain.com`, `CSRF_COOKIE_DOMAIN=.yourdomain.com`, `SESSION_COOKIE_SECURE=true`, `CSRF_COOKIE_SECURE=true`, plus auth rate-limit variables for your traffic profile.
2. Run database migrations against production before enabling public traffic (`./scripts/db-migrate.sh` with production `DATABASE_URL`).
3. Deploy backend API and verify health/auth endpoints (`/csrf-token`, `/auth/me`) on `https://api.togetherhere.example`.
4. Deploy frontend on Vercel with root `vercel.json` present.
5. Run smoke checks from frontend origin:
   - `GET /csrf-token` succeeds.
   - `GET /auth/me` returns `401`/`403` for guests (not `404` or network failure).
   - Login/logout/auth bootstrap flows complete using relative paths.
   - `login.html` and `register.html` remain interactive (no bootstrap lock caused by missing auth routes).

## 5) Operational guardrails

- Keep routing changes in `vercel.json` only.
- Keep auth path changes in `assets/js/authApi.js` only.
- Keep deploy variable changes in backend env templates only.

If a deployment requires changes outside those three locations, document and review the exception before release.
