"""Tests for tools/veo_import.py (OP-*.json sidecar ingestion, AI disclosure, voice/audio consent, OPSEC)."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import veo_import as V  # noqa: E402


class VeoImporterTests(unittest.TestCase):
    def _base_card(self, **overrides):
        base = {
            "id": "OP-2026-010",
            "archivo": "lib_marc_explain_01.mp4",
            "herramienta": "veo",
            "modelo": "veo-3",
            "prompt": "Vertical 9:16 shot of Marc speaking calmly in a warm minimalist lab, no logos, no text.",
            "semilla": 12345,
            "duracion": 6.0,
            "formato": "9:16",
            "personaje": "marc",
            "voz": "am_puck",
            "etiqueta_ia": True,
            "uso_previsto": "Lab Receipts: 116/130 blind router",
            "licencia_audio": "synthetic-original",
        }
        base.update(overrides)
        return base

    def test_valid_single_and_multiclip_import(self):
        with tempfile.TemporaryDirectory() as tmp:
            tpath = Path(tmp)
            in_dir = tpath / "in"
            out_dir = tpath / "out"
            in_dir.mkdir()
            # Create a dummy local MP4 so local_exists=True is also tested
            (in_dir / "lib_marc_explain_01.mp4").write_bytes(b"\x00\x00\x00\x18ftypmp42")
            (in_dir / "OP-2026-010.json").write_text(json.dumps(self._base_card()), encoding="utf-8")
            (in_dir / "OP-2026-011.json").write_text(json.dumps({
                "id": "OP-2026-011",
                "modelo": "veo-3",
                "formato": "9:16",
                "personaje": "otto",
                "etiqueta_ia": "AI-generated",
                "licencia_audio": "synthetic-original",
                "clips": [
                    {"archivo": "lib_otto_wave_01.mp4", "prompt": "Otto waving in cartoon 3D lab.", "duracion": 4.5},
                    {"archivo": "lib_otto_point_02.mp4", "prompt": "Otto pointing beside shoulder.", "duracion": 5.0},
                ],
            }), encoding="utf-8")

            manifest = V.import_to_workspace(in_dir, out_dir, series_id="OP-TEST", platform="tiktok")
            self.assertEqual(manifest["clip_count"], 3)
            self.assertAlmostEqual(manifest["total_raw_duration_s"], 15.5)
            self.assertTrue(manifest["clips"][0]["local_exists"])
            self.assertFalse(manifest["clips"][1]["local_exists"])

            series = json.loads((out_dir / "series.json").read_text(encoding="utf-8"))
            self.assertEqual(series["id"], "OP-TEST")
            self.assertEqual(series["platform"], "tiktok")
            self.assertTrue(series["ai_disclosure"])
            self.assertEqual(len(series["frames"]), 3)

            copy_txt = (out_dir / "copy.txt").read_text(encoding="utf-8")
            self.assertIn("Altered or synthetic content = YES", copy_txt)
            self.assertIn("AI-generated content", copy_txt)

    def test_rejects_missing_ai_disclosure(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp) / "OP-bad.json"
            f.write_text(json.dumps(self._base_card(etiqueta_ia=False)), encoding="utf-8")
            with self.assertRaises(V.VeoImportError):
                V.load_sidecars(f)

    def test_rejects_unconsented_cloned_voice_and_copyrighted_audio(self):
        with tempfile.TemporaryDirectory() as tmp:
            f1 = Path(tmp) / "OP-voice.json"
            f1.write_text(json.dumps(self._base_card(voz="cloned_celebrity_voice")), encoding="utf-8")
            with self.assertRaises(V.VeoImportError):
                V.load_sidecars(f1)

            f2 = Path(tmp) / "OP-music.json"
            f2.write_text(json.dumps(self._base_card(licencia_audio="commercial-chart-song")), encoding="utf-8")
            with self.assertRaises(V.VeoImportError):
                V.load_sidecars(f2)

    def test_rejects_pii_and_legacy_terms_and_warns_on_burned_text(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad_path = "/" + "Users" + "/alice/secret.mp4"
            f1 = Path(tmp) / "OP-pii.json"
            f1.write_text(json.dumps(self._base_card(prompt=f"Show screen from {bad_path}")), encoding="utf-8")
            with self.assertRaises(V.VeoImportError):
                V.load_sidecars(f1)

            f2 = Path(tmp) / "OP-textwarn.json"
            f2.write_text(json.dumps(self._base_card(prompt="Marc smiling with text saying subscribe now")), encoding="utf-8")
            cards = V.load_sidecars(f2)
            self.assertEqual(len(cards[0]["warnings"]), 1)

    def test_cli_oddly_import_veo_on_shipped_example(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "work"
            res = subprocess.run(
                [str(ROOT / "tools" / "oddly"), "import-veo", str(ROOT / "examples" / "veo-marc-receipt" / "sidecars"), str(out), "--platform", "youtube-shorts"],
                capture_output=True,
                text=True,
            )
            self.assertEqual(res.returncode, 0, res.stderr)
            self.assertTrue((out / "series.json").is_file())
            self.assertTrue((out / "manifest.json").is_file())


if __name__ == "__main__":
    unittest.main()
