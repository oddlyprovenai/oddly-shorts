// Dialogue ad (host + talking AI buddy) driven by plan.json + voice/lines.json. Based on the generic ad: the host (a character from characters/*.json) at a desk with two
// live screens, camera presets per segment, screen contents (terminal / code / screenshot / mock app / bar chart /
// before-after) on a timeline, the project cameo on the desk, overlays (number reveals, lower thirds, end card + CTA).
// Copy this folder per episode (`oddly new <slug> demo`), then edit plan.json + script; the code rarely changes.
import * as THREE from "three";
import { Episode, ShotDef, Key, Dof, Sets, V3, CamInfo, hold, cutTo, glideTo, clamp01 } from "../oddly-kit/episode";
import { newStage, host, card } from "../oddly-kit/people";
import { desk, Screen, terminal, code, shot, mockApp, bars, split } from "../oddly-kit/screens";
import { drawBuddy, mouthAt } from "../oddly-kit/buddy";
import { lidAt } from "../oddly-kit/people";
import lines from "./lines.json";
import { Expr } from "../oddly-kit/toon";
import { CharacterSpec } from "../oddly-kit/character";
import { Overlay } from "../oddly-kit/Overlays";
import MARC from "../oddly-kit/characters/marc.json";
import plan from "./plan.json";
import captions from "./captions.json";

type Cam = "host" | "medium" | "screen" | "side" | "wide" | "over" | "two" | "buddy";
type ScreenItem = { from: number; to: number; screen: "main" | "side"; kind: "terminal" | "code" | "shot" | "mock" | "bars" | "split";
  lines?: string[]; cps?: number; hl?: number; image?: string; title?: string; items?: { label: string; value: number; color: string }[]; unit?: string; max?: number };
type Plan = { total: number; accent: string; cameo: "cactus" | "padlock" | "none"; segments: { from: number; cam: Cam; light?: "day" | "golden" }[];
  expr: [number, Expr][]; screens: ScreenItem[]; buddy?: { mood?: [number, "happy" | "proud" | "worried" | "wink"][]; prop?: "lock" | null; wave?: number[] }; overlays: Overlay[]; images?: Record<string, string>; flashAt?: number; subStyle?: "pop" | "karaoke" };
const P = plan as unknown as Plan;
const HOST = MARC as CharacterSpec;
const FPS = 30, TOTAL = Math.round(P.total * FPS);

// camera presets: the host stands at HOST_AT (right of the desk) so screen shots never have him in the way
const MAIN: V3 = [-0.2, 1.5, -1.35], SIDE: V3 = [-1.3, 1.42, -1.25], HOST_AT: V3 = [0.9, 0, 0.1], BUDDY_AT: V3 = [1.58, 0, 0.5];
const preset = (cam: Cam, f: number, i: number): Key => {
  const r = i % 2 ? 0.03 : -0.03;
  switch (cam) {
    case "host": return cutTo(f, [1.0, 1.52, 2.8], [0.9, 1.42, 0.1], 40, r, 0.0025, 0.005);
    case "medium": return cutTo(f, [0.6, 1.5, 3.7], [0.25, 1.3, -0.4], 40, r, 0.0022);
    case "screen": return cutTo(f, [MAIN[0] + 0.05, MAIN[1] + 0.02, MAIN[2] + 2.9], MAIN, 40, 0, 0.0018);
    case "side": return cutTo(f, [SIDE[0] + 0.55, SIDE[1] + 0.05, SIDE[2] + 2.0], SIDE, 38, 0.02, 0.0018);
    case "over": return cutTo(f, [-1.7, 1.62, 1.3], [MAIN[0], MAIN[1] - 0.05, MAIN[2]], 40, r, 0.002);
    case "two": return cutTo(f, [1.2, 1.45, 3.7], [1.2, 1.05, 0.25], 40, r, 0.0022);
    case "buddy": return cutTo(f, [1.66, 1.12, 2.75], [BUDDY_AT[0], 0.92, BUDDY_AT[2]], 38, -r, 0.0024, 0.005);
    default: return cutTo(f, [1.2, 2.2, 5.4], [0, 1.2, -0.6], 42, r, 0.002);
  }
};
const SHOTS: ShotDef[] = P.segments.map((s, i) => ({ id: i + 1, a: Math.round(s.from * FPS), b: i + 1 < P.segments.length ? Math.round(P.segments[i + 1].from * FPS) : TOTAL,
  set: "desk", light: s.light ?? "day", sunAz: 125, sunEl: 38 }));
const CAMS: Record<number, Key[]> = Object.fromEntries(P.segments.map((s, i) => [i + 1, [{ ...preset(s.cam, Math.round(s.from * FPS), i), cut: false }]]));
const DOF: Dof[] = P.segments.map((s) => ({ f: Math.round(s.from * FPS), cInf: s.cam === "host" || s.cam === "buddy" ? 12 : s.cam === "over" ? 9 : s.cam === "medium" || s.cam === "two" ? 6 : 0 }));

let SCREENS: { main: Screen; side: Screen } | null = null;
const build = (): Sets => {
  const d = desk(P.accent); SCREENS = { main: d.main, side: d.side };
  return { desk: d.group };
};
const content = (s: ScreenItem, t: number) => {
  const u = clamp01((t - s.from) / Math.max(0.5, Math.min(2.5, s.to - s.from - 0.3)));
  switch (s.kind) {
    case "terminal": { const n = Math.floor((t - s.from) * (s.cps ?? 24)); return { key: `term${s.from}|${n}|${Math.floor(t * 2) % 2}`, draw: terminal(s.lines ?? [], n, t, P.accent) }; }
    case "code": return { key: `code${s.from}`, draw: code(s.lines ?? [], s.hl ?? -1, P.accent) };
    case "shot": return { key: `shot${s.image}`, draw: shot(s.image ?? "") };
    case "mock": return { key: `mock${s.title}`, draw: mockApp(P.accent, s.title) };
    case "bars": { const q = Math.round(u * 30) / 30; return { key: `bars${s.from}|${q}`, draw: bars(s.items ?? [], q, s.unit ?? "%", s.max ?? 100) }; }
    case "split": { const q = Math.round(u * 30) / 30; return { key: `split${s.from}|${q}`, draw: split(mockApp("#8a8f99", s.title), mockApp(P.accent, s.title), q) }; }
  }
};
const idle = (g: CanvasRenderingContext2D, W: number, H: number) => { g.fillStyle = "#1a1f29"; g.fillRect(0, 0, W, H); g.fillStyle = P.accent; g.fillRect(W * 0.46, H * 0.44, W * 0.08, H * 0.12); };
const pose = (_id: number, t: number) => {
  if (!SCREENS) return;
  for (const which of ["main", "side"] as const) {
    const s = P.screens.filter((x) => x.screen === which && t >= x.from && t < x.to).pop();
    if (s) { const c = content(s, t)!; SCREENS[which].show(c.key, c.draw); } else SCREENS[which].show("idle", idle);
  }
};
const stage = (_id: number, t: number, cam: CamInfo) => {
  const out = newStage();
  host(out, cam, HOST, HOST_AT, t, P.expr);
  // the talking buddy: lip-sync from lines.json (speaker "C"), mood timeline, waves on chosen seconds
  const mood = (P.buddy?.mood ?? [[0, "happy"]]).filter(([s]) => t >= s).pop()?.[1] ?? "happy";
  const mouth = mouthAt(t, lines as { speaker: string; start: number; end: number }[], "C");
  const wave = (P.buddy?.wave ?? []).some((w) => t >= w && t < w + 0.8) ? Math.round(Math.sin((t % 0.4) / 0.4 * Math.PI) * 4) / 4 : 0;
  const blink = lidAt(t, 77);
  const hop = mouth > 0 ? 0.02 * Math.abs(Math.sin(t * 7)) : 0;
  card(out, `buddy|${mouth}|${blink}|${mood}|${wave}|${P.buddy?.prop ?? ""}`, [BUDDY_AT[0], 0.56 + hop, BUDDY_AT[2]], 1.1, 1.1, 600, 600,
    (p) => { p.g.scale(1.5, 1.5); drawBuddy(p, { mouth, blink, mood, wave, prop: P.buddy?.prop ?? null }); });
  return out;
};

export const EPISODE: Episode = {
  id: "ad", total: TOTAL, flashAt: Math.round((P.flashAt ?? -1) * FPS), shots: SHOTS, xfade: {}, cams: CAMS, kicks: [], dof: DOF,
  looks: { desk: { inside: true } }, build, pose, stage, captions, accent: P.accent,
  subStyle: P.subStyle ?? "pop", overlays: P.overlays, images: P.images,
};
