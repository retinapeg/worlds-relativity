#!/bin/bash
# Sourced only by development scripts; never changes the user's shell configuration.
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"
if [ -f .tools/emsdk/emsdk_env.sh ]; then
    source .tools/emsdk/emsdk_env.sh >/dev/null 2>&1
fi
if ! command -v em++ >/dev/null || ! command -v node >/dev/null; then
    echo 'Missing development toolchain. Follow the pinned setup in README.md.' >&2
    exit 1
fi
export EM_CACHE="$PROJECT_ROOT/.tools/emsdk/upstream/emscripten/cache"
export npm_config_cache="$PROJECT_ROOT/.tools/npm-cache"
