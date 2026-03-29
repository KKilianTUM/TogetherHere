# Merge Rules for Parallel Work

## Baseline policy

- Baseline branch: `integration/auth-baseline`
- Merge this baseline first.
- All new task branches must be created from this baseline branch (or from a descendant that already includes it).

## File ownership map

- **Auth API surface** (`backend/src/routes/authRoutes.js`, `backend/src/controllers/authController.js`): Auth/API owners.
- **Auth business logic** (`backend/src/services/authService.js`): Auth domain owners.
- **Security middleware** (`backend/src/middleware/security.js`, `backend/src/middleware/errorHandler.js`): Platform/security owners.
- **Database schema and migrations** (`db/migrations/*`, `scripts/db-migrate.sh`): Data/platform owners.
- **Contract docs** (`docs/auth-baseline.md`, this file): Tech lead / integration owner.

## Migration naming rules

- Use 4-digit, zero-padded prefixes.
- Pattern: `NNNN_<verb>_<subject>.sql`
  - Examples: `0002_add_users_display_name.sql`, `0003_add_session_cleanup_index.sql`
- Never edit an already-applied migration in shared environments.
- Add a new forward-only migration for any schema change.

## “No direct edits” list (contract files)

The following files are contract-defining; changes require explicit coordination and review from all owners:

- `docs/auth-baseline.md`
- `backend/src/routes/authRoutes.js`
- `backend/src/controllers/authController.js`
- `backend/src/middleware/errorHandler.js`
- `db/migrations/0001_initial_schema.sql`

If a change is required, propose it in a dedicated PR titled with `contract-change:` prefix.
