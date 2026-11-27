import httpx
import time
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from studio import media

url = 'https://youtu.be/gG9-HCf-2wY'
with media._ydl({'nocheckcertificate': True}) as ydl:
    i = ydl.extract_info(url, download=False)
    auto = i.get('automatic_captions') or {}
    track = next((f for f in auto.get('en-orig') or [] if f.get('ext') == 'json3' and f.get('url')), None)
    raw = ydl.urlopen(track['url']).read(40_000_000)
    words = media._caption_words(json.loads(raw))

sample = [w for w in words if 100 <= w['s'] <= 250]
lines = [f"[{w['s']:.1f}] {w['w']}" for w in sample[:60]]
transcript_text = '\n'.join(lines)

system_prompt = (
    "You are an expert viral clip scout for YouTube Shorts and TikTok.\n"
    "Identify high-retention, funny, dramatic moments.\n"
    "CRITICAL: Output ONLY valid JSON, starting directly with { and ending with }. Do not output <think> tags. Do not output markdown code fences.\n"
)

user_prompt = (
    f"Video: iShowSpeed Completes Every Easter Egg In GTA 6\n"
    f"Channel: Live Speedy\n\n"
    f"Timestamped Transcript:\n{transcript_text}\n\n"
    f"Find 1 clip-worthy moment (15-60 seconds). Return pure JSON with key 'items':\n"
    f'{{"items": [{{"start": 120.0, "end": 150.0, "score": 90, "hook": "BRO REGRETTED THIS", "title": "Speed Found The Secret GTA 6 Elevator!", "description": "Speed discovers the scariest secret elevator in GTA 6 and barely survives with 1 HP!", "hashtags": ["gta6", "ishowspeed", "gaming", "viral", "funny"], "highlight_words": ["elevator", "secret", "survived"], "reason": "Crazy reaction"}}]}}'
)

t0 = time.time()
print('Sending request WITHOUT response_format to Ollama...', flush=True)
r = httpx.post('http://127.0.0.1:11434/v1/chat/completions', json={
    'model': 'qwen3.5:4b-q4_K_M',
    'messages': [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_prompt}
    ],
    'temperature': 0.4,
    'stream': False
}, timeout=90)
print('Done in', round(time.time() - t0, 2), 's!', flush=True)
msg = r.json()['choices'][0]['message']
print('Message keys:', list(msg.keys()))
print('Content length:', len(msg.get('content', '')))
print('Content:\n', repr(msg.get('content', ''))[:500])
