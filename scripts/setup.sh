#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "================================================================"
echo "               StanClip - Automated Setup (Unix)                "
echo "================================================================"
echo ""

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed. Please install Python 3.10+."
    exit 1
fi

# 2. Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "[WARNING] FFmpeg is not found in PATH."
    echo "Please install FFmpeg: 'sudo apt install ffmpeg' or 'brew install ffmpeg'."
fi

# 3. Create venv
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# 4. Install dependencies
echo "Installing requirements..."
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 5. Config
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    echo "Created default .env"
fi

echo ""
echo "Setup complete! Run ./scripts/start.sh to launch."
