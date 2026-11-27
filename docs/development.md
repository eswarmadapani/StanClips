# Developer & Contributor Guide

This guide covers building, testing, and modifying the StanClip codebase.

---

## 1. Project Structure Overview

```text
StanClip/
├── studio/             # FastAPI backend, pipeline orchestrator, rendering engine
│   ├── server.py       # API endpoints, authentication gates, static mounts
│   ├── brain.py        # LLM prompts, virality scoring, gaming heuristics
│   ├── ai.py           # Multi-provider LLM connector
│   ├── transcribe.py   # sherpa-onnx speech recognition runner
│   ├── layouts.py      # Geometric transforms & Layout Studio backend
│   ├── caption_presets.py # SubStation Alpha (.ass) subtitle generators
│   ├── render.py       # FFmpeg filtergraph construction & video rendering
│   ├── facecam.py      # Computer vision facecam border/motion detector
│   ├── podcast.py      # Light-ASD active speaker detection
│   └── posting.py      # Social media dispatchers & FairQueue post queue
├── frontend/           # Modern React 18 / TypeScript / Tailwind CSS UI
│   ├── src/            # Components, hooks, context, and entrypoints
│   └── build.mjs       # esbuild bundler and asset compiler
├── web/                # Production distribution served by FastAPI
├── tests/              # Automated unit and integration tests
├── scripts/            # Cross-platform setup and startup utilities
└── docs/               # System documentation
```

---

## 2. Running the Frontend Build Pipeline

The frontend uses React 18, Tailwind CSS, Lucide icons, and an esbuild compilation pipeline.

```bash
cd frontend

# Install Node dependencies
npm install

# Compile Tailwind CSS and bundle client runtime into web/
npm run build

# Watch mode for hot recompilation during UI development
npm run watch
```

The build script compiles client assets into `web/` and automatically prunes stale bundles.

---

## 3. Running Automated Tests

StanClip includes isolated test suites that run against temporary directories without touching real user data or requiring live AI keys.

```bash
# Activate your virtual environment first
.\.venv\Scripts\activate   # Windows
source .venv/bin/activate    # Linux / macOS

# Run core tests
python tests/test_captions.py
python tests/test_layouts.py
python tests/test_games.py
python tests/test_facecam.py

# Run the complete integration test harness
python tests/run.py
```

---

## 4. Adding a New Caption Preset

To add a new caption style:
1. Define the preset configuration in `studio/caption_presets.py` inside `PRESETS`.
2. Add dialogue generation logic inside the `events(...)` function in `studio/caption_presets.py`.
3. Add the style option to the frontend preset picker in `frontend/src/components/intake/IntakeCard.tsx`.
4. Run `python tests/test_captions.py` to ensure syllable timing and word wrapping pass verification.
5. Rebuild frontend assets with `npm --prefix frontend run build`.
