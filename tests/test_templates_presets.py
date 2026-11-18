"""Tests for oddly-shorts U1: 4 reusable Remotion templates + per-platform subtitle safe-zone presets."""
from __future__ import annotations

import json
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEW_TEMPLATES = ("receipt-card", "split-benchmark", "diagram-explain", "news-reaction")
PLATFORMS = ("universal", "tiktok", "youtube-shorts", "reels", "x")


class TemplatesAndPresetsTests(unittest.TestCase):
    def test_mit_license_and_mr_omi_attribution_preserved(self):
        self.assertTrue((ROOT / "LICENSE").is_file())
        self.assertTrue((ROOT / "LICENSE.claude-animated-shorts").is_file())
        notice = (ROOT / "NOTICE.md").read_text(encoding="utf-8")
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("claude-animated-shorts", notice)
        self.assertIn("Mr omi", notice)
        self.assertIn("claude-animated-shorts", readme)
        self.assertIn("Mr omi", readme)

    def test_safe_zones_cover_all_target_platforms(self):
        sz_src = (ROOT / "kit" / "safezones.tsx").read_text(encoding="utf-8")
        for p in PLATFORMS:
            self.assertIn(f"{p}", sz_src)
        self.assertIn("instagram-reels", sz_src)
        sub_src = (ROOT / "kit" / "Subtitles.tsx").read_text(encoding="utf-8")
        self.assertIn("resolveSafeZone", sub_src)
        reel_src = (ROOT / "edit" / "remotion" / "ReelEdit.tsx").read_text(encoding="utf-8")
        for p in ("tiktok", "youtube-shorts", "reels", "x"):
            self.assertIn(p, reel_src)

    def test_four_new_templates_exist_and_scaffold_via_oddly_new(self):
        comp_src = (ROOT / "kit" / "Templates.tsx").read_text(encoding="utf-8")
        for comp in ("export const ReceiptCard", "export const SplitBenchmark", "export const DiagramExplain", "export const NewsReaction"):
            self.assertIn(comp, comp_src)

        bash_chk = subprocess.run(["bash", "-n", str(ROOT / "tools" / "oddly")], capture_output=True, text=True)
        self.assertEqual(bash_chk.returncode, 0, bash_chk.stderr)

        with tempfile.TemporaryDirectory() as tmp:
            for fmt in NEW_TEMPLATES:
                tdir = ROOT / "templates" / fmt
                for req in ("index.tsx", "plan.json", "captions.json", "script.txt", "say.json", "audio.py", "copy.txt", "SCRIPT.md"):
                    self.assertTrue((tdir / req).is_file(), f"Missing {req} in {fmt}")
                plan = json.loads((tdir / "plan.json").read_text(encoding="utf-8"))
                self.assertIn(plan.get("platform"), PLATFORMS)
                self.assertGreater(plan["total"], 10)

                slug = f"test-{fmt}"
                res = subprocess.run([str(ROOT / "tools" / "oddly"), "new", slug, fmt], cwd=tmp, capture_output=True, text=True)
                self.assertEqual(res.returncode, 0, res.stderr)
                self.assertTrue((Path(tmp) / "episodes" / slug / "voice" / "script.txt").is_file())
                self.assertTrue((Path(tmp) / "src" / "videos" / slug / "plan.json").is_file())
                self.assertTrue((Path(tmp) / "src" / "videos" / slug / "index.tsx").is_file())

    def test_opsec_and_verified_numbers_in_new_templates(self):
        home_pat = "/" + "Users" + r"/[A-Za-z0-9_]+"
        legacy_pat = r"\b(?:" + "For" + "ge|" + "Man" + r"do)\b|46/50|0\.92"
        for fmt in NEW_TEMPLATES:
            for p in (ROOT / "templates" / fmt).iterdir():
                if p.suffix in {".json", ".txt", ".md", ".tsx", ".ts", ".py"}:
                    txt = p.read_text(encoding="utf-8")
                    self.assertIsNone(re.search(home_pat, txt), f"Path leak in {p}")
                    self.assertIsNone(re.search(legacy_pat, txt, re.I), f"Forbidden/outdated figure in {p}")


if __name__ == "__main__":
    unittest.main()
