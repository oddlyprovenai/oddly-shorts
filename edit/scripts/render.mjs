// F5 + final render (only after the owner's OK on the storyboard). Run from the Remotion project root:
//   node render.mjs <props.json> <outdir> <name> <hooks.json>
// Renders: <name>.mp4 (full short, 1080x1920, 30 fps, H.264 ~10 Mbps + AAC), hooks/<name>_hook_1..N.mp4 (the hook,
// cut between sentences, each with a different on-screen hook text), hooks/<name>_body.mp4 (the rest), and
// <name>_thumb.jpg (1080x1920 still with hook text 1). One bundle, renders run one after another (low RAM).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.TMPDIR = process.env.REMOTION_TMP || path.join(os.homedir(), "remotion-tmp");
fs.mkdirSync(process.env.TMPDIR, { recursive: true });
const { bundle } = await import("@remotion/bundler");
const { renderMedia, renderStill, selectComposition } = await import("@remotion/renderer");
const [propsFile, outDir, name, hooksFile] = process.argv.slice(2);
const props = JSON.parse(fs.readFileSync(propsFile, "utf8"));
const hooks = JSON.parse(fs.readFileSync(hooksFile, "utf8"));
const chrome = [path.resolve("node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell"), "/usr/bin/chromium"].find((p) => fs.existsSync(p)) ?? null;
const conc = Number(process.env.REEL_CONCURRENCY || 2);
fs.mkdirSync(path.join(outDir, "hooks"), { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const opts = { serveUrl, codec: "h264", videoBitrate: "10M", audioCodec: "aac", audioBitrate: "256k", browserExecutable: chrome, concurrency: conc, chromiumOptions: { gl: "angle" } };
const comp = async (p) => selectComposition({ serveUrl, id: "Reel", inputProps: p, browserExecutable: chrome });
const hookEnd = Math.round(props.hookUntil * 30);
const full = await comp(props);
await renderMedia({ ...opts, composition: full, inputProps: props, outputLocation: path.join(outDir, `${name}.mp4`) });
console.log("full done");
for (const [i, text] of hooks.entries()) {
  const p = { ...props, hook: { text, until: props.hookUntil } };
  await renderMedia({ ...opts, composition: await comp(p), inputProps: p, frameRange: [0, hookEnd - 1], outputLocation: path.join(outDir, "hooks", `${name}_hook_${i + 1}.mp4`) });
}
await renderMedia({ ...opts, composition: full, inputProps: props, frameRange: [hookEnd, full.durationInFrames - 1], outputLocation: path.join(outDir, "hooks", `${name}_body.mp4`) });
const tp = { ...props, hook: { text: hooks[0], until: props.hookUntil } };
await renderStill({ serveUrl, composition: await comp(tp), inputProps: tp, frame: Math.min(15, hookEnd - 1), output: path.join(outDir, `${name}_thumb.jpg`), imageFormat: "jpeg", jpegQuality: 92, browserExecutable: chrome });
fs.rmSync(serveUrl, { recursive: true, force: true });
console.log(`DONE ${name}: full + ${hooks.length} hooks + body + thumbnail`);
