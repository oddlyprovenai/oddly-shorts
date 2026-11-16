// Episode 01 — "The Ship That Failed Its Test" (the Vasa, 1628) -> SPIKE: our first medicine model failed its
// acceptance test, so it did not ship; the second passed. Timings from estudio/episodes/01-vasa/voice/words.json.
import * as THREE from "three";
import { Episode, ShotDef, Key, Dof, Sets, V3, CamInfo, hold, cutTo, glideTo, smooth, clamp01, lerp, FPS } from "../oddly-kit/episode";
import { newStage, person, otto, folk, smoke, card, burst, hh } from "../oddly-kit/people";
import { drawCactus } from "../oddly-kit/cameos";
import { fxSplash, Outfit, SKINS } from "../oddly-kit/toon";
import { buildSets, ACCENT, QUAY_Y } from "./sets";
import captions from "./captions.json";

const TOTAL = 1752; // 57.10 s voice + 1.3 s tail
const T_GUST = 26.1, T_TIP = 26.3, T_SINK = 29.6, T_STOP = 20.45, T_WOBBLE = 37.9, T_TOP = 40.0, T_STABLE = 49.9, T_PASS = 55.4;
const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 109, set: "lab", light: "day", sunAz: 120, sunEl: 35 },
  { id: 2, a: 109, b: 408, set: "harbour", light: "day" },
  { id: 3, a: 408, b: 678, set: "harbour", light: "day" },
  { id: 4, a: 678, b: 924, set: "harbour", light: "day" },
  { id: 5, a: 924, b: 1105, set: "seabed", light: "day", sunEl: 70 },
  { id: 6, a: 1105, b: 1226, set: "room", light: "day", sunAz: 120, sunEl: 35 },
  { id: 7, a: 1226, b: 1317, set: "harbour", light: "golden", sunEl: 14 },
  { id: 8, a: 1317, b: 1524, set: "museum", light: "day", sunAz: 140, sunEl: 60 },
  { id: 9, a: 1524, b: TOTAL, set: "lab", light: "day", sunAz: 120, sunEl: 35 },
];

// ---------------- the ship ----------------
type ShipState = { pos: V3; roll: number; pitch: number; visible: boolean };
export const shipAt = (id: number, t: number): ShipState => {
  const moored: ShipState = { pos: [-8, 0, 0], roll: 0, pitch: 0, visible: true };
  switch (id) {
    case 2: case 7: return moored;
    case 3: { // stability test: 30 men running, the roll grows until the admiral stops it, then dies away
      const amp = 0.03 + 0.13 * smooth((t - 16.2) / 4) - 0.14 * smooth((t - T_STOP - 0.3) / 1.6);
      return { ...moored, roll: Math.max(0, amp) * Math.sin((2 * Math.PI * (t - 16)) / 2.2) };
    }
    case 4: {
      const u = t - 22.6, x = -8 + 16 * smooth(u / 3), z = -9 * u;
      let roll = -0.12 * Math.exp(-(((t - 24.9) / 0.5) ** 2)) - 0.62 * smooth((t - T_TIP) / 0.7) - 0.25 * smooth((t - T_SINK) / 1.2);
      const sink = Math.max(0, t - T_SINK);
      return { pos: [x, -7 * sink * sink, z], roll, pitch: 0.18 * smooth(sink / 1.4), visible: true };
    }
    case 5: return { pos: [0, -27.5, 0], roll: -0.32, pitch: 0.05, visible: true };
    case 8: return { pos: [0, 4.6, 0], roll: 0, pitch: 0, visible: true };
    default: return { ...moored, visible: false };
  }
};
const DECK = (z: number) => 5 + 2.6 * Math.max(0, (z + 2) / 24) ** 2 - 0.35;

// ---------------- cameras ----------------
const shipPos = (id: number, f: number) => shipAt(id, f / FPS).pos;
const at = (id: number, off: V3) => (f: number): V3 => { const p = shipPos(id, f); return [p[0] + off[0], p[1] + off[1], p[2] + off[2]]; };
const track = (f: number, id: number, pos: V3, off: V3, fov: number, roll = 0): Key => ({ f, cut: true, s: (g) => ({ pos, look: at(id, off)(g), fov, roll }) });
const follow = (f: number, id: number, rel: V3, off: V3, fov: number, roll = 0): Key =>
  ({ f, cut: true, s: (g) => ({ pos: at(id, rel)(g), look: at(id, off)(g), fov, roll }) });
const CAMS: Record<number, Key[]> = {
  1: [hold(0, [0.35, 1.5, 3.1], [0, 1.25, 0], 40), cutTo(46, [0.12, 1.6, 1.85], [0, 1.45, 0], 38, 0.05, 0.003, 0.006)],
  2: [hold(109, [70, 40, -95], [-10, 3, 0], 42, 0, 0.0018), cutTo(166, [14, 4, -42], [-8, 9, 0], 44, -0.03), cutTo(318, [-16.5, 3.2, 3], [-21.5, 2.2, 10], 40, 0.04, 0.003, 0.006),
    cutTo(346, [9, 3.4, -9], [-2.5, 3, 1], 38, 0, 0.0025, 0.006)],
  3: [hold(408, [38, 14, -48], [-8, 8, 0], 42), cutTo(477, [2.5, 11, 3], [-8.5, 6.2, -3], 46, 0, 0.002), cutTo(568, [16, 2.2, -24], [-8, 5, 0], 42, 0.04),
    cutTo(612, [-4.6, 7.3, 5.2], [-6.5, 7.0, 10], 40, -0.04, 0.003)],
  4: [track(678, 4, [46, 9, 40], [0, 8, 0], 42), track(727, 4, [36, 3.5, -150], [0, 7, 0], 40, 0.03),
    follow(823, 4, [36, 8, -30], [0, 2, 0], 40, -0.05), track(880, 4, [95, 22, 20], [0, 4, 0], 40)],
  5: [hold(924, [48, -17, -58], [0, -25, 0], 44, 0, 0.0018), cutTo(1007, [30, -22, -36], [0, -25, 0], 42, 0.06, 0.0025)],
  6: [hold(1105, [0.7, 1.55, 3.7], [0, 1.35, -0.4], 40), glideTo(1170, 30, [0.35, 1.7, 2.6], [0, 1.9, -0.4], 38, -0.04)],
  7: [hold(1226, [-10.5, 4.2, -30], [-17, 3.2, -20], 40, 0.03, 0.0025)],
  8: [hold(1317, [34, 9, -46], [0, 9, 0], 44, 0, 0.002), cutTo(1403, [9, 1.6, -36], [0, 12, -10], 46, 0.05, 0.0018),
    cutTo(1470, [11, 1.7, -20], [7, 1.6, -13], 40, -0.03, 0.003, 0.006)],
  9: [hold(1524, [0.3, 1.5, 3.0], [0, 1.25, 0], 40, 0, 0.0022), cutTo(1636, [0.1, 1.58, 1.9], [0, 1.45, 0], 38, 0.04, 0.003, 0.006)],
};
const KICKS: [number, number][] = [[T_TIP, 1.0], [T_TOP + 0.1, 0.5]];
const DOF: Dof[] = [
  { f: 0, cInf: 12 }, { f: 109, cInf: 0 }, { f: 318, cInf: 12 }, { f: 346, cInf: 8 }, { f: 408, cInf: 0 }, { f: 477, cInf: 9 },
  { f: 568, cInf: 0 }, { f: 612, cInf: 13 }, { f: 678, cInf: 0 }, { f: 823, cInf: 9 }, { f: 880, cInf: 0 }, { f: 924, cInf: 6 },
  { f: 1105, cInf: 12 }, { f: 1226, cInf: 11 }, { f: 1317, cInf: 0 }, { f: 1470, cInf: 11 }, { f: 1524, cInf: 12 },
];

// ---------------- posing ----------------
let SHIP: THREE.Object3D | null = null;
const tmpV = new THREE.Vector3();
const onShip = (local: V3): V3 => { SHIP!.updateMatrixWorld(true); const v = SHIP!.localToWorld(tmpV.set(...local)); return [v.x, v.y, v.z]; };
const pose = (id: number, t: number, sets: Sets) => {
  const ship = sets.always.userData.ship as THREE.Object3D, s = shipAt(id, t);
  SHIP = ship; ship.visible = s.visible;
  ship.position.set(...s.pos); ship.rotation.set(s.pitch, 0, s.roll, "ZXY");
  const wt = sets.harbour.userData.water as THREE.Mesh; (wt.userData.tex as THREE.Texture).offset.set(t * 0.01, t * 0.02);
  const shelf = sets.room.userData.shelf as THREE.Object3D;
  const wob = 0.02 * smooth((t - 37.0) / 1.0) + 0.05 * smooth((t - T_TOP) / 0.3);
  shelf.rotation.z = wob * Math.sin(t * 9) * (t < 41.8 ? 1 : 0);
};

// ---------------- cast ----------------
const SAILOR = (i: number): Outfit => ({ jacket: ["#2f4f7a", "#efe6cf", "#7a3a2a"][i % 3], pants: "#3b3f52", boots: "#4a3426", hat: i % 2 ? "cap" : "hair", cap: "#c0392b", hair: ["#3a2a20", "#6b3e26", "#c99a4a"][i % 3], skin: SKINS[i % 4] });
const ADMIRAL: Outfit = { jacket: "#1f3a6a", pants: "#1f3a6a", boots: "#2a211c", hat: "tophat", buttons: "#e8c45a", sash: "#c0353a", skin: SKINS[0], moustache: "#d9d0c0", build: "stout" };
const INSPECTOR: Outfit = { jacket: "#3b4a66", pants: "#2b2f3a", boots: "#2a211c", hat: "cap", cap: "#f3d23a", skin: SKINS[3] };
const flag = (p: import("../oddly-kit/toon").Pen) => { p.stroke([[60, 380], [60, 40]], 12, "#5a3b2a"); p.poly([[66, 44], [300, 70], [66, 190]], "#e2453c", 8); };

const stage = (id: number, t: number, cam: CamInfo, _sets: Sets) => {
  const out = newStage();
  switch (id) {
    case 1: case 9: {
      const tl: [number, import("../oddly-kit/toon").Expr][] = id === 1 ? [[0, "smile"], [1.4, "shock"]] : [[0, "neutral"], [52.5, "nervous"], [T_PASS - 0.1, "grin"], [56.6, "smile"]];
      otto(out, cam, [0, 0, 0], t, tl, { look: id === 1 ? 0.2 : 0 });
      card(out, "cactus", [0.62, 1.29, -0.75], 0.55, 0.55, 400, 400, drawCactus);
      break;
    }
    case 2: {
      person(out, cam, 1, folk(1, "old"), [-21, QUAY_Y, 7.6], t, { expr: "stern", look: 0.3 });
      person(out, cam, 2, folk(4, "old"), [-23.6, QUAY_Y, 12.4], t, { expr: "nervous", look: -0.3 });
      for (let i = 0; i < 8; i++) person(out, cam, 3 + i, folk(i, "old"), [-19 - (i % 3) * 2.5, QUAY_Y, -30 + i * 6.5], t, { expr: i % 2 ? "smile" : "grin", look: 0.5 });
      break;
    }
    case 3: {
      for (let i = 0; i < 12; i++) { // sailors running side to side across the deck (local x), staggered
        const z = -10 + (i % 6) * 3 + (i >= 6 ? 1.5 : 0), ph = ((t - 16) / 1.1 + hh(i) * 0.3) % 2, run = t > 15.9 && t < T_STOP + 0.4;
        const x = run ? lerp(-3.6, 3.6, ph < 1 ? smooth(ph) : smooth(2 - ph)) : -3 + hh(i, 4) * 6;
        person(out, cam, 20 + i, SAILOR(i), onShip([x, DECK(z), z]), t, run ? { mode: "march", phase: (t * 2.4 + hh(i)) % 1, expr: "grin", lift: 90 } : { expr: t > T_STOP ? "nervous" : "smile" });
      }
      person(out, cam, 40, ADMIRAL, onShip([1.5, DECK(10), 10]), t, { expr: t >= T_STOP - 0.1 ? "stern" : "nervous", swaps: [T_STOP - 0.1], look: -0.4 });
      break;
    }
    case 4: {
      if (t > 27.3 && t < T_SINK + 1.2) for (let k = 0; k < 4; k++) {
        const u = Math.round((((t - 27.3) * 1.4 + k / 4) % 1) * 30) / 30, p = onShip([5.6, 1.0, -12 + k * 7]);
        out.fx.push({ key: `splash${u}`, cw: 800, ch: 800, draw: (pn) => fxSplash(pn, u), x: p[0], y: Math.max(0.2, p[1]) + 1.5, z: p[2], w: 6, h: 6 });
      }
      if (t > T_SINK + 0.4) { const p = shipAt(4, t).pos; smoke(out, [p[0], 0.3, p[2]], t, [0, 0.3, 0], 5, 8, 6); }
      break;
    }
    case 6: {
      const scared = t >= T_TOP - 0.1;
      person(out, cam, 50, folk(5), [0.5, 0, 0.85], t, { expr: scared ? "shock" : "grin", swaps: [T_TOP - 0.1], look: -0.6 });
      if (scared && t < T_TOP + 0.6) burst(out, [0, 2.6, -0.2], clamp01((t - T_TOP) / 0.6), 1.4, "#ffffff", false);
      break;
    }
    case 7: {
      const p: V3 = [-17, QUAY_Y, -20];
      person(out, cam, 60, INSPECTOR, p, t, { expr: "stern", look: 0.4 });
      card(out, "redflag", [p[0] + 0.55, p[1] + 1.9, p[2] + 0.1], 0.9, 1.2, 320, 400, flag);
      break;
    }
    case 8: {
      const happy = t >= T_STABLE - 0.1;
      for (let i = 0; i < 7; i++) person(out, cam, 70 + i, folk(i + 2), [4.5 + (i % 4) * 1.4, 0, -15 + Math.floor(i / 4) * 2.2 + hh(i) * 0.6], t,
        { expr: happy ? (i % 2 ? "grin" : "smile") : "neutral", swaps: [T_STABLE - 0.1], look: -0.5 });
      break;
    }
  }
  return out;
};

export const EP01: Episode = {
  id: "ep-01", total: TOTAL, flashAt: 109, shots: SHOTS, xfade: { 5: 8, 6: 8, 7: 8, 8: 8, 9: 8 }, cams: CAMS, kicks: KICKS, dof: DOF,
  looks: {
    lab: { inside: true }, room: { inside: true }, museum: { inside: true },
    seabed: { sky: { c: ["#0f2f45", "#164a66", "#1f6487", "#2a7ea6", "#3f9cc4"], e: [-20, 0, 15, 35, 70] }, fog: [4, 80], fogCol: "#16506e" },
    harbour: { fog: [60, 900], far: 2000 },
  },
  build: buildSets, pose, stage, captions, accent: ACCENT,
};
