import httpx
import time
import json

t0 = time.time()
body1 = {
    'model': 'qwen3.5:4b-q4_K_M',
    'messages': [
        {'role': 'system', 'content': 'You are an expert video editor. Answer in pure JSON with key "items".'},
        {'role': 'user', 'content': 'Pick 1 viral moment from: [120] Yo chat look at the elevator! [125] BRO IT OPENED! [130] RUN RUN RUN! Return JSON: {"items": [{"start": 120, "end": 132, "score": 90, "hook": "BRO REGRETTED THIS", "title": "Secret GTA Elevator!", "description": "Speed opened the secret elevator!", "hashtags": ["gta", "gaming"], "reason": "Crazy reaction"}]}'}
    ],
    'stream': True
}
print('Connecting...')
with httpx.stream('POST', 'http://127.0.0.1:11434/v1/chat/completions', json=body1, timeout=120) as r:
    first_tok = None
    chunks = []
    for line in r.iter_lines():
        if line.startswith('data: ') and line.strip() != 'data: [DONE]':
            data = json.loads(line[6:])
            delta = data['choices'][0]['delta'].get('content', '')
            if first_tok is None and delta:
                first_tok = time.time()
                print('First token in', round(first_tok - t0, 2), 's')
            chunks.append(delta)
print('Total time:', round(time.time() - t0, 2), 's')
print('Result:\n', ''.join(chunks))
