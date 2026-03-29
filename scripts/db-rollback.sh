#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$ROOT_DIR/db/migrations}"
ROLLBACKS_DIR="${ROLLBACKS_DIR:-$ROOT_DIR/db/rollbacks}"
TARGET="${1:-}"

usage() {
  cat <<'USAGE'
Usage: ./scripts/db-rollback.sh <target-migration|__base__>

Rolls back applied migrations in reverse order until <target-migration> is the latest applied.
Use __base__ to roll back everything tracked in public.schema_migrations.
USAGE
}

if [[ "$TARGET" =~ ^(-h|--help)$ ]]; then
  usage
  exit 0
fi

if [[ -z "$TARGET" ]]; then
  usage >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is required but was not found in PATH." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL must be set." >&2
  exit 1
fi

if [[ ! -d "$ROLLBACKS_DIR" ]]; then
  echo "Error: rollbacks directory not found: $ROLLBACKS_DIR" >&2
  exit 1
fi

if [[ "$TARGET" != "__base__" && ! -f "$MIGRATIONS_DIR/$TARGET" ]]; then
  echo "Error: target migration not found in $MIGRATIONS_DIR: $TARGET" >&2
  exit 1
fi

mapfile -t applied < <(psql "$DATABASE_URL" -Atqc "SELECT filename FROM public.schema_migrations ORDER BY filename DESC")

if [[ ${#applied[@]} -eq 0 ]]; then
  echo "No applied migrations found in public.schema_migrations."
  exit 0
fi

if [[ "$TARGET" != "__base__" ]]; then
  target_found=0
  for filename in "${applied[@]}"; do
    if [[ "$filename" == "$TARGET" ]]; then
      target_found=1
      break
    fi
  done

  if [[ $target_found -eq 0 ]]; then
    echo "Error: target migration is not applied and cannot be used as a rollback target: $TARGET" >&2
    exit 1
  fi
fi

rolled_back=0
for filename in "${applied[@]}"; do
  if [[ "$TARGET" != "__base__" && "$filename" == "$TARGET" ]]; then
    break
  fi

  rollback_file="$ROLLBACKS_DIR/$filename"
  if [[ ! -f "$rollback_file" ]]; then
    echo "Error: rollback SQL not found for migration $filename at $rollback_file" >&2
    exit 1
  fi

  echo "Rolling back migration: $filename"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$rollback_file"

  escaped_filename="${filename//\'/\'\'}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
    "DELETE FROM public.schema_migrations WHERE filename = '$escaped_filename'"

  rolled_back=$((rolled_back + 1))
done

if [[ $rolled_back -eq 0 ]]; then
  echo "Database already at target migration: $TARGET"
else
  echo "Rollback complete. Rolled back $rolled_back migration(s)."
fi
