"""CPU-only audio/visual analysis in an isolated process."""
import hashlib
import json
from pathlib import Path
import sys
import wave

import cv2
import numpy as np
import torch
from python_speech_features import mfcc

from .light_asd.Model import ASD_Model
from .podcast import Camera, FPS


def load_network():
    path = Path(__file__).resolve().parents[1] / "models/light-asd-ava.model"
    if hashlib.sha256(path.read_bytes()).hexdigest() != "d44bc3ea7baa8e0946fa3921311714a630ed8b90a1928fab0dbe30d918909317":
        raise ValueError("Unexpected Light-ASD weights")
    raw = torch.load(path, weights_only=True, map_location="cpu")
    state = {key.removeprefix("module."): value for key, value in raw.items()}
    network = ASD_Model().eval()
    head = torch.nn.Linear(128, 2).eval()
    for module, prefix in [(network, "model."), (head, "lossAV.FC.")]:
        module.load_state_dict({k[len(prefix):]: v for k, v in state.items() if k.startswith(prefix)})
    return network, head


def match_faces(boxes, old, next_id):
    matched = {}
    available = set(old)
    for x, y, w, h in sorted(boxes, key=lambda b: -int(b[2]) * int(b[3])):
        centre = np.array([x + w / 2, y + h / 2])
        key = min(available, key=lambda k: np.linalg.norm(old[k][0] - centre), default=None)
        if key is None or np.linalg.norm(old[key][0] - centre) > w * 0.7:
            key = next_id
            next_id += 1
        else:
            available.remove(key)
        matched[key] = centre, (int(x), int(y), int(w), int(h))
    return matched, next_id


def score_batch(batch, features, offset, network, head, camera):
    evidence = [{} for _ in batch]
    tracks = {}
    for i, samples in enumerate(batch):
        for key, sample in samples.items():
            tracks.setdefault(key, []).append((i, *sample))
    for track in tracks.values():
        begin = track[0][0]
        n = len(track)
        if n < 5:
            continue
        a = features[(offset + begin)*4:(offset + begin + n)*4]
        if len(a) != n * 4:
            continue
        audio = torch.tensor(a, dtype=torch.float32)[None]
        video = torch.tensor(np.stack([crop for _, crop, _ in track]), dtype=torch.float32)[None]
        av = network.forward_audio_visual_backend(network.forward_audio_frontend(audio),
                                                  network.forward_visual_frontend(video))
        scores = head(av)[:, 1].tolist()
        for (i, _, (key, x)), score in zip(track, scores):
            evidence[i][key] = score, x
    return [camera.step(frame) for frame in evidence]


@torch.inference_mode()
def analyze(work):
    torch.set_num_threads(2)
    cv2.setNumThreads(1)
    network, head = load_network()
    detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    video, audio = work / "input.avi", work / "audio.wav"
    with wave.open(str(audio)) as wav:
        pcm = np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2")
    features = mfcc(np.pad(pcm, (0, 480)), 16000)
    capture = cv2.VideoCapture(str(video))
    result, batch, tracks = [], [], {}
    camera = Camera()
    previous = None
    next_id = index = 0
    def flush():
        result.extend(score_batch(batch, features, len(result), network, head, camera))
        batch.clear()
    try:
        while True:
            ok, image = capture.read()
            if not ok:
                break
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            thumb = cv2.resize(gray, (48, 32))
            cut = previous is not None and cv2.absdiff(thumb, previous).mean() > 29
            previous = thumb
            if cut:
                flush()
                tracks, camera = {}, Camera()
            if cut or index % 4 == 0:
                boxes = detector.detectMultiScale(gray, 1.12, 5, minSize=(24, 24))
                tracks, next_id = match_faces(boxes, tracks, next_id)
            samples = {}
            for key, (centre, (x, y, w, h)) in tracks.items():
                # Central 112 pixels of the upstream 224-pixel padded face crop.
                side = max(w, h) * 0.7
                roi = cv2.getRectSubPix(gray, (max(1, round(side)),)*2,
                                        (float(centre[0]), float(centre[1] + h * .1)))
                if w * 1.12 > gray.shape[0] * 9/16 or gray.shape[1]/gray.shape[0] < 9/16:
                    continue
                samples[key] = cv2.resize(roi, (112,112)), (key, centre[0]/gray.shape[1])
            batch.append(samples)
            index += 1
            if len(batch) == 50:
                flush()
        flush()
    finally:
        capture.release()
    (work / "camera.json").write_text(json.dumps(result))


if __name__ == "__main__":
    analyze(Path(sys.argv[1]))
