#!/usr/bin/env bash

echo "Stopping StanClip instances listening on port 8765..."

PID=$(lsof -ti :8765 2>/dev/null || true)
if [ -n "$PID" ]; then
    kill -15 "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null
    echo "StanClip stopped (PID $PID)."
else
    echo "No process running on port 8765."
fi
