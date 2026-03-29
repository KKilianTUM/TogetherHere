# Database migration playbook

This project keeps **forward** SQL migrations in `db/migrations` and matching **rollback** SQL migrations in `db/rollbacks`.

## Prerequisites

- PostgreSQL client (`psql`) installed
- `DATABASE_URL` set to the target database

Example:

```bash
export DATABASE_URL="postgres://user:password@localhost:5432/togetherhere"
```

## Helper scripts

- `./scripts/db-new-migration.sh <name>`: creates paired migration files in `db/migrations` and `db/rollbacks`.
- `./scripts/db-migrate.sh`: applies forward migrations in lexicographic order.
- `./scripts/db-rollback.sh <target-migration|__base__>`: applies rollback files in reverse order until the DB reaches the target.

## Forward migration procedure

1. Create a new migration pair:
   ```bash
   ./scripts/db-new-migration.sh add_example_change
   ```
2. Edit the generated forward SQL in `db/migrations/NNNN_add_example_change.sql`.
3. Edit the generated rollback SQL in `db/rollbacks/NNNN_add_example_change.sql`.
4. Validate locally against a development database:
   ```bash
   ./scripts/db-migrate.sh
   ```
5. Confirm the new migration was tracked:
   ```bash
   psql "$DATABASE_URL" -c "SELECT filename, applied_at FROM public.schema_migrations ORDER BY filename;"
   ```

## Backward migration procedure (rollback)

### Roll back one or more migrations to a specific version

1. Pick a target migration filename that should remain applied (for example `0001_initial_schema.sql`).
2. Run:
   ```bash
   ./scripts/db-rollback.sh 0001_initial_schema.sql
   ```
3. Verify state:
   ```bash
   psql "$DATABASE_URL" -c "SELECT filename FROM public.schema_migrations ORDER BY filename;"
   ```

### Roll back everything

```bash
./scripts/db-rollback.sh __base__
```

## Operational safety notes

- Always deploy forward and rollback SQL together in the same PR.
- Never edit an already-applied migration file; add a new migration instead.
- Test both forward and backward procedures in a non-production environment before production changes.
- Rollbacks are best-effort and depend on migration design (data-destructive changes may not be recoverable without backups).
