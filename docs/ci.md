# CI pipeline

This repository uses a GitHub Actions workflow at `.github/workflows/ci.yml`.

## Triggers

The CI workflow runs on:

- pushes to `main`
- all pull requests

## Stages

The pipeline is intentionally sequential. Each stage must pass before the next starts.

1. **lint**
   - Checks out the repository.
   - Sets up Node.js 20.
   - Installs backend dependencies with `npm install` in `backend/`.
   - Runs `npm run check` (Node syntax checks).

2. **unit/integration tests (CI parity)**
   - Checks out the repository and installs backend dependencies.
   - Starts PostgreSQL 16 (`togetherhere_test`).
   - Applies migrations to the test database via `./scripts/db-migrate.sh`.
   - Runs `npm run test:ci-parity` in `backend/` with explicit auth/security env defaults (CORS/CSRF/rate-limit).
   - Enforces deterministic ordering with `--test-concurrency=1`.

3. **migration validation**
   - Starts a temporary PostgreSQL 16 service.
   - Installs the PostgreSQL CLI client (`psql`).
   - Executes `./scripts/db-migrate.sh` against the ephemeral database using `DATABASE_URL`.
   - Fails when migration checksums differ from previously applied files or SQL execution errors occur.

4. **build artifact**
   - Re-installs backend dependencies.
   - Creates `dist/togetherhere-app.tar.gz` containing:
     - `backend/`
     - `db/`
     - `scripts/`
     - `assets/`
     - `index.html`
     - `activities.html`
     - `README.md`
   - Uploads the tarball as a GitHub Actions artifact named `togetherhere-app`.

## Failure behavior

- Any non-zero command in a stage fails that stage.
- Later stages are blocked by `needs` dependencies.
- A failed `lint`, `tests`, or `migration-validation` stage prevents artifact generation.

## Extending the pipeline

- Add stricter linting by introducing dedicated lint scripts in `backend/package.json` and updating the `lint` stage.
- Extend integration suites by reusing `backend/test/support/` helpers for shared app/auth/reset behavior.
- Extend artifact contents if additional deployable assets are introduced.

## Fast local run for S19 security tests

When iterating on S19 (rate-limit + CSRF) coverage, run only the auth integration suite with CI-parity security defaults:

```bash
cd backend
NODE_ENV=test \
DATABASE_URL=${TEST_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/togetherhere_test} \
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173 \
CSRF_COOKIE_SECURE=false \
SESSION_COOKIE_SECURE=false \
AUTH_RATE_LIMIT_WINDOW_MS=900000 \
AUTH_RATE_LIMIT_BASE_BACKOFF_MS=1000 \
AUTH_RATE_LIMIT_MAX_BACKOFF_MS=60000 \
AUTH_RATE_LIMIT_LOCKOUT_THRESHOLD=10 \
AUTH_RATE_LIMIT_LOCKOUT_MS=900000 \
node --test --test-concurrency=1 test/integration/auth.integration.test.js
```

For complete CI parity (all integration files), use `npm run test:ci-parity` from `backend/`.
