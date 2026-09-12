#!/bin/bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"
if [ ! -x .venv/bin/python ]; then
  echo 'Create the environment: python3.13 -m venv .venv'
  echo 'Then: .venv/bin/python -m pip install -r requirements-lock.txt'
  exit 1
fi
[ -d node_modules ] || { echo 'Install frontend dependencies: ./scripts/npm.sh ci'; exit 1; }
backend_pid=''
cleanup() { [ -z "$backend_pid" ] || kill "$backend_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
if ! curl --silent --fail http://127.0.0.1:8787/api/health >/dev/null; then
  .venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8787 --no-access-log &
  backend_pid=$!
  for attempt in {1..40}; do
    curl --silent --fail http://127.0.0.1:8787/api/health >/dev/null && break
    sleep 0.25
  done
  curl --silent --fail http://127.0.0.1:8787/api/health >/dev/null || { echo 'Backend failed to start.'; exit 1; }
fi
if curl --silent --fail http://127.0.0.1:5173/ >/dev/null; then
  echo 'App is already available: http://127.0.0.1:5173'
  if [ -n "$backend_pid" ]; then wait "$backend_pid"; fi
else
  ./scripts/npm.sh run dev
fi
