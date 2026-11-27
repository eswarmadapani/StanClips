"""Manual Clip Layout Studio - Data Model, Presets, and Geometry Transformation.

Allows users to manually select source regions (facecam, gameplay) and arrange them
on a vertical 9:16 canvas with presets (Classic Split, Reverse Split, Small Facecam,
Circle Facecam, Freestyle) or custom user templates.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from . import config

PRESETS = {
    "classic_split": {
        "id": "classic_split",
        "name": "Classic Split (35/65)",
        "description": "Facecam on top (35%), Gameplay on bottom (65%)",
        "layers": [
            {
                "id": "gameplay",
                "region": "gameplay",
                "x": 0.0,
                "y": 0.35,
                "w": 1.0,
                "h": 0.65,
                "fit": "cover",
                "shape": "rectangle",
                "radius": 0,
                "border": 0,
                "borderColor": "#00FF88",
                "zIndex": 1,
            },
            {
                "id": "facecam",
                "region": "facecam",
                "x": 0.0,
                "y": 0.0,
                "w": 1.0,
                "h": 0.35,
                "fit": "cover",
                "shape": "rectangle",
                "radius": 0,
                "border": 0,
                "borderColor": "#00FF88",
                "zIndex": 2,
            },
        ],
        "hook": {"enabled": True, "y": 0.37, "style": "badge"},
        "captions": {"enabled": True, "y": 0.80, "style": "bounce"},
        "background": {"type": "color", "value": "#000000"},
    },
    "reverse_split": {
        "id": "reverse_split",
        "name": "Reverse Split (65/35)",
        "description": "Gameplay on top (65%), Facecam on bottom (35%)",
        "layers": [
            {
                "id": "gameplay",
                "region": "gameplay",
                "x": 0.0,
                "y": 0.0,
                "w": 1.0,
                "h": 0.65,
                "fit": "cover",
                "shape": "rectangle",
                "radius": 0,
                "border": 0,
                "borderColor": "#00FF88",
                "zIndex": 1,
            },
            {
                "id": "facecam",
                "region": "facecam",
                "x": 0.0,
                "y": 0.65,
                "w": 1.0,
                "h": 0.35,
                "fit": "cover",
                "shape": "rectangle",
                "radius": 0,
                "border": 0,
                "borderColor": "#00FF88",
                "zIndex": 2,
            },
        ],
        "hook": {"enabled": True, "y": 0.08, "style": "badge"},
        "captions": {"enabled": True, "y": 0.45, "style": "bounce"},
        "background": {"type": "color", "value": "#000000"},
    },
    "small_facecam": {
        "id": "small_facecam",
        "name": "Small Facecam (PiP)",
        "description": "Full gameplay with floating corner facecam",
        "layers": [
            {
                "id": "gameplay",
                "region": "gameplay",
                "x": 0.0,
                "y": 0.0,
                "w": 1.0,
                "h": 1.0,
                "fit": "cover",
                "shape": "rectangle",
                "radius": 0,
                "border": 0,
                "borderColor": "#00FF88",
                "zIndex": 1,
            },
            {
                "id": "facecam",
                "region": "facecam",
                "x": 0.58,
                "y": 0.05,
                "w": 0.38,
                "h": 0.24,
                "fit": "cover",
                "shape": "rectangle",
                "radius": 16,
                "border": 4,
                "borderColor": "#00FF88",
                "zIndex": 2,
            },
        ],
        "hook": {"enabled": True, "y": 0.35, "style": "badge"},
        "captions": {"enabled": True, "y": 0.75, "style": "bounce"},
        "background": {"type": "color", "value": "#000000"},
    },
    "circle_facecam": {
        "id": "circle_facecam",
        "name": "Circle Facecam",
        "description": "Full gameplay with circular masked streamer camera",
        "layers": [
            {
                "id": "gameplay",
                "region": "gameplay",
                "x": 0.0,
                "y": 0.0,
                "w": 1.0,
                "h": 1.0,
                "fit": "cover",
                "shape": "rectangle",
                "radius": 0,
                "border": 0,
                "borderColor": "#00FF88",
                "zIndex": 1,
            },
            {
                "id": "facecam",
                "region": "facecam",
                "x": 0.62,
                "y": 0.05,
                "w": 0.32,
                "h": 0.18,
                "fit": "cover",
                "shape": "circle",
                "radius": 0,
                "border": 4,
                "borderColor": "#00FF88",
                "zIndex": 2,
            },
        ],
        "hook": {"enabled": True, "y": 0.30, "style": "badge"},
        "captions": {"enabled": True, "y": 0.75, "style": "bounce"},
        "background": {"type": "color", "value": "#000000"},
    },
    "freestyle": {
        "id": "freestyle",
        "name": "Freestyle",
        "description": "Customizable freeform positioning on blurred background",
        "layers": [
            {
                "id": "gameplay",
                "region": "gameplay",
                "x": 0.05,
                "y": 0.32,
                "w": 0.90,
                "h": 0.60,
                "fit": "cover",
                "shape": "rectangle",
                "radius": 12,
                "border": 2,
                "borderColor": "#FF7700",
                "zIndex": 1,
            },
            {
                "id": "facecam",
                "region": "facecam",
                "x": 0.05,
                "y": 0.05,
                "w": 0.90,
                "h": 0.25,
                "fit": "cover",
                "shape": "rectangle",
                "radius": 12,
                "border": 2,
                "borderColor": "#00FF88",
                "zIndex": 2,
            },
        ],
        "hook": {"enabled": True, "y": 0.31, "style": "badge"},
        "captions": {"enabled": True, "y": 0.78, "style": "bounce"},
        "background": {"type": "blur", "value": 8},
    },
}


def default_layout(src_w: int = 1280, src_h: int = 720) -> dict[str, Any]:
    """Default manual layout configuration with sensible default regions."""
    # Facecam default: bottom-left or top-left corner
    # In standard 16:9 streams, webcams typically occupy ~25-35% width, ~20-30% height
    return {
        "version": 1,
        "mode": "manual",
        "preset": "classic_split",
        "output": {
            "width": 1080,
            "height": 1920,
            "fps": 30,
            "quality": 720,
        },
        "regions": {
            "facecam": {
                "x": 0.0,
                "y": 0.45,
                "w": 0.35,
                "h": 0.30,
            },
            "gameplay": {
                "x": 0.0,
                "y": 0.0,
                "w": 1.0,
                "h": 1.0,
            },
        },
        "layers": PRESETS["classic_split"]["layers"],
        "hook": PRESETS["classic_split"]["hook"],
        "captions": PRESETS["classic_split"]["captions"],
        "background": PRESETS["classic_split"]["background"],
        "music": {
            "enabled": False,
            "file": None,
            "volume": 0.25,
        },
    }


def validate_region(r: Any, name: str) -> dict[str, float]:
    """Ensure normalized coordinates [0.0, 1.0] are valid and bounded."""
    if not isinstance(r, dict):
        raise ValueError(f"Region {name} must be a dictionary.")
    try:
        x = max(0.0, min(0.95, float(r.get("x", 0.0))))
        y = max(0.0, min(0.95, float(r.get("y", 0.0))))
        w = max(0.05, min(1.0 - x, float(r.get("w", 0.3))))
        h = max(0.05, min(1.0 - y, float(r.get("h", 0.3))))
        return {
            "x": round(x, 4),
            "y": round(y, 4),
            "w": round(w, 4),
            "h": round(h, 4),
        }
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid numeric coordinate in region {name}: {e}") from e


def validate_layout(data: Any, src_w: int = 1280, src_h: int = 720) -> dict[str, Any]:
    """Strictly validates and normalizes layout payload from the client."""
    if not isinstance(data, dict):
        raise ValueError("Layout configuration must be a JSON object.")

    out: dict[str, Any] = {
        "version": 1,
        "mode": "manual",
        "preset": str(data.get("preset") or "classic_split")[:50],
        "output": {
            "width": 1080 if int((data.get("output") or {}).get("quality", 720)) > 720 else 720,
            "height": 1920 if int((data.get("output") or {}).get("quality", 720)) > 720 else 1280,
            "fps": 30,
            "quality": int((data.get("output") or {}).get("quality", 720)),
        },
    }

    # Regions
    raw_regs = data.get("regions") or {}
    out["regions"] = {
        "facecam": validate_region(raw_regs.get("facecam") or {"x": 0.0, "y": 0.45, "w": 0.35, "h": 0.30}, "facecam"),
        "gameplay": validate_region(raw_regs.get("gameplay") or {"x": 0.0, "y": 0.0, "w": 1.0, "h": 1.0}, "gameplay"),
    }

    # Layers
    raw_layers = data.get("layers")
    if not isinstance(raw_layers, list) or len(raw_layers) == 0:
        preset_key = out["preset"] if out["preset"] in PRESETS else "classic_split"
        raw_layers = PRESETS[preset_key]["layers"]

    clean_layers = []
    for layer in raw_layers:
        if not isinstance(layer, dict):
            continue
        lid = str(layer.get("id") or "layer")[:30]
        region_id = str(layer.get("region") or lid)[:30]
        lx = max(0.0, min(1.0, float(layer.get("x", 0.0))))
        ly = max(0.0, min(1.0, float(layer.get("y", 0.0))))
        lw = max(0.05, min(1.0, float(layer.get("w", 1.0))))
        lh = max(0.05, min(1.0, float(layer.get("h", 0.5))))
        shape = "circle" if str(layer.get("shape", "rectangle")).lower() == "circle" else "rectangle"
        fit = "contain" if str(layer.get("fit", "cover")).lower() == "contain" else "cover"
        radius = max(0, min(100, int(layer.get("radius", 0))))
        border = max(0, min(20, int(layer.get("border", 0))))
        border_color = str(layer.get("borderColor") or "#00FF88")[:10]
        if not re.match(r"^#[0-9a-fA-F]{6}$", border_color):
            border_color = "#00FF88"
        z_index = int(layer.get("zIndex", 1))

        clean_layers.append({
            "id": lid,
            "region": region_id,
            "x": round(lx, 4),
            "y": round(ly, 4),
            "w": round(lw, 4),
            "h": round(lh, 4),
            "shape": shape,
            "fit": fit,
            "radius": radius,
            "border": border,
            "borderColor": border_color,
            "zIndex": z_index,
        })

    # Sort layers by zIndex
    clean_layers.sort(key=lambda item: item["zIndex"])
    out["layers"] = clean_layers

    # Hook text
    raw_hook = data.get("hook") or {}
    out["hook"] = {
        "enabled": bool(raw_hook.get("enabled", True)),
        "y": max(0.02, min(0.95, float(raw_hook.get("y", 0.35)))),
        "style": str(raw_hook.get("style", "badge"))[:20],
    }

    # Captions
    raw_caps = data.get("captions") or {}
    out["captions"] = {
        "enabled": bool(raw_caps.get("enabled", True)),
        "y": max(0.05, min(0.95, float(raw_caps.get("y", 0.80)))),
        "style": str(raw_caps.get("style", "bounce"))[:20],
    }

    # Background
    raw_bg = data.get("background") or {}
    bg_type = "blur" if str(raw_bg.get("type", "color")).lower() == "blur" else "color"
    out["background"] = {
        "type": bg_type,
        "value": str(raw_bg.get("value", "#000000" if bg_type == "color" else 8))[:20],
    }

    # Music
    raw_music = data.get("music") or {}
    out["music"] = {
        "enabled": bool(raw_music.get("enabled", False)),
        "file": str(raw_music.get("file") or "")[:200] if raw_music.get("file") else None,
        "volume": max(0.0, min(1.0, float(raw_music.get("volume", 0.25)))),
    }

    return out


def to_ffmpeg_geometry(
    layout_data: dict[str, Any],
    src_w: int,
    src_h: int,
    out_w: int = 1080,
    out_h: int = 1920,
) -> dict[str, Any]:
    """Translates normalized layout configuration into precise even-pixel FFmpeg geometries."""
    regs = layout_data.get("regions", {})
    fc_reg = regs.get("facecam", {"x": 0.0, "y": 0.45, "w": 0.35, "h": 0.30})
    gm_reg = regs.get("gameplay", {"x": 0.0, "y": 0.0, "w": 1.0, "h": 1.0})

    # Helper: even integer
    def even(val: float | int) -> int:
        n = int(round(val))
        return max(2, n if n % 2 == 0 else n - 1)

    # Facecam source crop in source pixels
    fx = int(round(fc_reg["x"] * src_w))
    fy = int(round(fc_reg["y"] * src_h))
    fw = even(fc_reg["w"] * src_w)
    fh = even(fc_reg["h"] * src_h)
    fx = max(0, min(src_w - fw, fx))
    fy = max(0, min(src_h - fh, fy))

    # Gameplay source crop in source pixels
    gx = int(round(gm_reg["x"] * src_w))
    gy = int(round(gm_reg["y"] * src_h))
    gw = even(gm_reg["w"] * src_w)
    gh = even(gm_reg["h"] * src_h)
    gx = max(0, min(src_w - gw, gx))
    gy = max(0, min(src_h - gh, gy))

    # Destination layers on output canvas
    layers_dict = {}
    for lyr in layout_data.get("layers", []):
        dx = int(round(lyr["x"] * out_w))
        dy = int(round(lyr["y"] * out_h))
        dw = even(lyr["w"] * out_w)
        dh = even(lyr["h"] * out_h)
        layers_dict[lyr["id"]] = {
            **lyr,
            "dx": dx,
            "dy": dy,
            "dw": dw,
            "dh": dh,
        }

    # Hook and caption positions
    hook_data = layout_data.get("hook", {})
    cap_data = layout_data.get("captions", {})
    hook_y = int(round(hook_data.get("y", 0.35) * out_h))
    cap_y = int(round(cap_data.get("y", 0.80) * out_h))

    return {
        "src_w": src_w,
        "src_h": src_h,
        "out_w": out_w,
        "out_h": out_h,
        "facecam_crop": (fx, fy, fw, fh),
        "gameplay_crop": (gx, gy, gw, gh),
        "layers": layers_dict,
        "hook_y": hook_y,
        "cap_y": cap_y,
        "hook": hook_data,
        "captions": cap_data,
        "background": layout_data.get("background", {"type": "color", "value": "#000000"}),
        "music": layout_data.get("music", {"enabled": False}),
        "preset": layout_data.get("preset", "classic_split"),
    }


def template_dir(uid: str = "u_local") -> Path:
    d = config.user_dir(uid) / "templates"
    d.mkdir(parents=True, exist_ok=True)
    return d


def list_templates(uid: str = "u_local") -> list[dict[str, Any]]:
    """Returns presets and user-saved templates."""
    results = [
        {"id": k, "name": v["name"], "description": v["description"], "is_preset": True}
        for k, v in PRESETS.items()
    ]
    td = template_dir(uid)
    for tf in td.glob("*.json"):
        try:
            d = json.loads(tf.read_text(encoding="utf-8"))
            results.append({
                "id": tf.stem,
                "name": d.get("name", tf.stem),
                "description": d.get("description", "Custom template"),
                "is_preset": False,
                "data": d,
            })
        except Exception:
            pass
    return results


def save_template(name: str, layout_data: dict[str, Any], uid: str = "u_local") -> str:
    slug = re.sub(r"[^\w\-]+", "_", name.strip().lower()).strip("_")[:40] or "custom_layout"
    td = template_dir(uid)
    fp = td / f"{slug}.json"
    doc = {**layout_data, "name": name.strip()[:60], "slug": slug}
    fp.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    return slug


def delete_template(slug: str, uid: str = "u_local") -> bool:
    td = template_dir(uid)
    fp = td / f"{slug}.json"
    if fp.is_file():
        fp.unlink()
        return True
    return False


def build_filter(geom: dict[str, Any], fps: int = 30) -> str:
    """Builds the FFmpeg filtergraph for the given layout geometry."""
    w, h = geom["out_w"], geom["out_h"]
    fx, fy, fw, fh = geom["facecam_crop"]
    gx, gy, gw, gh = geom["gameplay_crop"]

    fc_lyr = geom["layers"].get("facecam", {})
    gm_lyr = geom["layers"].get("gameplay", {})

    fdx, fdy = fc_lyr.get("dx", 0), fc_lyr.get("dy", 0)
    fdw, fdh = fc_lyr.get("dw", w), fc_lyr.get("dh", int(h * 0.35))

    gdx, gdy = gm_lyr.get("dx", 0), gm_lyr.get("dy", fdh)
    gdw, gdh = gm_lyr.get("dw", w), gm_lyr.get("dh", h - fdh)

    preset = geom.get("preset", "classic_split")
    shape = fc_lyr.get("shape", "rectangle")
    bg = geom.get("background", {"type": "color", "value": "#000000"})

    fc_stream = (
        f"[0:v]fps={fps},crop={fw}:{fh}:{fx}:{fy},"
        f"scale={fdw}:{fdh}:force_original_aspect_ratio=increase,crop={fdw}:{fdh},setsar=1"
    )

    gm_stream = (
        f"[0:v]fps={fps},crop={gw}:{gh}:{gx}:{gy},"
        f"scale={gdw}:{gdh}:force_original_aspect_ratio=increase,crop={gdw}:{gdh},setsar=1"
    )

    # Fast path for classic stacked split
    if (
        preset == "classic_split"
        and shape == "rectangle"
        and fdx == 0
        and gdx == 0
        and fdy == 0
        and gdy == fdh
        and fdw == w
        and gdw == w
        and (fdh + gdh) == h
    ):
        return f"{fc_stream}[fc];{gm_stream}[gm];[fc][gm]vstack=inputs=2,setsar=1[v0];"

    # Fast path for reverse stacked split
    if (
        preset == "reverse_split"
        and shape == "rectangle"
        and fdx == 0
        and gdx == 0
        and gdy == 0
        and fdy == gdh
        and fdw == w
        and gdw == w
        and (fdh + gdh) == h
    ):
        return f"{gm_stream}[gm];{fc_stream}[fc];[gm][fc]vstack=inputs=2,setsar=1[v0];"

    parts = []
    # Background layer
    if bg.get("type") == "blur":
        parts.append(
            f"[0:v]fps={fps},scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=8:3,scale={w}:{h},eq=brightness=-0.14:saturation=1.15,setsar=1[bg];"
        )
    else:
        bg_col = str(bg.get("value", "#000000")).replace("#", "0x")
        parts.append(f"color=c={bg_col}:s={w}x{h}:r={fps},setsar=1[bg];")

    parts.append(f"{gm_stream}[gm];")

    # Facecam layer
    if shape == "circle":
        # Fast 1-frame circle alpha mask looped, then alphamerged (1000x faster than running geq per-frame)
        parts.append(
            f"color=s={fdw}x{fdh}:d=1,format=yuva420p,"
            f"geq=lum=255:cb=128:cr=128:a='if(lte(pow(X-W/2,2)+pow(Y-H/2,2),pow(min(W,H)/2,2)),255,0)',"
            f"loop=loop=-1:size=1:start=0[fc_mask];"
            f"{fc_stream}[fc_raw];"
            f"[fc_raw][fc_mask]alphamerge[fc];"
        )
    else:
        parts.append(f"{fc_stream}[fc];")

    parts.append(f"[bg][gm]overlay={gdx}:{gdy}:eof_action=pass[v_gm];")
    parts.append(f"[v_gm][fc]overlay={fdx}:{fdy}:eof_action=pass,setsar=1[v0];")
    return "".join(parts)

