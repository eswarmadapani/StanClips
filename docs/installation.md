# Installation Guide

StanClip is designed to run easily on your local machine (Windows, Linux, macOS) or as a containerized stack via Docker.

---

## System Requirements

### Minimum Requirements
* **OS**: Windows 10/11 (64-bit), Ubuntu 20.04+, or macOS 12+
* **Processor**: 4-core CPU (x86_64 or Apple Silicon)
* **RAM**: 8 GB RAM
* **Disk Space**: At least 10 GB free for models and temporary video processing
* **Software**: Python 3.10 to 3.12, FFmpeg

### Recommended Requirements (Heavy Clipping & High Concurrency)
* **Processor**: 8+ core CPU or modern NVIDIA GPU (RTX 3060+)
* **RAM**: 16 GB+ RAM
* **Storage**: Fast NVMe SSD with 50 GB+ free disk space

---

## 1. Prerequisites Installation

### Installing FFmpeg
FFmpeg is required for video extraction, audio slicing, and rendering.

* **Windows**:
  ```powershell
  winget install Gyan.FFmpeg
  ```
  *(Verify installation by opening a new terminal and running `ffmpeg -version`)*
* **macOS**:
  ```bash
  brew install ffmpeg
  ```
* **Linux (Ubuntu/Debian)**:
  ```bash
  sudo apt update && sudo apt install -y ffmpeg
  ```

### Installing Python
Ensure Python 3.10 or newer is installed and added to your system PATH:
```bash
python --version
```

---

## 2. Quick Setup (Windows)

1. Clone or download the StanClip repository into a short directory path (e.g. `C:\StanClip` or `D:\StanClip`):
   ```cmd
   git clone https://github.com/eswarmadapani/StanClips.git C:\StanClip
   cd C:\StanClip
   ```
2. Run the automated setup helper:
   ```cmd
   scripts\setup.bat
   ```
   This script creates a virtual environment, installs dependencies, and verifies prerequisites.
3. Start StanClip:
   ```cmd
   scripts\start.bat
   ```
4. Open **`http://127.0.0.1:8765`** in your browser.

---

## 3. Manual Setup (All Platforms)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/eswarmadapani/StanClips.git
   cd StanClip
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # Windows
   python -m venv .venv
   .\.venv\Scripts\activate

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Optional: Pre-fetch speech model (downloads ~480 MB):**
   ```bash
   python -m studio.fetch_model
   ```
   *(If skipped, the model will download automatically on first server startup)*

5. **Start the server:**
   ```bash
   python -m studio.server
   ```

---

## 4. Docker Deployment

For self-hosted Linux servers with automatic HTTPS and PostgreSQL:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure `PEAKCUT_DOMAIN` and `POSTGRES_PASSWORD`.
3. Launch with Docker Compose:
   ```bash
   docker compose up -d --build
   ```
4. Access your domain at `https://your-domain`.
