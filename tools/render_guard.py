#!/usr/bin/env python3
# generated-by: gemini-ultra
"""Sequential low-RAM render guard for oddly-shorts (macOS & Linux, stdlib only).

Guarantees:
  1. Strictly ONE render runs at a time via an atomic lock directory ($TMPDIR/oddly-render.lock) with stale-PID recovery.
  2. Auto-caps Remotion concurrency to 1 on machines with <= 16 GB total RAM (unless overridden).
  3. Waits for >= ODDLY_MIN_FREE_GB (default 4.0 GB) of available/reclaimable memory before starting a render.
  4. Can wrap any render command (`python3 tools/render_guard.py exec -- <cmd...>`) so lock release and temp-bundle
     cleanup always run even on SIGINT/SIGTERM/crash.
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path


def total_ram_gb() -> float:
    """Total physical memory in GiB on Darwin or Linux."""
    if sys.platform == "darwin":
        try:
            out = subprocess.run(["sysctl", "-n", "hw.memsize"], capture_output=True, text=True, check=True, timeout=3).stdout
            return round(int(out.strip()) / (1024**3), 2)
        except (OSError, ValueError, subprocess.SubprocessError):
            return 16.0
    try:
        for line in Path("/proc/meminfo").read_text(encoding="utf-8").splitlines():
            if line.startswith("MemTotal:"):
                kb = int(line.split()[1])
                return round(kb / (1024**2), 2)
    except (OSError, ValueError):
        pass
    return 16.0


def parse_vm_stat_free_gb(vm_stat_output: str) -> float:
    """Pure parser for macOS `vm_stat` output (free + inactive + speculative pages)."""
    m_ps = re.search(r"page size of (\d+) bytes", vm_stat_output)
    page_size = int(m_ps.group(1)) if m_ps else 16384
    pages = 0
    for key in ("Pages free", "Pages inactive", "Pages speculative"):
        m = re.search(rf"{key}:\s+(\d+)", vm_stat_output)
        if m:
            pages += int(m.group(1))
    return round((pages * page_size) / (1024**3), 2)


def free_ram_gb() -> float:
    """Available/reclaimable memory in GiB on Darwin or Linux."""
    if sys.platform == "darwin":
        try:
            out = subprocess.run(["vm_stat"], capture_output=True, text=True, check=True, timeout=3).stdout
            return parse_vm_stat_free_gb(out)
        except (OSError, subprocess.SubprocessError):
            return 8.0
    try:
        for line in Path("/proc/meminfo").read_text(encoding="utf-8").splitlines():
            if line.startswith("MemAvailable:"):
                return round(int(line.split()[1]) / (1024**2), 2)
    except (OSError, ValueError):
        pass
    return 8.0


def recommended_concurrency(explicit: str | int | None = None, total_gb: float | None = None) -> int:
    if explicit is not None and str(explicit).strip() != "":
        return max(1, int(explicit))
    tot = total_gb if total_gb is not None else total_ram_gb()
    return 1 if tot <= 16.5 else 2


def _pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


class RenderLock:
    """Atomic directory lock with stale-PID recovery."""

    def __init__(self, lock_dir: Path, poll_seconds: float = 2.0, timeout_seconds: float = 1800.0):
        self.lock_dir = lock_dir
        self.pid_file = lock_dir / "pid"
        self.poll_seconds = poll_seconds
        self.timeout_seconds = timeout_seconds
        self._acquired = False

    def acquire(self) -> None:
        deadline = time.monotonic() + self.timeout_seconds
        while True:
            try:
                self.lock_dir.mkdir(parents=True, exist_ok=False)
                self.pid_file.write_text(f"{os.getpid()}\n", encoding="utf-8")
                self._acquired = True
                return
            except FileExistsError:
                try:
                    holder = int(self.pid_file.read_text(encoding="utf-8").strip())
                except (OSError, ValueError):
                    holder = -1
                if holder > 0 and not _pid_alive(holder):
                    shutil.rmtree(self.lock_dir, ignore_errors=True)
                    continue
                if time.monotonic() >= deadline:
                    raise TimeoutError(f"Timed out waiting for render lock {self.lock_dir} (held by PID {holder})")
                time.sleep(self.poll_seconds)

    def release(self) -> None:
        if not self._acquired:
            return
        try:
            holder = int(self.pid_file.read_text(encoding="utf-8").strip())
        except (OSError, ValueError):
            holder = os.getpid()
        if holder == os.getpid():
            shutil.rmtree(self.lock_dir, ignore_errors=True)
        self._acquired = False

    def __enter__(self) -> RenderLock:
        self.acquire()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.release()


def wait_for_free_ram(min_free_gb: float, poll_seconds: float = 5.0, timeout_seconds: float = 600.0) -> float:
    deadline = time.monotonic() + timeout_seconds
    while True:
        avail = free_ram_gb()
        if avail >= min_free_gb:
            return avail
        if time.monotonic() >= deadline:
            raise TimeoutError(f"Free RAM {avail:.1f} GB stayed below required {min_free_gb:.1f} GB")
        sys.stderr.write(f"[render-guard] free RAM {avail:.1f} GB < {min_free_gb:.1f} GB; waiting...\n")
        time.sleep(poll_seconds)


def default_tmp_dir() -> Path:
    d = Path(os.environ.get("ODDLY_TMP") or os.environ.get("REMOTION_TMP") or (Path.home() / "remotion-tmp"))
    d.mkdir(parents=True, exist_ok=True)
    return d


def run_guarded(cmd: list[str], *, lock_dir: Path | None = None, min_free_gb: float | None = None) -> int:
    tmp = default_tmp_dir()
    lk = RenderLock(lock_dir or (tmp / "oddly-render.lock"))
    req_gb = min_free_gb if min_free_gb is not None else float(os.environ.get("ODDLY_MIN_FREE_GB", "4"))

    def _handle_sig(signum, _frame):
        lk.release()
        raise SystemExit(128 + signum)

    old_int = signal.signal(signal.SIGINT, _handle_sig)
    old_term = signal.signal(signal.SIGTERM, _handle_sig)
    marker = tempfile.NamedTemporaryFile(prefix="oddly-mark-", dir=str(tmp), delete=False)
    marker_path = Path(marker.name)
    marker.close()
    try:
        with lk:
            wait_for_free_ram(req_gb)
            env = {**os.environ, "TMPDIR": str(tmp)}
            env.setdefault("ODDLY_CONCURRENCY", str(recommended_concurrency(os.environ.get("ODDLY_CONCURRENCY"))))
            res = subprocess.run(cmd, env=env)
            return res.returncode
    finally:
        signal.signal(signal.SIGINT, old_int)
        signal.signal(signal.SIGTERM, old_term)
        cutoff = marker_path.stat().st_mtime if marker_path.exists() else time.time()
        marker_path.unlink(missing_ok=True)
        for bundle in tmp.glob("remotion-webpack-bundle-*"):
            try:
                if bundle.stat().st_mtime >= cutoff - 1.0:
                    shutil.rmtree(bundle, ignore_errors=True)
            except OSError:
                pass


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Sequential low-RAM render guard for oddly-shorts.")
    sub = ap.add_subparsers(dest="subcmd", required=True)

    sub.add_parser("concurrency", help="Print recommended Remotion concurrency (1 on <=16 GB machines, else 2)")
    sub.add_parser("status", help="Print JSON RAM and lock status")

    p_exec = sub.add_parser("exec", help="Acquire sequential lock, wait for free RAM, and execute a render command")
    p_exec.add_argument("--min-free-gb", type=float, default=None)
    p_exec.add_argument("cmd", nargs=argparse.REMAINDER)

    args = ap.parse_args(argv)
    if args.subcmd == "concurrency":
        print(recommended_concurrency(os.environ.get("ODDLY_CONCURRENCY") or os.environ.get("REEL_CONCURRENCY")))
        return 0
    if args.subcmd == "status":
        import json
        tmp = default_tmp_dir()
        lk = tmp / "oddly-render.lock"
        print(json.dumps({
            "total_ram_gb": total_ram_gb(),
            "free_ram_gb": free_ram_gb(),
            "recommended_concurrency": recommended_concurrency(),
            "locked": lk.exists(),
        }))
        return 0
    if args.subcmd == "exec":
        cmd = list(args.cmd)
        if cmd and cmd[0] == "--":
            cmd = cmd[1:]
        if not cmd:
            sys.stderr.write("ERROR: no command provided to render_guard.py exec\n")
            return 2
        try:
            return run_guarded(cmd, min_free_gb=args.min_free_gb)
        except TimeoutError as exc:
            sys.stderr.write(f"SKIP: {exc}\n")
            return 3
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
