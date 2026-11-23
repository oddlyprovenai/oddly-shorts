// generated-by: gemini-ultra
// Sequential low-RAM render guard for Node Remotion scripts (edit/scripts/render.mjs).
// Enforces an atomic lock directory ($TMPDIR/oddly-render.lock), stale-PID recovery, free-RAM gate,
// and automatic concurrency=1 on <=16 GB machines.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function totalRamGb() {
  return Math.round((os.totalmem() / 1024 ** 3) * 100) / 100;
}

export function freeRamGb() {
  if (process.platform === "darwin") {
    try {
      const out = execFileSync("vm_stat", { encoding: "utf8", timeout: 3000 });
      const psMatch = out.match(/page size of (\d+) bytes/);
      const ps = psMatch ? Number(psMatch[1]) : 16384;
      let pages = 0;
      for (const k of ["Pages free", "Pages inactive", "Pages speculative"]) {
        const m = out.match(new RegExp(`${k}:\\s+(\\d+)`));
        if (m) pages += Number(m[1]);
      }
      return Math.round(((pages * ps) / 1024 ** 3) * 100) / 100;
    } catch {
      return Math.round((os.freemem() / 1024 ** 3) * 100) / 100;
    }
  }
  return Math.round((os.freemem() / 1024 ** 3) * 100) / 100;
}

export function recommendedConcurrency(explicit) {
  if (explicit !== undefined && explicit !== null && String(explicit).trim() !== "") {
    return Math.max(1, Number(explicit));
  }
  return totalRamGb() <= 16.5 ? 1 : 2;
}

function pidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e && e.code === "EPERM";
  }
}

export async function withRenderGuard(fn, opts = {}) {
  const tmpDir = opts.tmpDir || process.env.REMOTION_TMP || process.env.ODDLY_TMP || path.join(os.homedir(), "remotion-tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const lockDir = opts.lockDir || path.join(tmpDir, "oddly-render.lock");
  const pidFile = path.join(lockDir, "pid");
  const minFreeGb = Number(opts.minFreeGb ?? process.env.ODDLY_MIN_FREE_GB ?? 4);
  const timeoutMs = Number(opts.timeoutMs ?? 1800_000);
  const deadline = Date.now() + timeoutMs;

  while (true) {
    try {
      fs.mkdirSync(lockDir);
      fs.writeFileSync(pidFile, `${process.pid}\n`);
      break;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      let holder = -1;
      try { holder = Number(fs.readFileSync(pidFile, "utf8").trim()); } catch { /* ignore */ }
      if (holder > 0 && !pidAlive(holder)) {
        fs.rmSync(lockDir, { recursive: true, force: true });
        continue;
      }
      if (Date.now() >= deadline) throw new Error(`Timed out waiting for render lock ${lockDir}`);
      await sleep(2000);
    }
  }

  const release = () => {
    try {
      const holder = Number(fs.readFileSync(pidFile, "utf8").trim());
      if (!holder || holder === process.pid) fs.rmSync(lockDir, { recursive: true, force: true });
    } catch {
      fs.rmSync(lockDir, { recursive: true, force: true });
    }
  };
  process.once("SIGINT", () => { release(); process.exit(130); });
  process.once("SIGTERM", () => { release(); process.exit(143); });

  try {
    while (freeRamGb() < minFreeGb) {
      if (Date.now() >= deadline) throw new Error(`Free RAM ${freeRamGb()} GB stayed below ${minFreeGb} GB`);
      console.error(`[render-guard] free RAM ${freeRamGb()} GB < ${minFreeGb} GB; waiting...`);
      await sleep(5000);
    }
    return await fn({ concurrency: recommendedConcurrency(process.env.REEL_CONCURRENCY || process.env.ODDLY_CONCURRENCY) });
  } finally {
    release();
  }
}
