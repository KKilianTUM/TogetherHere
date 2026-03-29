#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$ROOT_DIR/db/migrations}"
ROLLBACKS_DIR="${ROLLBACKS_DIR:-$ROOT_DIR/db/rollbacks}"

usage() {
  cat <<'USAGE'
Usage: ./scripts/db-new-migration.sh <name>

Creates matching forward/rollback migration SQL files with the next numeric prefix.
Example:
  ./scripts/db-new-migration.sh add_user_profile_table
USAGE
}

if [[ "${1:-}" =~ ^(-h|--help)$ ]]; then
  usage
  exit 0
fi

if [[ $# -ne 1 ]]; then
  usage >&2
  exit 1
fi

name="$1"
if [[ ! "$name" =~ ^[a-z0-9_]+$ ]]; then
  echo "Error: name must use lowercase letters, numbers, and underscores." >&2
  exit 1
fi

mkdir -p "$MIGRATIONS_DIR" "$ROLLBACKS_DIR"

max_prefix=0
for dir in "$MIGRATIONS_DIR" "$ROLLBACKS_DIR"; do
  while IFS= read -r file; do
    base="$(basename "$file")"
    prefix="${base%%_*}"
    if [[ "$prefix" =~ ^[0-9]{4}$ ]] && ((10#$prefix > max_prefix)); then
      max_prefix=$((10#$prefix))
    fi
  done < <(find "$dir" -maxdepth 1 -type f -name '*.sql' | sort)
done

next_prefix="$(printf '%04d' $((max_prefix + 1)))"
filename="${next_prefix}_${name}.sql"
forward_path="$MIGRATIONS_DIR/$filename"
rollback_path="$ROLLBACKS_DIR/$filename"

cat > "$forward_path" <<SQL
BEGIN;

-- TODO: add forward migration SQL for ${name}

COMMIT;
SQL

cat > "$rollback_path" <<SQL
BEGIN;

-- TODO: add rollback SQL for ${name}

COMMIT;
SQL

echo "Created: $forward_path"
echo "Created: $rollback_path"
