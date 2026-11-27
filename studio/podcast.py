"""Local podcast camera planning. Only the optional worker imports model dependencies."""
from pathlib import Path
import json
import subprocess
import sys
from threading import BoundedSemaphore

_ANALYSIS_SLOT = BoundedSemaphore(1)

FPS = 25
SWITCH_FRAMES = 10
HOLD_FRAMES = 20


class Camera:
    def __init__(self):
        self.active = self.pending = self.x = None
        self.votes = self.missing = 0

    def step(self, faces):
        """faces maps shot-local IDs to (speaking score, horizontal centre)."""
        ranked = sorted(faces, key=lambda k: faces[k][0], reverse=True)
        best = ranked[0] if ranked else None
        certain = best is not None and faces[best][0] > 0.4 and (
            len(ranked) == 1 or faces[best][0] - faces[ranked[1]][0] > 0.6)
        candidate = best if certain else None
        self.votes = self.votes + 1 if candidate == self.pending else 1
        self.pending = candidate
        if candidate is not None and self.votes >= SWITCH_FRAMES and candidate != self.active:
            self.active, self.x = candidate, faces[candidate][1]
        if self.active in faces and faces[self.active][0] > 0:
            self.missing = 0
            dx = faces[self.active][1] - self.x
            if abs(dx) > 0.025:
                self.x += dx * 0.16
        else:
            self.missing += 1
            if self.missing > HOLD_FRAMES:
                self.active = self.x = None
        return self.x


def make_filter(src, work, start, end, w, h, rate):
    from . import ctx, jobs
    jid = ctx.jid()
    with _ANALYSIS_SLOT:
        if jobs.is_canceled(jid):
            raise jobs.JobCanceled("Job canceled by user")
        try:
            return _analyze(src, work, start, end, w, h, rate, jid)
        except (OSError, ValueError):
            return None


def full_scene(w, h, rate):
    return (f"[0:v]fps={rate},split=2[a][b];"
            f"[a]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=6:2,"
            f"scale={w}:{h}[bg];[b]scale={w}:{h}:force_original_aspect_ratio=decrease[fit];"
            f"[bg][fit]overlay=(W-w)/2:(H-h)/2,setsar=1[v0];")


def _analyze(src, work, start, end, w, h, rate, jid):
    from . import jobs
    from .render import NO_WINDOW
    decode = ["ffmpeg", "-nostdin", "-v", "error", "-ss", str(start), "-t", str(end-start),
              "-i", str(src.resolve()), "-map", "0:v:0", "-vf", "fps=25:start_time=0,scale=640:-2",
              "-an", "-c:v", "mjpeg", str(work / "input.avi"), "-map", "0:a:0", "-vn", "-af",
              "aresample=16000:async=1:first_pts=0", "-ac", "1", str(work / "audio.wav")]
    inference = [sys.executable, "-m", "studio.podcast_worker", str(work.resolve())]
    for command in (decode, inference):
        proc = subprocess.Popen(command, cwd=Path(__file__).resolve().parents[1],
                                creationflags=NO_WINDOW, stderr=subprocess.DEVNULL)
        jobs.register_process(jid, proc)
        try:
            if jobs.is_canceled(jid):
                proc.kill()
            proc.wait(timeout=max(120, (end - start) * 20))
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
        finally:
            jobs.unregister_process(jid, proc)
        if jobs.is_canceled(jid):
            raise jobs.JobCanceled("Job canceled by user")
        if proc.returncode:
            return None
    centres = json.loads((work / "camera.json").read_text())
    if not any(x is not None for x in centres):
        return None
    lines = []
    previous = None
    for i, x in enumerate(centres):
        x = round(x, 3) if x is not None else None
        if x == previous:
            continue
        actions = []
        if x is not None:
            actions.append(f"crop@face x iw*{x}-ow/2")
        if previous is None or x is None:
            actions.append(f"overlay@view x {0 if x is not None else -w}")
        lines.append(f"{i/FPS:.3f} " + ", ".join(actions) + ";")
        previous = x
    (work / "camera.cmd").write_text("\n".join(lines), encoding="ascii")
    return (f"[0:v]fps={rate},sendcmd=f=camera.cmd,split=3[a][b][c];"
            f"[a]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=6:2,"
            f"scale={w}:{h}[bg];[b]scale={w}:{h}:force_original_aspect_ratio=decrease[fit];"
            f"[bg][fit]overlay=(W-w)/2:(H-h)/2[wide];"
            f"[c]crop@face=w='min(iw,trunc(ih*9/16/2)*2)':h='min(ih,trunc(iw*16/9/2)*2)':"
            f"y=0,scale={w}:{h},setsar=1[face];[wide][face]overlay@view=x=-{w}:y=0,setsar=1[v0];")
