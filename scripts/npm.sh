#!/bin/bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"
# Reuse the already installed Node runtime; no Emscripten initialization or build.
if ! command -v node >/dev/null 2>&1; then
  node_bin="$PROJECT_ROOT/.tools/emsdk/node/24.19.0_64bit/bin"
  [ -x "$node_bin/node" ] || { echo 'Install Node.js 24 LTS, then rerun this command.' >&2; exit 1; }
  export PATH="$node_bin:$PATH"
fi
export npm_config_cache="$PROJECT_ROOT/.tools/npm-cache"
exec npm "$@"
