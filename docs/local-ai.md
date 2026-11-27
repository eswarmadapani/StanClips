# Local AI Setup with Ollama

StanClip supports **100% private, free local AI** moment evaluation through [Ollama](https://ollama.com).

When paired with Ollama, no transcripts, hooks, or video data ever leave your machine.

---

## 1. Installing Ollama

1. Download and install Ollama from [ollama.com/download](https://ollama.com/download).
2. Start the Ollama application or daemon:
   ```bash
   ollama serve
   ```
3. Pull a compatible model:
   ```bash
   # Recommended for 8GB+ RAM / GPUs:
   ollama pull llama3.1

   # Or high-efficiency compact models:
   ollama pull qwen2.5:7b
   ollama pull mistral
   ```

---

## 2. Configuring StanClip with Ollama

### Option A: Via the In-App Settings Dashboard (Easiest)
1. Open StanClip in your browser: `http://127.0.0.1:8765`.
2. Navigate to **Settings > AI**.
3. Select **Ollama (on this machine)** from the Provider dropdown.
4. Click **Find models** — StanClip will query your local Ollama instance and display all installed models.
5. Select your desired model (e.g., `llama3.1`) and click **Save and test**.

### Option B: Via `.env`
Add the following lines to your `.env` file:
```ini
PEAKCUT_AI_PROVIDER=ollama
PEAKCUT_AI_MODELS=llama3.1
PEAKCUT_AI_BASE_URL=http://127.0.0.1:11434/v1
```

---

## 3. Recommended Models & Hardware

| Model | Min RAM / VRAM | Strengths |
| :--- | :--- | :--- |
| `llama3.1:8b` | 8 GB RAM / 6 GB VRAM | High reasoning accuracy, excellent hook and title generation. |
| `qwen2.5:7b` | 8 GB RAM / 6 GB VRAM | Exceptional JSON compliance and multilingual context understanding. |
| `mistral:7b` | 8 GB RAM / 6 GB VRAM | Fast generation and strong summarization. |
| `phi3:mini` | 4 GB RAM / CPU | Runs smoothly on low-power laptops and CPUs. |

---

## 4. Troubleshooting Local AI

* **"Cannot connect to Ollama"**: Verify Ollama is running in your taskbar or terminal. Run `curl http://127.0.0.1:11434/v1/models` to confirm the endpoint responds.
* **Slow clip evaluation**: If running on CPU, ensure model size is 7B or smaller. To use GPU acceleration, verify NVIDIA drivers are updated and Ollama detects CUDA.
* **Invalid JSON output**: Some very small models (<3B parameters) may struggle with strict JSON schemas. If you encounter format errors, use `qwen2.5:7b` or `llama3.1:8b`.
