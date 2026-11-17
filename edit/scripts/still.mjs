// One full-size frame of the Reel composition, for the manual frame check. Run from the Remotion project root:
//   node still.mjs <props.json> <out.jpg> <t1,t2,...> [scale=1]      -> out_<t>.jpg per time
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.TMPDIR = process.env.REMOTION_TMP || path.join(os.homedir(), "remotion-tmp");
fs.mkdirSync(process.env.TMPDIR, { recursive: true });
const { bundle } = await import(path.resolve("node_modules/@remotion/bundler/dist/index.js")).catch(() => import("@remotion/bundler"));
const { renderStill, selectComposition } = await import(path.resolve("node_modules/@remotion/renderer/dist/index.js")).catch(() => import("@remotion/renderer"));
const [propsFile, out, times, scale = "1"] = process.argv.slice(2);
const props = JSON.parse(fs.readFileSync(propsFile, "utf8"));
const chrome = [path.resolve("node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell"), "/usr/bin/chromium"].find((p) => fs.existsSync(p)) ?? null;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "Reel", inputProps: props, browserExecutable: chrome });
for (const t of times.split(",").map(Number)) {
  const f = out.replace(/\.jpg$/, `_${t.toFixed(1)}.jpg`);
  await renderStill({ composition, serveUrl, frame: Math.round(t * 30), output: f, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale), inputProps: props, browserExecutable: chrome });
  console.log(f);
}
fs.rmSync(serveUrl, { recursive: true, force: true });
