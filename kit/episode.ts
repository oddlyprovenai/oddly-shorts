// Oddly Proven kit: the episode contract plus the camera grammar from the cartoon-3d-short skill (cuts on big
// reframes, smootherstep glides 18-40 f, creeping holds, 7-frame flip kicks, a thin-lens DOF table).
// An episode folder (src/videos/ep-NN/) supplies only its story, sets and cast; everything else lives here.
import * as THREE from "three";
import type { Kit } from "./build";
import type { Stage } from "./cast";
import type { Overlay } from "./Overlays";
import type { SubStyle } from "./Subtitles";

export const FPS = 30;
export type V3 = [number, number, number];
export type Light = "day" | "golden";
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

export type ShotDef = { id: number; a: number; b: number; set: string; light: Light; sunAz?: number; sunEl?: number };
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Shot = Partial<Cam> & { pos: V3; look: V3 };
export type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
/** sky stops (deg) / fog / far plane / interior flag per set; anything missing falls back to the light's LOOK */
export type SetLook = { sky?: { c: string[]; e: number[] }; fog?: [number, number]; fogCol?: string; far?: number; inside?: boolean };
/** one caption card: 1-3 words, start/end in seconds, `key` = index of the highlighted word or -1 */
export type Caption = { words: string[]; key: number; start: number; end: number; times?: number[] };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3 };
export type Sets = Record<string, THREE.Object3D>;

export type Episode = {
  id: string; total: number; flashAt: number; shots: ShotDef[]; xfade: Record<number, number>;
  cams: Record<number, Key[]>; kicks: [number, number][]; dof: Dof[]; looks: Record<string, SetLook>;
  /** builds every set once; key = ShotDef.set (props shared by several sets go in "always") */
  build: (kit: Kit) => Sets;
  /** per-frame posing of props (ships, horses, doors) before the cast */
  pose?: (id: number, t: number, sets: Sets) => void;
  stage: (id: number, t: number, cam: CamInfo, sets: Sets) => Stage;
  captions: Caption[]; accent: string;
  /** subtitle style (default "pop"); overlays: number reveals, lower thirds, end card with CTA */
  subStyle?: SubStyle; overlays?: Overlay[];
  /** screenshots for app-screen inserts: name -> path under public/ (preloaded before the first frame) */
  images?: Record<string, string>;
  /** overlays anchored to the host's head / shoulders (kit/Anchored.tsx): kinds counter-free bar, meter, lock, receipt,
   *  stamp, icons, chip, dots, flat; anchoredAt gives the world-space head centre and radius per shot and frame */
  anchored?: { kind: string; from: number; dur: number; anchor: "head" | "rshoulder" | "lshoulder" | "chest"; d: any }[];
  anchoredAt?: (id: number, f: number) => { head: V3; r: number } | null;
};

// ---------------- camera helpers ----------------
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
export const runKeys = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** creeping push-in: subject grows `rate` per frame since f0, `punch` for the first n frames */
export const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
export const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
export const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
/** shorthand: a creeping dolly key starting at frame f */
export const hold = (f: number, pos: V3, look: V3, fov = 40, roll = 0, rate = 0.0025, punch = 0): Key =>
  ({ f, s: (g) => dolly(pos, look, pushK(g, f, rate, punch), { fov, roll }) });
export const cutTo = (f: number, pos: V3, look: V3, fov = 40, roll = 0, rate = 0.0025, punch = 0): Key => ({ ...hold(f, pos, look, fov, roll, rate, punch), cut: true });
export const glideTo = (f: number, dur: number, pos: V3, look: V3, fov = 40, roll = 0, rate = 0.0025): Key => ({ ...hold(f, pos, look, fov, roll, rate), dur });

export const kickAt = (ep: Episode, t: number) => {
  let a = 0;
  for (const [t0, g] of ep.kicks) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (ep: Episode, id: number, f: number): Cam => {
  const c = runKeys(ep.cams[id], f), a = kickAt(ep, f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const dofAt = (ep: Episode, f: number) => {
  const D = ep.dof;
  let i = 0; while (i + 1 < D.length && f >= D[i + 1].f) i++;
  const d = D[i], p = D[Math.max(0, i - 1)], k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const shotAt = (ep: Episode, f: number) => ep.shots.find((s) => f >= s.a && f < s.b) ?? ep.shots[ep.shots.length - 1];
export const layersAt = (ep: Episode, f: number): { id: number; alpha: number }[] => {
  for (const s of ep.shots) {
    const x = ep.xfade[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(ep, f).id, alpha: 1 }];
};
