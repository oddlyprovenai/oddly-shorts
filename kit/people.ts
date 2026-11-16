// Cast helpers shared by every episode: lit billboard people (toon bodyFront), Otto, blinks that hide expression
// swaps, contact blobs, grey smoke, tan dust, HDR spark bursts. Episodes call these from their stage().
import * as THREE from "three";
import { Pen, bodyFront, fxPuff, fxBurst, fxContact, Outfit, FrontOpts, Expr, SKINS } from "./toon";
import { Place, FxPlace, Stage } from "./cast";
import { CamInfo, FPS, V3 } from "./episode";
import { drawOtto, OttoOpts } from "./otto";
import { drawCharacter, CharacterSpec } from "./character";

export const newStage = (): Stage => ({ places: [], fx: [] });
const q = (v: number, n = 120) => Math.round(v * n) / n;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const tier = (d: number): [number, number, number] =>
  d < 1.6 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const LID = [0.5, 1, 1, 0.5];
/** idle blink rhythm (0.5-2.3 s), plus a 4-frame blink around every swap time so the shut frames hide the swap */
export const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round(ts * FPS) + 2; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(15 + 54 * hh(i * 31 + n, 13)); }
  return 0;
};
/** expression timeline: [[time, expr], ...] -> expression at t plus the swap times (for lidAt) */
export const exprAt = (t: number, tl: [number, Expr][]): Expr => { let e = tl[0][1]; for (const [ts, x] of tl) if (t >= ts) e = x; return e; };
export const swapsOf = (tl: [number, Expr][]) => tl.slice(1).map(([ts]) => ts);
const tmp = new THREE.Vector3();
const light2D = (cam: CamInfo) => Math.round(Math.atan2(-cam.sun.y, cam.sun.dot(cam.right)) / (Math.PI / 4)) * (Math.PI / 4);
const blob = (out: Stage, p: V3, sc = 1) =>
  out.fx.push({ key: "blob|contact|#5a5a7a", cw: 128, ch: 128, draw: (pn) => fxContact(pn, "#5a5a7a"), x: p[0], y: p[1] + 0.02, z: p[2], w: 0.6 * sc, h: 0.45 * sc, flat: true });

/** one person; `who` seeds the head shape and blink rhythm */
export const person = (out: Stage, cam: CamInfo, who: number, o: Outfit, p: V3, t: number, opts: FrontOpts & { swaps?: number[] }, contact = true, scale = 1) => {
  const d = cam.pos.distanceTo(tmp.set(p[0], p[1] + 1.2, p[2])) / scale, [w, h, k] = tier(d);
  const { swaps, ...rest } = opts;
  const fo: FrontOpts = { mode: "stand", ...rest, blink: lidAt(t, who, swaps), light: light2D(cam), seed: (who % 7) + 1 };
  out.places.push({ key: `P|${fkey(o)}|${fkey(fo)}`, x: p[0], y: p[1], z: p[2], scale, draw: (pn: Pen) => bodyFront(pn, o, fo), size: [w, h, k] } as Place);
  if (contact) blob(out, p, scale);
};
/** Otto, always the same drawing; expression timeline drives the face, swaps hidden by blinks */
export const otto = (out: Stage, cam: CamInfo, p: V3, t: number, tl: [number, Expr][], o: Omit<OttoOpts, "expr" | "blink"> = {}, contact = true) => {
  const d = cam.pos.distanceTo(tmp.set(p[0], p[1] + 1.2, p[2])), [w, h, k] = tier(d);
  const oo: OttoOpts = { ...o, expr: exprAt(t, tl), blink: lidAt(t, 99, swapsOf(tl)), light: light2D(cam) };
  out.places.push({ key: `OTTO|${fkey(oo)}`, x: p[0], y: p[1], z: p[2], draw: (pn: Pen) => drawOtto(pn, oo), size: [w, h, k] } as Place);
  if (contact) blob(out, p);
};

export const COATS = ["#3f6fb5", "#c0392b", "#5d7a3a", "#e5b02a", "#2f5f6a", "#7b5ac9", "#d9772e"];
/** a varied bystander outfit (never mustard + glasses: that silhouette is Otto's) */
export const folk = (i: number, period: "old" | "modern" = "modern"): Outfit => ({
  jacket: COATS[i % 7], pants: ["#3b3f52", "#5a6a8a", "#6b5a44"][i % 3], boots: "#4a3426", skin: SKINS[(i * 3) % 4],
  hat: period === "old" ? (i % 2 ? "tophat" : "bonnet") : i % 3 === 0 ? "cap" : "hair",
  dress: period === "old" && i % 2 === 0 ? ["#d9a441", "#c25a7a", "#5a8fc2"][i % 3] : undefined,
  cap: ["#e2453c", "#2e6db4", "#5d7a3a"][i % 3], hair: ["#3a2a20", "#6b3e26", "#c99a4a", "#1f1a18"][i % 4],
  build: i % 5 === 3 ? "kid" : i % 7 === 2 ? "stout" : "adult",
});

const greyPuff = (p: Pen, t: number) => {
  for (let i = 0; i < 6; i++) {
    const a = ((160 + i * 50) * Math.PI) / 180, d = 30 + 70 * t, r = (40 + 18 * (i % 2)) * (1 - 0.4 * t);
    p.ell(150 + d * Math.cos(a), 160 + d * 0.5 * Math.sin(a), r, r * 0.85, `rgba(62,62,72,${(0.95 * (1 - 0.7 * t)).toFixed(3)})`, 0);
  }
};
/** a trail of grey smoke puffs drifting along `dir` (len m), size grows with age */
export const smoke = (out: Stage, at: V3, t: number, dir: V3, size: number, n = 10, len = 30) => {
  for (let k = 0; k < n; k++) {
    const a = q((t * 0.9 + k / n) % 1, 30), sz = size * (0.6 + a * 1.4);
    out.fx.push({ key: `gpuff${a}`, cw: 300, ch: 300, draw: (pn) => greyPuff(pn, a), soft: true,
      x: at[0] + dir[0] * a * len, y: at[1] + dir[1] * a * len + 0.5, z: at[2] + dir[2] * a * len, w: sz, h: sz } as FxPlace);
  }
};
export const dust = (out: Stage, at: V3, t: number, size: number, n = 6) => {
  for (let k = 0; k < n; k++) {
    const b = q((t * 0.8 + k / n) % 1, 30), sz = size * (0.4 + b);
    out.fx.push({ key: `dust${b}`, cw: 300, ch: 300, draw: (pn) => fxPuff(pn, b * 0.85), soft: true, x: at[0] + (k - n / 2) * 0.6 * size / 4, y: at[1] + b * size * 0.3, z: at[2], w: sz, h: sz } as FxPlace);
  }
};
/** HDR spark / impact burst (blooms); u = 0..1 progress of one burst */
export const burst = (out: Stage, at: V3, u: number, size: number, col = "#ffe08a", hdr = true) => {
  const a = q(u, 30);
  out.fx.push({ key: `${hdr ? "spark" : "burst"}${col}${a}`, cw: 500, ch: 500, draw: (pn) => fxBurst(pn, a, col, 14, 30, 240), x: at[0], y: at[1], z: at[2], w: size, h: size });
};
/** a flat card drawn by `draw` on a cw x ch canvas, facing the lens (unlit): props such as signs, notes, logos */
export const card = (out: Stage, key: string, at: V3, w: number, h: number, cw: number, ch: number, draw: (p: Pen) => void, rot = 0) =>
  out.fx.push({ key, cw, ch, draw, x: at[0], y: at[1], z: at[2], w, h, rot });

/** any character from characters/*.json, always drawn the same way; expression timeline + blinks over swaps */
export const host = (out: Stage, cam: CamInfo, c: CharacterSpec, p: V3, t: number, tl: [number, Expr][], o: { look?: number; wave?: number } = {}, contact = true) => {
  const d = cam.pos.distanceTo(tmp.set(p[0], p[1] + 1.2, p[2])), [w, h, k] = tier(d);
  const pose = { ...o, expr: exprAt(t, tl), blink: lidAt(t, 98, swapsOf(tl)), light: light2D(cam) };
  out.places.push({ key: `HOST|${c.name}|${fkey(pose)}`, x: p[0], y: p[1], z: p[2], draw: (pn: Pen) => drawCharacter(pn, c, pose), size: [w, h, k] } as Place);
  if (contact) blob(out, p);
};
