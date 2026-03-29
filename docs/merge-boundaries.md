# Merge Boundaries for Parallel Tasks

Purpose: minimize merge conflicts by assigning clear path ownership and ensuring each new task edits separate files.

## Stabilization baseline

- Stabilization branch: `stabilize/auth-contracts`
- Required merge order: merge this stabilization branch first.
- After merge, every new task branch must start from the merge commit that contains this file and all `docs/contracts/*` files.

## Path ownership map

### Contract owner (integration lead)

- `docs/contracts/auth-api.md`
- `docs/contracts/user-schema.md`
- `docs/contracts/security-decisions.md`
- `docs/merge-boundaries.md`

### Auth API implementation owner

- `backend/src/routes/authRoutes.js`
- `backend/src/controllers/authController.js`

### Auth domain/service owner

- `backend/src/services/authService.js`

### Security/platform owner

- `backend/src/middleware/security.js`
- `backend/src/middleware/errorHandler.js`

### Data/platform owner

- `db/migrations/*`
- `scripts/db-migrate.sh`

## Conflict-avoidance rules for new tasks

1. One task branch should target one owned area whenever possible.
2. If a task needs multiple owned areas, split it into sequenced PRs.
3. Do not edit frozen contract files without a dedicated `contract-change:` PR.
4. Rebase task branches on top of the stabilization merge commit before opening PR.
5. Resolve conflicts locally and keep contract files unchanged unless explicitly version-bumped.
