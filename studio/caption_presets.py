"""ASS caption presets that share transcript timing with the legacy styles.

Defines styling, pacing, visual hierarchy, and SubStation Alpha (.ass) dialogue
event generators for the seven advanced caption presets:
  - Cinema (cinema)
  - Speaker Card (speaker_card)
  - Marker (marker)
  - Word Build (word_build)
  - Pulse (pulse)
  - Sweep (sweep)
  - Focus Line (focus_line)
"""

from __future__ import annotations

from typing import Any, Callable

from . import roman


def preset(
    label: str,
    size: int,
    per: int,
    lines: int = 1,
    font: str = "Poppins ExtraBold",
    base: str = "FFFFFF",
) -> dict[str, Any]:
    """Helper creating standardized preset configuration dictionaries."""
    return {
        "label": label,
        "font": font,
        "size": size,
        "per": per,
        "lines": lines,
        "base": base,
        "outline": 4,
    }


PRESETS: dict[str, dict[str, Any]] = {
    "cinema": preset("Cinema", 82, 11, lines=2, base="E8F4FA"),
    "speaker_card": preset("Speaker Card", 84, 10, lines=2),
    "marker": preset("Marker", 98, 5),
    "word_build": preset("Word Build", 96, 7, lines=2),
    "pulse": preset("Pulse", 148, 1, font="Anton"),
    "sweep": preset("Sweep", 96, 5),
    "focus_line": preset("Focus Line", 88, 5),
}


def _rows(
    words: list[tuple[str, int, int]],
    measure: Callable[[str], float],
    limit: float,
    lines: int,
) -> list[list[tuple[str, int, int]]]:
    """Splits a list of words into balanced line rows respecting width limits."""
    def width(row: list[tuple[str, int, int]]) -> float:
        return measure(" ".join(word[0] for word in row))

    if lines == 1 or len(words) < 2 or width(words) <= limit:
        return [words]

    split = min(
        range(1, len(words)),
        key=lambda i: max(width(words[:i]), width(words[i:])),
    )
    return [words[:split], words[split:]]


def _cues(
    words: list[tuple[str, int, int]],
    style: dict[str, Any],
    measure: Callable[[str], float],
    limit: float,
) -> list[list[tuple[str, int, int]]]:
    """Groups words into timed subtitle cues based on length, pauses, and punctuation."""
    cues: list[list[tuple[str, int, int]]] = []
    cue: list[tuple[str, int, int]] = []

    for word in words:
        candidate = cue + [word]
        rows = _rows(candidate, measure, limit, style["lines"])
        if cue and (
            len(candidate) > style["per"]
            or word[1] - cue[-1][2] > 45
            or cue[-1][0].endswith((".", "!", "?"))
            or any(measure(" ".join(w[0] for w in row)) > limit for row in rows)
        ):
            cues.append(cue)
            cue = []
        cue.append(word)

    if cue:
        cues.append(cue)
    return cues


def events(
    key: str,
    words: list[dict[str, Any]],
    start: float,
    end: float,
    w: int,
    h: int,
    anchor: float,
    font: Any,
    clean: Callable[[str], str],
    timestamp: Callable[[float], str],
) -> list[str]:
    """Generates styled ASS Dialogue lines for the given caption preset."""
    style = PRESETS[key]
    scale = w / 1080.0
    duration = round((end - start) * 100)

    timed: list[tuple[str, int, int]] = []
    for word in sorted(words, key=lambda item: item["s"]):
        text = clean(word["w"])
        a = max(0, round((word["s"] - start) * 100))
        b = min(duration, round((word["e"] - start) * 100))
        if text and b > a:
            timed.append((text, a, b))

    normalized: list[tuple[str, int, int]] = []
    for i, (text, a, b) in enumerate(timed):
        if i + 1 < len(timed):
            b = min(b, timed[i + 1][1])
        if b > a:
            normalized.append((text, a, b))

    size = round(style["size"] * scale)
    limit = w * 0.83
    cues = _cues(normalized, style, lambda s: font.width(s, size), limit)
    output: list[str] = []

    def emit(a: int, b: int, tags: str, text: str, layer: int = 1) -> None:
        if b > a:
            output.append(
                f"Dialogue: {layer},{timestamp(a / 100.0)},{timestamp(b / 100.0)},Cap,,0,0,0,,{{{tags}}}{text}"
            )

    def position(x: float, y: float, fs: int, align: int = 5) -> str:
        return rf"\an{align}\pos({x:.1f},{y:.1f})\fs{fs}\q2"

    def plate(a: int, b: int, left: float, top: float, width: float, height: float, color: str) -> None:
        tags = rf"\an7\pos({left:.1f},{top:.1f})\bord0\shad0\1c&H{color}&\p1"
        rw, rh = round(width), round(height)
        emit(a, b, tags, f"m 0 0 l {rw} 0 {rw} {rh} 0 {rh}", layer=0)

    for i, cue in enumerate(cues):
        a = cue[0][1]
        following = cues[i + 1] if i + 1 < len(cues) else []
        until = min(duration, following[0][1] if following else duration, cue[-1][2] + 18)
        rows = _rows(cue, lambda s: font.width(s, size), limit, style["lines"])
        lines = [" ".join(word[0] for word in row) for row in rows]

        def fit(text: str, desired: int) -> int:
            return max(1, min(desired, int(desired * limit / max(1.0, font.width(text, desired)))))

        fs = min(fit(line, size) for line in lines)
        line_height = fs * 0.95
        count = 2 if key == "focus_line" else len(rows)
        block = count * line_height
        y = max(block / 2.0 + 12 * scale, min(h - block / 2.0 - 12 * scale, anchor))
        first_y = y - (count - 1) * line_height / 2.0
        widths = [font.width(line, fs) for line in lines]
        left = (w - max(widths)) / 2.0

        if key == "speaker_card":
            plate(
                a,
                until,
                left - 14 * scale,
                y - block / 2.0 - 6 * scale,
                max(widths) + 28 * scale,
                block + 12 * scale,
                "292522",
            )

        for j, (row, line) in enumerate(zip(rows, lines)):
            cy = first_y + j * line_height
            pos = position(w / 2.0, cy, fs)

            if key == "speaker_card":
                emit(a, until, position(left, cy, fs, 4) + r"\bord0", line)
            elif key in ("cinema", "focus_line"):
                emit(a, until, pos, line)
            elif key == "pulse":
                length = row[0][2] - a
                entrance = (
                    rf"\fscx94\fscy94\t(0,{min(85, length * 4)},\fscx100\fscy100)"
                    if length >= 8
                    else ""
                )
                emit(a, row[0][2], pos + entrance, line)
            elif key == "word_build":
                # Invisible words reserve their final positions, including on the second line.
                for k, (_, onset, _) in enumerate(row):
                    stop = row[k + 1][1] if k + 1 < len(row) else until
                    visible = " ".join(item[0] for item in row[: k + 1])
                    hidden = " ".join(item[0] for item in row[k + 1 :])
                    emit(onset, stop, pos, visible + (r"{\alpha&HFF&} " + hidden if hidden else ""))
            elif not roman.drawable(line):
                # Let libass shape and reorder the complete line using fallback fonts.
                boundaries = sorted({a, until, *(t for _, s, e in row for t in (s, e))})
                for lo, hi in zip(boundaries, boundaries[1:]):
                    parts = []
                    for text, onset, stop in row:
                        lit = onset <= lo and (key == "sweep" or lo < stop)
                        parts.append((r"{\1c&H00FFCC&}" if lit else r"{\1c&HFFFFFF&}") + text)
                    emit(lo, hi, pos, " ".join(parts))
            else:
                x = (w - widths[j]) / 2.0
                for text, onset, stop in row:
                    width = font.width(text, fs)
                    word_pos = position(x, cy, fs, 4)
                    emit(a, onset, word_pos, text)
                    if key == "marker":
                        plate(onset, stop, x - 3 * scale, cy - fs * 0.42, width + 6 * scale, fs * 0.84, "00FFCC")
                        emit(onset, stop, word_pos + r"\1c&H161616&\bord0", text)
                        emit(stop, until, word_pos, text)
                    else:
                        emit(onset, stop, word_pos + rf"\2c&HFFFFFF&\1c&HF3DAC1&\kf{stop - onset}", text)
                        emit(stop, until, word_pos + r"\1c&HF3DAC1&", text)
                    x += width + font.width(" ", fs)

        if key == "focus_line" and following and following[0][1] - cue[-1][2] <= 45:
            preview = " ".join(word[0] for word in following)
            emit(
                a,
                until,
                position(w / 2.0, first_y + line_height, fit(preview, round(size * 0.77)))
                + r"\1c&HD2CECA&",
                preview,
            )

    return output
