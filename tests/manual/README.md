# Manual & Experimental Tests

This directory contains standalone, exploratory test scripts for manual developer testing against local LLMs or specific external video URLs:

- `test_ollama.py`: Tests direct HTTP completions against a local Ollama instance (`http://127.0.0.1:11434`) using standard chat completion formats and sample transcripts.
- `test_run.py`: End-to-end integration test fetching a YouTube video's automatic captions via `yt-dlp` and testing prompt generation against a local model.
- `test_stream.py`: Tests streaming HTTP SSE tokens against local Ollama endpoints.

To run any of these manual scripts:
```powershell
python tests/manual/test_ollama.py
```
*(Automated test suites executed by CI or test runners reside in `tests/test_*.py`.)*
