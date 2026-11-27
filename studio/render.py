"""Turns a time range into a vertical clip: 9:16 layout, bouncy word captions, hook title, cover."""
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from . import caption_presets, config, roman
from .media import NO_WINDOW, run

W, H = config.OUT_W, config.OUT_H

# ASS colours are &HBBGGRR. `size` is the ASS font size (line height); _Font turns it into real pixels.
STYLES = {
    "bounce": {"label": "Bounce", "font": "Poppins ExtraBold", "size": 132, "base": "FFFFFF", "active": "00F0FF",
               "strong": "FFFFFF", "outline": 7, "pop": 112, "upper": True, "per": 3},
    "hype": {"label": "Hype", "font": "Anton", "size": 152, "base": "FFFFFF", "active": "3C3CFF",
             "strong": "00D7FF", "outline": 7, "pop": 114, "upper": True, "per": 2},
    "clean": {"label": "Clean", "font": "Poppins ExtraBold", "size": 100, "base": "FFFFFF", "active": "6BD7FF",
              "strong": "FFFFFF", "outline": 5, "pop": 106, "upper": False, "per": 4},
}
STYLES.update(caption_presets.PRESETS)
HOOK = {"font": "Poppins ExtraBold", "size": 96, "ink": "14100E", "box": "FFFFFF", "pad_x": 36, "pad_y": 22, "radius": 26,
        "max_w": 900}
FONT_FILES = {"Poppins ExtraBold": "Poppins-ExtraBold.ttf", "Anton": "Anton-Regular.ttf", "Archivo Black": "ArchivoBlack-Regular.ttf"}
CAP_MAX_W = 960   # captions never run wider than this, whatever is said


class _Font:
    """Measures text exactly as the renderer will draw it, so every word can be placed by hand: the highlighted
    word can grow without pushing its neighbours, and the heading box fits its text."""
    _cache: dict = {}

    def __init__(self, name):
        import struct
        path = Path(__file__).resolve().parent / "fonts" / FONT_FILES.get(name, FONT_FILES["Poppins ExtraBold"])
        d = path.read_bytes()
        tables = {}
        for i in range(struct.unpack(">H", d[4:6])[0]):
            tag, _, off, _ = struct.unpack(">4sIII", d[12 + 16 * i: 28 + 16 * i])
            tables[tag] = off
        self.upm = struct.unpack(">H", d[tables[b"head"] + 18: tables[b"head"] + 20])[0]
        o = tables[b"OS/2"]
        self.asc, self.desc = struct.unpack(">HH", d[o + 74: o + 78])      # what the renderer sizes the font by
        self.cap = struct.unpack(">h", d[o + 88: o + 90])[0] or int(self.upm * 0.7)
        self.path = str(path)
        self._pil = {}

    @classmethod
    def get(cls, name):
        if name not in cls._cache:
            cls._cache[name] = cls(name)
        return cls._cache[name]

    def em(self, size):
        return size * self.upm / (self.asc + self.desc)

    def width(self, text, size):
        """Pixels wide at this ASS size."""
        try:
            from PIL import ImageFont
            if "f" not in self._pil:
                self._pil["f"] = ImageFont.truetype(self.path, 200)
            return self._pil["f"].getlength(text) * self.em(size) / 200
        except Exception:  # noqa: BLE001 - no measuring library: a fair estimate keeps clips rendering
            return len(text) * self.em(size) * 0.62

    def cap_shift(self, size):
        """How far below the anchor the middle of a capital letter sits when text is centred on a point."""
        return ((self.asc - self.desc) / 2 - self.cap / 2) * size / (self.asc + self.desc)


CAPTION_LEAD = 0.0  # measured: word stamps are within 0.15 s of the voice, so no shift is needed
def install_fonts():
    """Copy the bundled caption fonts next to the data, so captions look the same on every machine and server."""
    src = Path(__file__).resolve().parent / "fonts"
    for f in src.glob("*.ttf"):
        if not (config.FONTS_DIR / f.name).exists():
            shutil.copyfile(f, config.FONTS_DIR / f.name)


LAYOUTS = {"blur": "Full frame + blurred fill", "zoom": "Zoomed in + blurred fill", "crop": "Fill the screen (centre crop)",
           "gameplay": "Gameplay + facecam split", "podcast": "Podcast · Follow speaker"}


def _ts(t):
    t = max(0.0, t)
    h, m = int(t // 3600), int(t % 3600 // 60)
    return f"{h}:{m:02d}:{t % 60:05.2f}"


def _clean(text):
    return re.sub(r"[\x00-\x1f\x7f]+", " ", re.sub(r"[{}\\]", "", str(text))).strip()


def _key(word):
    return re.sub(r"[^a-z0-9']", "", word.lower())


def _groups(words, per):
    out, cur = [], []
    for w in words:
        if cur and (len(cur) >= per or sum(len(x["w"]) for x in cur) + len(w["w"]) > 16
                    or w["s"] - cur[-1]["e"] > 0.45 or cur[-1]["w"][-1:] in ".?!"):
            out.append(cur)
            cur = []
        cur.append(w)
    if cur:
        out.append(cur)
    return out


def geometry(src_w, src_h, layout, facecam_pos="top", out_w=None, out_h=None):
    """Where the video sits in the frame, and where hook and captions go."""
    w = out_w or W
    h = out_h or H
    if src_h >= src_w and layout not in ("crop", "gameplay"):
        layout = "crop"  # already vertical or square: nothing to gain from a blurred fill
    if layout == "blur":
        fg_h = min(h, int(round(w * src_h / src_w / 2)) * 2)
    elif layout == "zoom":
        fg_h = int(round(1000 * h / 1920 / 2)) * 2
    else:
        fg_h = h
    top = (h - fg_h) // 2
    if layout == "crop":
        return layout, fg_h, int(300 * h / 1920), int(1380 * h / 1920)
    if layout == "gameplay":
        face_h = int(round(h * 0.35 / 2)) * 2
        game_h = h - face_h
        if facecam_pos == "bottom":
            hook_y = int(220 * h / 1920)
            cap_y = int(1080 * h / 1920)
        else:
            hook_y = face_h + int(58 * h / 1920)
            cap_y = face_h + int(game_h * 0.58)
        return layout, fg_h, hook_y, cap_y
    return layout, fg_h, max(int(230 * h / 1920), top - int(190 * h / 1920)), min(int(1640 * h / 1920), top + fg_h + int(180 * h / 1920))


def _hook_events(hook, dur, y, out_w=None):
    """The heading: dark text in a white rounded box that fits it, on one line or two balanced ones."""
    w = out_w or W
    f, size = _Font.get(HOOK["font"]), HOOK["size"]
    scale = w / 1080.0
    size = int(round(size * scale))
    max_w = int(round(HOOK["max_w"] * scale))
    words = hook.split()
    if not words:
        return []
    lines = [" ".join(words)]
    if f.width(lines[0], size) > max_w and len(words) > 1:      # two lines, split where they come out most even
        cut = min(range(1, len(words)), key=lambda i: max(f.width(" ".join(words[:i]), size), f.width(" ".join(words[i:]), size)))
        lines = [" ".join(words[:cut]), " ".join(words[cut:])]
    widest = max(f.width(l, size) for l in lines)
    if widest > max_w:
        size = max(int(40 * scale), int(size * max_w / widest))
        widest = max(f.width(l, size) for l in lines)
    line_h = f.em(size) * 1.16
    pad_x = int(round(HOOK["pad_x"] * scale))
    pad_y = int(round(HOOK["pad_y"] * scale))
    bw, bh = widest + 2 * pad_x, line_h * len(lines) + 2 * pad_y
    x0, y0, r = (w - bw) / 2, y - bh / 2, min(HOOK["radius"] * scale, bh / 2)
    x1, y1 = x0 + bw, y0 + bh
    n = lambda v: f"{v:.0f}"                                                         # noqa: E731
    box = (f"m {n(x0 + r)} {n(y0)} l {n(x1 - r)} {n(y0)} b {n(x1)} {n(y0)} {n(x1)} {n(y0)} {n(x1)} {n(y0 + r)} "
           f"l {n(x1)} {n(y1 - r)} b {n(x1)} {n(y1)} {n(x1)} {n(y1)} {n(x1 - r)} {n(y1)} "
           f"l {n(x0 + r)} {n(y1)} b {n(x0)} {n(y1)} {n(x0)} {n(y1)} {n(x0)} {n(y1 - r)} "
           f"l {n(x0)} {n(y0 + r)} b {n(x0)} {n(y0)} {n(x0)} {n(y0)} {n(x0 + r)} {n(y0)}")
    span = f"{_ts(0)},{_ts(dur)}"
    ev = [f"Dialogue: 3,{span},Hook,,0,0,0,,{{\\an7\\pos(0,0)\\fad(160,0)\\c&H{HOOK['box']}&\\p1}}{box}{{\\p0}}"]
    for i, line in enumerate(lines):
        cy = y - line_h * (len(lines) - 1) / 2 + i * line_h - f.cap_shift(size)
        ev.append(f"Dialogue: 4,{span},Hook,,0,0,0,,{{\\an5\\pos({w // 2},{cy:.0f})\\fad(160,0)\\fs{size}}}{line}")
    return ev


def build_ass(words, start, end, hook, style_name, highlight, hook_y, cap_y, out_w=None, out_h=None) -> str:
    w = out_w or W
    h = out_h or H
    scale = w / 1080.0
    st = STYLES.get(style_name, STYLES["bounce"])
    words = [dict(w, s=w["s"] - CAPTION_LEAD, e=w["e"] - CAPTION_LEAD) for w in words]
    strong = {_key(h) for h in highlight if _key(h)}
    st_size = int(round(st["size"] * scale))
    st_outline = max(1, int(round(st["outline"] * scale)))
    hook_size = int(round(HOOK["size"] * scale))
    cap_max_w = int(round(CAP_MAX_W * scale))

    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{st['font']},{st_size},&H00{st['base']},&H00{st['base']},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,{st_outline},0,5,0,0,0,1
Style: Hook,{HOOK['font']},{hook_size},&H00{HOOK['ink']},&H00{HOOK['ink']},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    dur = end - start
    ev = _hook_events(_clean(hook), dur, hook_y, out_w=w)
    f = _Font.get(st["font"])
    if style_name in caption_presets.PRESETS:
        ev.extend(caption_presets.events(style_name, words, start, end, w, h, cap_y, f, _clean, _ts))
        return head + "\n".join(ev) + "\n"
    inside = [dict(w, w=_clean(w["w"])) for w in words if w["s"] >= start - 0.05 and w["s"] < end]
    inside = sorted((w for w in inside if w["w"]), key=lambda w: w["s"])
    for i, w_elem in enumerate(inside[:-1]):
        w_elem["e"] = max(w_elem["s"], min(w_elem["e"], inside[i + 1]["s"]))
    groups = _groups(inside, st["per"])
    for gi, g in enumerate(groups):
        g_start = max(0.0, g[0]["s"] - start)
        g_end = min(g[-1]["e"] + 0.25, groups[gi + 1][0]["s"] if gi + 1 < len(groups) else end) - start
        if g_end - g_start < 0.02:
            continue
        texts = []
        for x in g:
            t = re.sub(r"[.,;:]+$", "", x["w"])
            texts.append(t.upper() if st["upper"] else t)
        if not all(roman.drawable(t) for t in texts):
            line = " ".join(texts)
            fs = max(int(44 * scale), min(int(st_size * 0.7), int(1500 * scale / max(1, len(line)) * 1.6)))
            ev.append(f"Dialogue: 1,{_ts(g_start)},{_ts(g_end)},Cap,,60,60,0,,{{\\an5\\pos({w // 2},{cap_y:.0f})\\q0\\fs{fs}}}{line}")
            continue
        size = st_size
        gap = f.width("n n", size) - 2 * f.width("n", size) + (2 * st_outline + 6) * size / max(1, st_size)
        total = sum(f.width(t, size) for t in texts) + gap * (len(texts) - 1)
        if total > cap_max_w:
            size = max(int(36 * scale), int(size * cap_max_w / total))
            gap = f.width("n n", size) - 2 * f.width("n", size) + (2 * st_outline + 6) * size / max(1, st_size)
            total = sum(f.width(t, size) for t in texts) + gap * (len(texts) - 1)
        cy = cap_y - f.cap_shift(size)
        x = (w - total) / 2
        p = st["pop"]
        for i, (w_item, t) in enumerate(zip(g, texts)):
            wd = f.width(t, size)
            p = max(104, min(st["pop"], 100 + int(2200 / max(wd, 1))))
            pos = f"\\an5\\pos({x + wd / 2:.0f},{cy:.0f})\\fs{size}"
            x += wd + gap
            a = max(g_start, w_item["s"] - start)
            b = (g[i + 1]["s"] - start) if i + 1 < len(g) else g_end
            base = st["strong"] if _key(w_item["w"]) in strong else st["base"]
            if a - g_start >= 0.02:
                ev.append(f"Dialogue: 1,{_ts(g_start)},{_ts(a)},Cap,,0,0,0,,{{{pos}\\c&H{base}&}}{t}")
            if b - a >= 0.02:
                ev.append(f"Dialogue: 2,{_ts(a)},{_ts(b)},Cap,,0,0,0,,{{{pos}\\c&H{st['active']}&\\fscx94\\fscy94"
                          f"\\t(0,90,\\fscx{p}\\fscy{p})\\t(90,200,\\fscx{p - 5}\\fscy{p - 5})}}{t}")
            if g_end - b >= 0.02:
                ev.append(f"Dialogue: 1,{_ts(b)},{_ts(g_end)},Cap,,0,0,0,,{{{pos}\\c&H{base}&\\fscx{p - 5}\\fscy{p - 5}"
                          f"\\t(0,90,\\fscx100\\fscy100)}}{t}")
    return head + "\n".join(ev) + "\n"


PIP_W = 380            # how wide the facecam is in the 1080-wide frame
PIP_MARGIN = 26


def _filter(layout, fg_h, facecam=None, facecam_pos="top", out_w=None, out_h=None, fps=None, src_w=1280, src_h=720):
    w = out_w or W
    h = out_h or H
    rate = fps or config.OUT_FPS
    if layout == "gameplay":
        face_h = int(round(h * 0.35 / 2)) * 2
        game_h = h - face_h
        if facecam and len(facecam) == 4 and int(facecam[2]) > 8 and int(facecam[3]) > 8:
            fx, fy, fw, fh = (int(v) for v in facecam)
        else:
            fw, fh = max(16, int(src_w * 0.28)), max(16, int(src_h * 0.32))
            fx, fy = 0, 0
        fc_part = (f"[0:v]fps={rate},crop={fw}:{fh}:{fx}:{fy},"
                   f"scale={w}:{face_h}:force_original_aspect_ratio=increase,crop={w}:{face_h},setsar=1[fc];")
        gm_part = (f"[0:v]fps={rate},"
                   f"scale={w}:{game_h}:force_original_aspect_ratio=increase,crop={w}:{game_h},setsar=1[gm];")
        if facecam_pos == "bottom":
            stack = "[gm][fc]vstack=inputs=2[v0];"
        else:
            stack = "[fc][gm]vstack=inputs=2[v0];"
        return fc_part + gm_part + stack

    if layout == "crop":
        return f"[0:v]fps={rate},scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1[v0];"
    return (f"[0:v]fps={rate},split=2[a][b];"
            f"[a]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=6:2,"
            f"scale={w}:{h},eq=brightness=-0.14:saturation=1.15[bg];"
            f"[b]scale={w}:{fg_h}:force_original_aspect_ratio=increase,crop={w}:{fg_h}[fg];"
            f"[bg][fg]overlay=0:({h}-h)/2,setsar=1[v0];")


def _hook_y(layout, hook_y, facecam=None, facecam_pos="top", out_h=None):
    """Where the heading goes."""
    h = out_h or H
    if layout == "gameplay":
        face_h = int(round(h * 0.35 / 2)) * 2
        if facecam_pos == "bottom":
            return int(220 * h / 1920)
        return face_h + int(58 * h / 1920)
    return hook_y


_qsv_ok = None
RENDER_SECONDS = 600      # one clip's video encode; far beyond normal, so a frozen encoder is stopped, not waited on


def render_clip(src: Path, out_dir: Path, name: str, clip: dict, words: list, src_w: int, src_h: int) -> dict:
    """Writes <name>.mp4, <name>.jpg and <name>.ass into out_dir. Returns file names."""
    out_dir.mkdir(parents=True, exist_ok=True)
    start, end = clip["start"], clip["end"]
    q_raw = clip.get("quality") or 1080
    if isinstance(q_raw, str) and "x" in q_raw:
        q_raw = q_raw.split("x")[0]
    try:
        quality = int(q_raw)
    except (ValueError, TypeError):
        quality = 1080
    out_w, out_h = (720, 1280) if quality <= 720 else (config.OUT_W, config.OUT_H)
    facecam_pos = clip.get("facecam_pos") or "top"

    layout_data = clip.get("layout_data")
    custom_fc = None
    podcast = clip.get("layout") == "podcast"
    if layout_data and not podcast:
        from . import layouts
        geom = layouts.to_ffmpeg_geometry(layout_data, src_w, src_h, out_w, out_h)
        hook_y = geom["hook_y"]
        cap_y = geom["cap_y"]
        custom_fc = layouts.build_filter(geom)
        layout = "manual"
        fg_h = 0
        face = None
    else:
        layout, fg_h, hook_y, cap_y = geometry(src_w, src_h, "blur" if podcast else clip.get("layout", "blur"),
                                               facecam_pos=facecam_pos, out_w=out_w, out_h=out_h)
        face = clip.get("facecam")
        if layout == "gameplay" and not (face and len(face) == 4):
            clip.setdefault("warning", "Facecam was automatically estimated; configure manual coordinates in Options if needed.")
        hook_y = _hook_y(layout, hook_y, face, facecam_pos=facecam_pos, out_h=out_h)

    ass = build_ass(words if clip.get("captions", True) else [], start, end, clip.get("hook", ""), clip.get("style", "bounce"),
                    clip.get("highlight_words", []), hook_y, cap_y, out_w=out_w, out_h=out_h)
    work = Path(tempfile.mkdtemp(prefix="pk"))
    try:
        if podcast:
            from .podcast import full_scene, make_filter
            custom_fc = make_filter(src, work, start, end, out_w, out_h, config.OUT_FPS)
            tracked = bool(custom_fc)
            if not tracked:
                custom_fc = full_scene(out_w, out_h, config.OUT_FPS)
        result = _render_in(work, src, out_dir, name, start, end, layout, fg_h, ass, face=face,
                          facecam_pos=facecam_pos, out_w=out_w, out_h=out_h, src_w=src_w, src_h=src_h,
                          custom_fc=custom_fc)
        if podcast:
            result["warning"] = None if tracked else "Speaker tracking was unavailable or uncertain. The full scene was kept."
        return result
    finally:
        shutil.rmtree(work, ignore_errors=True)


def _render_in(work: Path, src: Path, out_dir: Path, name: str, start, end, layout, fg_h, ass: str, face=None,
               facecam_pos="top", out_w=None, out_h=None, src_w=1280, src_h=720, custom_fc=None) -> dict:
    w = out_w or W
    h = out_h or H
    global _qsv_ok
    (work / f"{name}.ass").write_text(ass, encoding="utf-8")
    (work / "f").mkdir()
    for f in config.FONTS_DIR.glob("*.ttf"):
        shutil.copyfile(f, work / "f" / f.name)
    if custom_fc:
        fc = custom_fc + f"[v0]ass={name}.ass:fontsdir=f[v]"
    else:
        fc = _filter(layout, fg_h, face, facecam_pos=facecam_pos, out_w=w, out_h=h, src_w=src_w, src_h=src_h) + f"[v0]ass={name}.ass:fontsdir=f[v]"
    base = ["ffmpeg", "-y", "-v", "error", "-ss", f"{start:.2f}", "-t", f"{end - start:.2f}", "-i", str(src),
            "-filter_complex", fc, "-map", "[v]", "-map", "0:a?", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
            "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-use_editlist", "0", "-movflags", "+faststart", "-pix_fmt"]
    encoders = []
    if _qsv_ok is not False:
        encoders.append(("qsv", ["nv12", "-c:v", "h264_qsv", "-global_quality", "23", "-preset", "fast"]))
    encoders.append(("x264", ["yuv420p", "-c:v", "libx264", "-crf", "21", "-preset", "veryfast"]))
    err = None
    for label, enc in encoders:
        # A generated background or mask can continue after the input clip ends.
        from . import ctx, jobs
        current_jid = ctx.jid()
        if current_jid and jobs.is_canceled(current_jid):
            raise jobs.JobCanceled("Job canceled by user")
        p = subprocess.Popen(base + enc + ["-t", f"{end - start:.2f}", f"{name}.mp4"], cwd=work,
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                             encoding="utf-8", errors="replace", creationflags=NO_WINDOW)
        jobs.register_process(current_jid, p)
        try:
            out, err_text = p.communicate(timeout=RENDER_SECONDS)
        except subprocess.TimeoutExpired:
            p.kill()
            p.communicate()
            err_text = "Render timed out"
        finally:
            jobs.unregister_process(current_jid, p)
        if current_jid and jobs.is_canceled(current_jid):
            raise jobs.JobCanceled("Job canceled by user")
        if p.returncode == 0:
            if label == "qsv":
                _qsv_ok = True
            break
        err = (err_text or "")[-1200:]
        if label == "qsv":
            _qsv_ok = False
    else:
        raise RuntimeError(f"Render failed: {err}")
    cover_t = min(1.2, (end - start) / 2)
    run(["ffmpeg", "-y", "-v", "error", "-ss", f"{cover_t:.2f}", "-i", f"{name}.mp4", "-frames:v", "1",
         "-q:v", "3", f"{name}.jpg"], cwd=work)
    for ext in ("mp4", "jpg", "ass"):
        shutil.move(str(work / f"{name}.{ext}"), str(out_dir / f"{name}.{ext}"))
    return {"file": f"{name}.mp4", "cover": f"{name}.jpg", "layout": layout, "facecam_pos": facecam_pos, "quality": f"{w}x{h}"}
