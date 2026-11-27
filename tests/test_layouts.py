"""Tests for Manual Clip Layout Studio backend: layouts.py and render integration."""
import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from studio import layouts


class LayoutsTest(unittest.TestCase):
    def test_default_layout(self):
        d = layouts.default_layout(1280, 720)
        self.assertEqual(d["mode"], "manual")
        self.assertEqual(d["preset"], "classic_split")
        self.assertIn("facecam", d["regions"])
        self.assertIn("gameplay", d["regions"])

    def test_validation(self):
        valid = layouts.validate_layout({
            "preset": "reverse_split",
            "regions": {
                "facecam": {"x": 0.1, "y": 0.2, "w": 0.4, "h": 0.3},
                "gameplay": {"x": 0.0, "y": 0.0, "w": 1.0, "h": 1.0}
            }
        })
        self.assertEqual(valid["preset"], "reverse_split")
        self.assertEqual(valid["regions"]["facecam"]["x"], 0.1)

    def test_ffmpeg_geometry(self):
        d = layouts.default_layout(1280, 720)
        geom = layouts.to_ffmpeg_geometry(d, 1280, 720, 720, 1280)
        self.assertEqual(geom["out_w"], 720)
        self.assertEqual(geom["out_h"], 1280)
        fx, fy, fw, fh = geom["facecam_crop"]
        gx, gy, gw, gh = geom["gameplay_crop"]
        self.assertEqual(fw % 2, 0)
        self.assertEqual(fh % 2, 0)
        self.assertEqual(gw % 2, 0)
        self.assertEqual(gh % 2, 0)

    def test_filter_generation(self):
        d = layouts.default_layout(1280, 720)
        geom = layouts.to_ffmpeg_geometry(d, 1280, 720, 720, 1280)
        fc = layouts.build_filter(geom)
        self.assertIn("crop=", fc)
        self.assertIn("scale=", fc)

    def test_templates_persistence(self):
        test_slug = layouts.save_template("Unit Test Template", {"preset": "freestyle"}, uid="u_local")
        self.assertTrue(bool(test_slug))
        templates = layouts.list_templates(uid="u_local")
        self.assertTrue(any(t["id"] == test_slug for t in templates))
        deleted = layouts.delete_template(test_slug, uid="u_local")
        self.assertTrue(deleted)


if __name__ == "__main__":
    unittest.main()
