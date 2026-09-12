#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
case "${1:-}" in
    '') exec python3 scripts/serve_local.py build/relativity-candidate ;;
    --legacy) exec python3 scripts/serve.py build/candidate ;;
    --known-good)
        [ -f releases/known-good.txt ] || { echo 'No verified snapshot yet. Run ./run_demo.sh for the candidate.' >&2; exit 1; }
        release="$(cat releases/known-good.txt)"
        [[ "$release" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { echo 'Invalid snapshot pointer.' >&2; exit 1; }
        exec "./releases/$release/launch.sh" ;;
    *) echo 'Usage: ./run_demo.sh [--known-good|--legacy]' >&2; exit 1 ;;
esac
