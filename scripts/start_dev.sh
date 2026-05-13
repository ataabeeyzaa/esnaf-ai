#!/usr/bin/env bash
# Start backend + frontend in two terminal tabs (macOS/Linux)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "ESNAF AI - Dev Start"
echo "Root: $ROOT"

# Backend
(
  cd "$ROOT/backend"
  source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate
  uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 &
  echo "Backend PID: $!"
)

sleep 2

# Frontend
(
  cd "$ROOT/frontend"
  npm run dev &
  echo "Frontend PID: $!"
)

echo "Backend  -> http://localhost:8000"
echo "Frontend -> http://localhost:3000"
echo "Dashboard -> http://localhost:3000/dashboard"
wait
