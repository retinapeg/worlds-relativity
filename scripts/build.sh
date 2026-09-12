#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
[ -f node_modules/three/build/three.module.js ] || { echo 'Run the pinned npm ci command in README.md.' >&2; exit 1; }
[ ! -L build ] && [ ! -L build/candidate ] || { echo 'Refusing symlinked build output.' >&2; exit 1; }
mkdir -p build
candidate="$(mktemp -d "$PROJECT_ROOT/build/candidate.XXXXXX")"
trap 'rm -rf "$candidate"' EXIT
cp -R web/. "$candidate/"
mkdir -p "$candidate/vendor" "$candidate/wasm"
# Inspected ES-module closure for the pinned Three.js release: module -> core.
python3 - "$candidate/vendor" <<'PY'
from pathlib import Path
import re, shutil, sys
source = Path('node_modules/three/build')
expected = {'three.module.js': {'./three.core.js'}, 'three.core.js': set()}
for name, imports in expected.items():
    actual = set(re.findall(r'''^(?:import|export).*?\bfrom\s*['"]([^'"]+)''', (source/name).read_text(), re.M))
    if actual != imports:
        raise SystemExit(f'Unexpected imports in {name}: {actual}; inspect before changing the bundle.')
    shutil.copy2(source/name, Path(sys.argv[1])/name)
shutil.copy2('node_modules/three/LICENSE', Path(sys.argv[1])/'THREE-LICENSE.txt')
PY
cp .tools/emsdk/upstream/emscripten/LICENSE "$candidate/vendor/EMSCRIPTEN-LICENSE.txt"
em++ -std=c++17 -O2 -Wall -Wextra -Wpedantic -Wshadow -Isrc \
    src/relativity.cpp src/wasm_bindings.cpp --no-entry \
    -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web -sFILESYSTEM=0 \
    -sALLOW_MEMORY_GROWTH=0 -sINITIAL_MEMORY=16777216 -sSTACK_SIZE=1048576 \
    -sEXPORTED_RUNTIME_METHODS=HEAPF64 -o "$candidate/wasm/relativity.js"
# Only a successful build replaces the disposable candidate. Releases are untouched.
rm -rf build/candidate
mv "$candidate" build/candidate
echo "Candidate built: $PROJECT_ROOT/build/candidate"
