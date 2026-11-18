"""Tests for sequential low-RAM render guard (tools/render_guard.py & edit/scripts/render_guard.mjs)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import render_guard as G  # noqa: E402


class RenderGuardTests(unittest.TestCase):
    def test_vm_stat_parser_and_concurrency_policy(self):
        sample = (
            "Mach Virtual Memory Statistics: (page size of 16384 bytes)\n"
            "Pages free:                              131072.\n"
            "Pages active:                            262144.\n"
            "Pages inactive:                          131072.\n"
            "Pages speculative:                        65536.\n"
        )
        # (131072 + 131072 + 65536) * 16384 / 1024**3 = 5.0 GiB
        self.assertAlmostEqual(G.parse_vm_stat_free_gb(sample), 5.0, places=2)
        self.assertEqual(G.recommended_concurrency(None, total_gb=16.0), 1)
        self.assertEqual(G.recommended_concurrency(None, total_gb=8.0), 1)
        self.assertEqual(G.recommended_concurrency(None, total_gb=32.0), 2)
        self.assertEqual(G.recommended_concurrency("3", total_gb=16.0), 3)

    def test_stale_pid_lock_recovery_and_contention_timeout(self):
        with tempfile.TemporaryDirectory() as tmp:
            lock_dir = Path(tmp) / "oddly-render.lock"
            lock_dir.mkdir()
            # Non-existent stale PID 99999999 should be automatically recovered
            (lock_dir / "pid").write_text("99999999\n", encoding="utf-8")

            with G.RenderLock(lock_dir, poll_seconds=0.05, timeout_seconds=1.0):
                self.assertTrue(lock_dir.exists())
                # Second contender held by live current PID must time out cleanly
                contender = G.RenderLock(lock_dir, poll_seconds=0.05, timeout_seconds=0.15)
                with self.assertRaises(TimeoutError):
                    contender.acquire()
            self.assertFalse(lock_dir.exists())

    def test_run_guarded_cleans_new_webpack_bundles(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = {**os.environ, "ODDLY_TMP": tmp, "ODDLY_MIN_FREE_GB": "0.01"}
            cmd = [
                sys.executable,
                str(ROOT / "tools" / "render_guard.py"),
                "exec",
                "--min-free-gb",
                "0.01",
                "--",
                sys.executable,
                "-c",
                f"import pathlib; (pathlib.Path({tmp!r}) / 'remotion-webpack-bundle-test123').mkdir()",
            ]
            res = subprocess.run(cmd, env=env, capture_output=True, text=True)
            self.assertEqual(res.returncode, 0, res.stderr)
            self.assertFalse((Path(tmp) / "remotion-webpack-bundle-test123").exists())
            self.assertFalse((Path(tmp) / "oddly-render.lock").exists())

    def test_node_render_guard_module_executes_sequentially(self):
        with tempfile.TemporaryDirectory() as tmp:
            guard_url = (ROOT / "edit" / "scripts" / "render_guard.mjs").as_uri()
            code = (
                f"import {{ withRenderGuard, recommendedConcurrency }} from {json.dumps(guard_url)};"
                f"const r = await withRenderGuard(async ({{ concurrency }}) => ({{ concurrency, override: recommendedConcurrency('1') }}), "
                f"{{ tmpDir: {json.dumps(tmp)}, minFreeGb: 0.01 }});"
                "console.log(JSON.stringify(r));"
            )
            res = subprocess.run(["node", "--input-type=module", "-e", code], capture_output=True, text=True)
            self.assertEqual(res.returncode, 0, res.stderr)
            js = json.loads(res.stdout.strip())
            self.assertGreaterEqual(js["concurrency"], 1)
            self.assertEqual(js["override"], 1)
            self.assertFalse((Path(tmp) / "oddly-render.lock").exists())


if __name__ == "__main__":
    unittest.main()
