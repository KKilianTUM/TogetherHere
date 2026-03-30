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

2. **unit/integration tests**
   - Starts a temporary PostgreSQL 16 service (`togetherhere_test`).
   - Checks out the repository and installs backend dependencies.
   - Runs `./scripts/db-migrate.sh` with `DATABASE_URL=postgres://postgres:postgres@localhost:5432/togetherhere_test`.
   - Runs `npm test` in `backend/` with `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/togetherhere_test`.
   - This executes the integration suite, including auth lockout/rate-limit and CSRF enforcement coverage.

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
- Replace the test auto-skip logic once unit/integration suites are added.
- Extend artifact contents if additional deployable assets are introduced.

## Running the CI test command locally

To mirror the CI integration-test stage:

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/togetherhere_test
./scripts/db-migrate.sh
cd backend
TEST_DATABASE_URL="$DATABASE_URL" npm test
```
