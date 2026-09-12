#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
mkdir -p build/tests
flags=(-std=c++17 -O1 -g -Wall -Wextra -Wpedantic -Wshadow -Isrc)
clang++ "${flags[@]}" -fsanitize=address,undefined,float-divide-by-zero \
    -fno-sanitize-recover=all -fno-omit-frame-pointer \
    src/relativity.cpp tests/relativity_tests.cpp -o build/tests/native
build/tests/native
em++ "${flags[@]}" src/relativity.cpp tests/relativity_tests.cpp \
    -sENVIRONMENT=node -sEXIT_RUNTIME=1 -sALLOW_MEMORY_GROWTH=0 \
    -o build/tests/relativity.cjs
node build/tests/relativity.cjs
echo 'PASS: native sanitizers and WebAssembly / SDK Node.'
