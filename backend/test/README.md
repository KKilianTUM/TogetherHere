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
