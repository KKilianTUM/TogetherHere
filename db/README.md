# Database migrations

All schema changes must be committed as SQL files in `db/migrations` and applied through `scripts/db-migrate.sh`.

## Requirements

- PostgreSQL client (`psql`)
- `DATABASE_URL` environment variable set to the target PostgreSQL database

## Apply migrations

```bash
export DATABASE_URL="postgres://user:password@localhost:5432/togetherhere"
./scripts/db-migrate.sh
```

## Reproducibility guarantees

- Migrations are applied in lexicographic filename order.
- Applied migrations are tracked in `public.schema_migrations`.
- Each migration file is stored with a SHA-256 checksum.
- If an applied migration file is edited later, the migration runner stops with a checksum mismatch.

## Naming convention

Use ordered, immutable migration files:

- `0001_initial_schema.sql`
- `0002_add_activity_tables.sql`
- `0003_add_indexes.sql`

Never edit an applied migration in shared environments; add a new migration instead.
