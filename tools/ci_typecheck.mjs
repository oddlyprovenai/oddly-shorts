// generated-by: gemini-ultra
// Scaffolds an ephemeral Remotion project layout from kit/, edit/remotion/, templates/, and examples/
// and runs strict `tsc --noEmit` to verify every TypeScript / React / Three.js file compiles cleanly.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const nmCandidates = [
  process.env.ODDLY_NODE_MODULES,
  path.join(REPO, "node_modules"),
].filter(Boolean);
const nm = nmCandidates.find((p) => fs.existsSync(path.join(p, ".bin", "tsc")));
if (!nm) {
  console.error("ERROR: TypeScript compiler not found. Install dev deps or set ODDLY_NODE_MODULES.");
  process.exit(2);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "oddly-ci-tsc-"));
try {
  fs.symlinkSync(path.resolve(nm), path.join(tmp, "node_modules"), "dir");
  fs.mkdirSync(path.join(tmp, "src", "videos"), { recursive: true });
  fs.cpSync(path.join(REPO, "kit"), path.join(tmp, "src", "videos", "oddly-kit"), { recursive: true });
  fs.cpSync(path.join(REPO, "edit", "remotion"), path.join(tmp, "src", "reel"), { recursive: true });

  for (const tpl of fs.readdirSync(path.join(REPO, "templates")).sort()) {
    const srcDir = path.join(REPO, "templates", tpl);
    if (!fs.statSync(srcDir).isDirectory()) continue;
    const dst = path.join(tmp, "src", "videos", `tpl-${tpl}`);
    fs.cpSync(srcDir, dst, { recursive: true });
    if (!fs.existsSync(path.join(dst, "plan.json"))) {
      fs.writeFileSync(path.join(dst, "plan.json"), JSON.stringify({
        total: 30, accent: "#88D445", cameo: "none", segments: [], expr: [], screens: [], overlays: [],
      }));
    }
    if (!fs.existsSync(path.join(dst, "captions.json"))) {
      fs.writeFileSync(path.join(dst, "captions.json"), "[]");
    }
  }

  for (const ex of fs.readdirSync(path.join(REPO, "examples")).sort()) {
    const srcDir = path.join(REPO, "examples", ex);
    if (!fs.statSync(srcDir).isDirectory() || !fs.existsSync(path.join(srcDir, "index.tsx"))) continue;
    const dst = path.join(tmp, "src", "videos", `ex-${ex}`);
    fs.cpSync(srcDir, dst, { recursive: true });
    if (!fs.existsSync(path.join(dst, "captions.json"))) {
      fs.writeFileSync(path.join(dst, "captions.json"), "[]");
    }
  }

  fs.writeFileSync(path.join(tmp, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2020",
      module: "ESNext",
      moduleResolution: "Bundler",
      jsx: "react-jsx",
      strict: true,
      resolveJsonModule: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmit: true,
    },
    include: ["src"],
  }, null, 2));

  execFileSync(path.join(nm, ".bin", "tsc"), ["-p", path.join(tmp, "tsconfig.json")], { stdio: "inherit" });
  console.log("TypeScript check OK (kit + edit/remotion + templates + examples)");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
