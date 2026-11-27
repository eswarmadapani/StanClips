# StanClip System Architecture

StanClip is engineered as a local-first, modular automated video production platform.

```
                    ┌─────────────────────────┐
                    │  Video Ingestion Gate   │
                    │  (yt-dlp / File Upload) │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ Audio Extraction/Probe  │
                    │      (FFmpeg 16kHz)     │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌────────────────────────┐                    ┌────────────────────────┐
│ sherpa-onnx Local ASR  │                    │ RMS Loudness & Chat    │
│ (Parakeet RNN-T 0.6B)  │                    │ Activity Spike Watcher │
└───────────┬────────────┘                    └───────────┬────────────┘
            │                                             │
            └───────────────────┬─────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   AI Scout (brain.py)   │
                    │  Virality & Hook Engine │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌────────────────────────┐                    ┌────────────────────────┐
│ Visual Layout Engine   │                    │ Caption Generator      │
│ - Facecam CV Detector  │                    │ - 10 Presets           │
│ - Podcast Light-ASD    │                    │ - Word Timing (ASS)    │
│ - Manual Layout Studio │                    │ - Font Metrics (_Font) │
└───────────┬────────────┘                    └───────────┬────────────┘
            │                                             │
            └───────────────────┬─────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  FFmpeg Video Compositor│
                    │   9:16 Vertical Render  │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ Creator Fair Post Queue │
                    │ (YouTube, IG, TikTok)   │
                    └─────────────────────────┘
```

---

## Architecture Subsystems

### 1. Ingestion Pipeline (`studio/media.py`, `studio/live.py`)
* Extracts video metadata, duration, frame rates, and streams via `yt-dlp`.
* Supports continuous stream recording from Twitch, Kick, and YouTube Live into circular chunk buffers (`.ts`), enabling live moment extraction while streams are broadcast.
* Multi-part chunked upload handler for large local video uploads without memory exhaustion.

### 2. Speech Intelligence & Transcription (`studio/transcribe.py`)
* Uses `sherpa-onnx` executing offline NeMo Parakeet 0.6B RNN-T models.
* Generates millisecond-accurate word start/end timestamps.
* Zero cloud exposure: speech recognition is executed entirely on local CPU/CUDA.
* Optional token-authenticated remote ASR offloading via `studio/asr_worker.py`.

### 3. AI Moment Scout (`studio/brain.py`, `studio/ai.py`)
* Evaluates transcripts against acoustic loudness spikes `(LOUD)` and live chat velocity surges `(CHAT)`.
* Computes virality scores (0-100) and formats bold, high-contrast hooks (<=5 uppercase words).
* Specialized game title heuristics for 23+ major titles, injecting relevant game context and tags.
* Sanitizes untrusted video metadata and prompts to mitigate prompt injection risks.

### 4. Smart Video Composition (`studio/render.py`, `studio/layouts.py`, `studio/facecam.py`, `studio/podcast.py`)
* **Computer Vision Facecam Detection**: Analyzes video frame delta variances to distinguish static webcam borders from moving gameplay.
* **Podcast Speaker Tracking**: Pairs OpenCV facial cascades with Light-ASD neural audio-visual correlation to frame the active speaker.
* **Manual Layout Studio**: Provides drag-and-drop region coordinates, canvas layering, and circular masking.

### 5. Advanced Caption Generation (`studio/caption_presets.py`)
* Pre-measures font metrics using PIL Truetype font headers to align with SubStation Alpha (`.ass`) rendering engines.
* Renders 10 distinct caption styles: Bounce, Hype, Clean, Cinema, Speaker Card, Marker, Word Build, Pulse, Sweep, and Focus Line.
* Handles syllable pauses, word highlights, line balancing, and Romanized character fallback.

### 6. Fair Queue & Publishing (`studio/jobs.py`, `studio/posting.py`)
* Per-user round-robin FairQueue prevents heavy users from starving single-clip jobs.
* Post queue enforces automated spacing intervals (e.g. 45 min) and daily account post caps.
