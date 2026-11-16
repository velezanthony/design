#!/usr/bin/env bash
# Regenera el contenido del playground desde un checkout de snake-orm (solo lectura).
#   scripts/migrate-mkdocs/run-snake-orm.sh <ruta al repo snake-orm> <python con griffe2md>
set -euo pipefail
repo="${1:?ruta al repo de snake-orm}"
python="${2:?python de un venv con griffe2md}"
here="$(cd "$(dirname "$0")/../.." && pwd)"
api="$(mktemp)"
"$python" "$here/scripts/migrate-mkdocs/generate-api.py" --search-path "$repo/src" --docs "$repo/docs" --out "$api"
node "$here/scripts/migrate-mkdocs/cli.ts" --repo "$repo" --out "$here/playground/src/content/docs" \
  --repo-url https://github.com/velezanthony/snake-orm --api "$api" \
  --external CHANGELOG.md --external-out "$here/playground/src/content" \
  --sidebar-out "$here/playground/sidebar.generated.mjs"
