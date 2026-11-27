#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

if [ ! -f ".venv/bin/python" ]; then
    echo "[ERROR] Virtual environment not found. Please run ./scripts/setup.sh first."
    exit 1
fi

echo "Starting StanClip at http://127.0.0.1:8765 ..."
source .venv/bin/activate
exec python -m studio.server
