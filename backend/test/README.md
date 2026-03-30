# Backend integration tests

These tests are designed to run against a dedicated test database.

## Required environment

- `TEST_DATABASE_URL` (optional): defaults to `postgresql://postgres:postgres@localhost:5432/togetherhere_test`
- `DATABASE_URL` (optional): if omitted, tests automatically use `TEST_DATABASE_URL`

The test suite refuses to run if `DATABASE_URL` does not contain `test`, to avoid using production-like databases by mistake.

## Run

```bash
cd backend
npm test
```

## CI parity mode

Use the same security-related env defaults as CI and run serially for deterministic output:

```bash
cd backend
npm run test:ci-parity
```

Before running locally, ensure the test database exists and has migrations applied:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/togetherhere_test ./scripts/db-migrate.sh
```
