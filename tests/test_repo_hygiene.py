"""Repository-wide hygiene tests: MIT + Mr omi attribution, shell/ESM syntax, and PII/OPSEC scan."""
from __future__ import annotations

import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class RepoHygieneTests(unittest.TestCase):
    def test_mit_license_and_claude_animated_shorts_credit(self):
        lic = (ROOT / "LICENSE").read_text(encoding="utf-8")
        orig = (ROOT / "LICENSE.claude-animated-shorts").read_text(encoding="utf-8")
        notice = (ROOT / "NOTICE.md").read_text(encoding="utf-8")
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("MIT License", lic)
        self.assertIn("Permission is hereby granted", orig)
        self.assertIn("claude-animated-shorts", notice)
        self.assertIn("Mr omi", notice)
        self.assertIn("claude-animated-shorts", readme)
        self.assertIn("Mr omi", readme)

    def test_shell_and_mjs_syntax(self):
        for sh in ("tools/oddly", "tools/finish.sh", "edit/scripts/run_series.sh"):
            res = subprocess.run(["bash", "-n", str(ROOT / sh)], capture_output=True, text=True)
            self.assertEqual(res.returncode, 0, f"{sh}: {res.stderr}")
        for mjs in list((ROOT / "tools").glob("*.mjs")) + list((ROOT / "edit" / "scripts").glob("*.mjs")):
            res = subprocess.run(["node", "--check", str(mjs)], capture_output=True, text=True)
            self.assertEqual(res.returncode, 0, f"{mjs}: {res.stderr}")

    def test_examples_and_templates_are_pii_free(self):
        home_pat = re.compile("/" + "Users" + r"/[A-Za-z0-9_]+")
        legacy_pat = re.compile(r"\b(?:" + "For" + "ge|" + "Man" + r"do)\b")
        allow_email = re.compile(r"oddlyprovenai@users\.noreply\.github\.com|noreply@(?:oddlyproven\.local|google\.com|anthropic\.com)")
        email_pat = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

        for folder in ("examples", "templates", ".github"):
            base = ROOT / folder
            if not base.exists():
                continue
            for p in base.rglob("*"):
                if not p.is_file() or p.suffix not in {".md", ".txt", ".json", ".ts", ".tsx", ".py", ".yml"}:
                    continue
                txt = p.read_text(encoding="utf-8")
                self.assertIsNone(home_pat.search(txt), f"Home path leak in {p}")
                self.assertIsNone(legacy_pat.search(txt), f"Forbidden term in {p}")
                for m in email_pat.finditer(txt):
                    self.assertIsNotNone(allow_email.search(m.group(0)), f"Disallowed email {m.group(0)} in {p}")


if __name__ == "__main__":
    unittest.main()
