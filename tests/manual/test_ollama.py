import httpx
import time
import json

sample_transcript = """
[120.0] Today GTA stream will be a little different.
[124.5] Okay, there's a lot of Easter eggs in this game.
[128.0] (LOUD) Wait, what is that building right there?!
[132.0] Yo chat, look at the door! Is that the secret elevator?
[136.5] (LOUD) BRO! NO WAY! IT ACTUALLY OPENED!
[141.0] (LOUD) WHAT IS THAT THING INSIDE?! RUN! RUN!
[146.0] Oh my god, I survived that with 1 HP!
[150.0] That was the craziest Easter egg I have ever seen in GTA!
"""

t0 = time.time()
body1 = {
    "model": "qwen3.5:4b-q4_K_M",
    "messages": [
        {"role": "system", "content": "You are an expert video editor and viral short-form clip scout (YouTube Shorts, TikTok). You always answer in pure JSON."},
        {"role": "user", "content": f"Find 1 clip-worthy moment from this transcript:\n{sample_transcript}\nReturn a JSON object with a single key 'items' containing an array of objects with keys: start, end, score, hook (ALL CAPS 2-5 words, e.g. BRO REGRETTED THIS), title (catchy YouTube Shorts title under 70 chars), description (engaging 1-2 sentences), hashtags (5 tags without #), highlight_words (3-5 words), reason. Strictly English only."}
    ],
    "stream": False
}
print("Sending Test 1...")
r1 = httpx.post("http://127.0.0.1:11434/v1/chat/completions", json=body1, timeout=60)
print("Test 1 done in", round(time.time() - t0, 2), "s")
print("Content:", r1.json()["choices"][0]["message"]["content"])
