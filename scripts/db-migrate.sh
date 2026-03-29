#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$ROOT_DIR/db/migrations}"

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is required but was not found in PATH." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL must be set." >&2
  exit 1
fi

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Error: migrations directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

echo "Using migrations directory: $MIGRATIONS_DIR"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

shopt -s nullglob
migrations=("$MIGRATIONS_DIR"/*.sql)

if [[ ${#migrations[@]} -eq 0 ]]; then
  echo "No migrations found."
  exit 0
fi

for migration in "${migrations[@]}"; do
  filename="$(basename "$migration")"
  checksum="$(sha256sum "$migration" | awk '{print $1}')"

  existing_checksum="$({
    psql "$DATABASE_URL" -Atqc "SELECT checksum FROM public.schema_migrations WHERE filename = '$filename'";
  } || true)"

  if [[ -n "$existing_checksum" ]]; then
    if [[ "$existing_checksum" != "$checksum" ]]; then
      echo "Error: checksum mismatch for previously applied migration $filename" >&2
      exit 1
    fi

    echo "Skipping already-applied migration: $filename"
    continue
  fi

  echo "Applying migration: $filename"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO public.schema_migrations (filename, checksum) VALUES ('$filename', '$checksum')"
done

echo "Migrations complete."
