// Storyboard: real rendered frames from every segment of the reel (each clip, every lab card, the end card) on one
// contact sheet, with the time under each frame. Run from the Remotion project root (node resolves @remotion/*):
//   node storyboard.mjs <props.json> <out.jpg> [extra seconds,...]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
process.env.TMPDIR = process.env.REMOTION_TMP || path.join(os.homedir(), "remotion-tmp");
fs.mkdirSync(process.env.TMPDIR, { recursive: true });
const { bundle } = await import(path.resolve("node_modules/@remotion/bundler/dist/index.js")).catch(() => import("@remotion/bundler"));
const { renderStill, selectComposition } = await import(path.resolve("node_modules/@remotion/renderer/dist/index.js")).catch(() => import("@remotion/renderer"));
const [propsFile, out, extra = ""] = process.argv.slice(2);
const props = JSON.parse(fs.readFileSync(propsFile, "utf8"));
const times = [...props.clips.map((c) => Math.min(c.start + 0.6, props.duration - 0.1)), ...props.cards.map((c) => c.from + 0.75), props.voiceEnd + 0.9,
  ...extra.split(",").filter(Boolean).map(Number)].sort((a, b) => a - b);
const chrome = [path.resolve("node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell"), "/usr/bin/chromium"].find((p) => fs.existsSync(p)) ?? null;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "Reel", inputProps: props, browserExecutable: chrome });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sb-"));
const files = [];
for (const t of times) {
  const f = path.join(dir, `f_${t.toFixed(2)}.jpg`);
  await renderStill({ composition, serveUrl, frame: Math.round(t * 30), output: f, imageFormat: "jpeg", jpegQuality: 85, scale: 0.4, inputProps: props, browserExecutable: chrome });
  files.push([f, t]);
}
// contact sheet with the time under each frame (Pillow: works with any ffmpeg build)
const PY = `import sys
from PIL import Image, ImageDraw
out, items = sys.argv[1], sys.argv[2:]
ims = [(Image.open(items[i]).convert("RGB"), items[i + 1]) for i in range(0, len(items), 2)]
w, h = ims[0][0].size
S = Image.new("RGB", (w * len(ims), h + 44), "black"); d = ImageDraw.Draw(S)
for i, (im, t) in enumerate(ims):
    S.paste(im, (i * w, 0)); d.text((i * w + 12, h + 12), t + " s", fill="white")
S.save(out, quality=88)`;
execFileSync(process.env.REEL_PY || ".venv/bin/python", ["-c", PY, out, ...files.flatMap(([f, t]) => [f, t.toFixed(1)])]);
fs.rmSync(serveUrl, { recursive: true, force: true });
console.log(`${out} (${files.length} frames)`);
