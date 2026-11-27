# Configuration Guide

StanClip is configured via environment variables, loaded automatically from a `.env` file in the root directory, or directly from the in-app **Settings** dashboard.

Settings saved in the in-app dashboard take precedence over `.env`.

---

## 1. AI Configuration (Bring Your Own Key)

StanClip analyzes transcripts and judges viral moments using an LLM of your choice.

| Setting | Allowed Values | Description |
| :--- | :--- | :--- |
| `PEAKCUT_AI_PROVIDER` | `gemini`, `openai`, `anthropic`, `xai`, `groq`, `openrouter`, `ollama`, `custom` | Selected AI provider. |
| `PEAKCUT_AI_MODELS` | e.g. `gemini-2.5-flash`, `gpt-4o-mini` | One or more model IDs separated by commas. |
| `PEAKCUT_AI_KEY` | string | API key for the chosen service. |
| `PEAKCUT_AI_BASE_URL`| URL (e.g. `http://127.0.0.1:11434/v1`) | Base endpoint for `ollama` or `custom` OpenAI-compatible APIs. |

> **Note on Zero-AI Mode**: If no AI key or model is configured, StanClip still functions. Clips are extracted based on acoustic RMS loudness spikes and dialogue pauses.

---

## 2. Server & Storage Configuration

| Setting | Default | Description |
| :--- | :--- | :--- |
| `PEAKCUT_HOST` | `127.0.0.1` | Host address to bind. Keep `127.0.0.1` for local desktop use. |
| `PEAKCUT_PORT` | `8765` | Server port. |
| `PEAKCUT_PUBLIC_URL` | `http://127.0.0.1:8765` | Public address opened by users (or `https://your-domain` on servers). |
| `PEAKCUT_DATA` | `./data` | Root directory storing user accounts, videos, clips, and local models. |
| `DATABASE_URL` | *(empty)* | Defaults to local SQLite (`data/peakcut.db`). Set PostgreSQL URL for server clusters. |
| `PEAKCUT_ACCOUNTS` | `0` | `0` = Local zero-login single owner mode. `1` = Multi-user email/password authentication. |

---

## 3. Resource Limits & Concurrency

| Setting | Default | Description |
| :--- | :--- | :--- |
| `PEAKCUT_JOB_WORKERS` | Auto (CPU count) | Maximum concurrent video processing pipelines. |
| `PEAKCUT_BUSY_CPU` | `82` | Percentage ceiling; delays extra background jobs when CPU load exceeds this. |
| `PEAKCUT_MIN_FREE_RAM_GB` | `1.5` | Minimum free memory required before scheduling new jobs. |
| `PEAKCUT_MAX_JOBS_PER_USER` | `5` | Maximum queued jobs per creator simultaneously. |
| `PEAKCUT_UPLOAD_PART_MB` | `40` | Chunked upload part size (ensures compatibility with CDN upload limits). |
| `PEAKCUT_CLIP_MINUTES` | `15` | Timeout limit per single clip render to prevent pipeline stalls. |

---

## 4. Platform OAuth Configuration

Required only if enabling one-click auto-publishing to YouTube, Instagram, or TikTok:

```ini
# Google / YouTube
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
PEAKCUT_YOUTUBE_REDIRECT_URI=http://127.0.0.1:8765/oauth/youtube/callback

# Instagram (Meta for Developers)
PEAKCUT_IG_APP_ID=your_instagram_app_id
PEAKCUT_IG_APP_SECRET=your_instagram_app_secret

# TikTok (TikTok for Developers)
PEAKCUT_TIKTOK_CLIENT_KEY=your_tiktok_key
PEAKCUT_TIKTOK_CLIENT_SECRET=your_tiktok_secret
```
