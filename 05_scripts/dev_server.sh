#!/usr/bin/env bash
# Start the Mnemo backend and frontend for local development.
# Data is stored in /tmp/mnemo_dev/ so it won't affect production.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/02_backend"
FRONTEND_DIR="$PROJECT_DIR/03_frontend/public"
DATA_DIR="/tmp/mnemo_dev"

mkdir -p "$DATA_DIR"

# Set up venv if it doesn't exist
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$BACKEND_DIR/venv"
    "$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
fi

# Load .env if it exists, otherwise use defaults
if [ -f "$BACKEND_DIR/.env" ]; then
    set -a
    source "$BACKEND_DIR/.env"
    set +a
fi

export MNEMO_AUTH_TOKEN="${MNEMO_AUTH_TOKEN:-dev-token}"
export MNEMO_EVENTS_FILE="${MNEMO_EVENTS_FILE:-$DATA_DIR/events.jsonl}"
export MNEMO_DIARY_FILE="${MNEMO_DIARY_FILE:-$DATA_DIR/diary.jsonl}"

echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Token:    $MNEMO_AUTH_TOKEN"
echo "Data dir: $DATA_DIR"
echo ""

# Start frontend in background
(cd "$FRONTEND_DIR" && python3 -m http.server 3000 --bind 127.0.0.1) &
FRONTEND_PID=$!

# Start backend in foreground
cleanup() {
    kill "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT

"$BACKEND_DIR/venv/bin/uvicorn" app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir "$BACKEND_DIR"
