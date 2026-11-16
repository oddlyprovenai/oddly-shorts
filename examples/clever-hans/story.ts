// Episode 02 — "The Horse That Could Count" (Clever Hans, Germany, early 1900s; Pfungst 1907) -> SPIKE: the router
// is tested on 130 requests written blind and never used for tuning: 116 right. Timings: estudio/episodes/02-clever-hans.
import { Episode, ShotDef, Key, Dof, Sets, V3, CamInfo, hold, cutTo, glideTo, clamp01, FPS } from "../oddly-kit/episode";
import { newStage, person, otto, folk, card, burst, dust, hh } from "../oddly-kit/people";
import { drawCactus } from "../oddly-kit/cameos";
import { Outfit, Expr, SKINS, Pen } from "../oddly-kit/toon";
import { buildSets, ACCENT } from "./sets";
import { drawHorse, Mood } from "./horse";
import captions from "./captions.json";

const TOTAL = 1892; // 61.76 s voice + 1.3 s tail
const T_TAP1 = 10.6, T_11 = 17.42, T_CORRECT = 18.9, T_WRONG = 31.96, T_SEE = 33.34, T_LYING = 36.76, T_NOD = 41.2, T_SMILE = 44.46, T_RIGHT = 60.2;
const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 130, set: "lab", light: "day", sunAz: 120, sunEl: 35 },
  { id: 2, a: 130, b: 371, set: "yard", light: "day" },
  { id: 3, a: 371, b: 585, set: "yard", light: "day" },
  { id: 4, a: 585, b: 775, set: "yard", light: "day" },
  { id: 5, a: 775, b: 1066, set: "barn", light: "day", sunAz: 110, sunEl: 40 },
  { id: 6, a: 1066, b: 1293, set: "yard", light: "golden", sunEl: 14 },
  { id: 7, a: 1293, b: 1394, set: "quiz", light: "day", sunAz: 160, sunEl: 40 },
  { id: 8, a: 1394, b: 1538, set: "barn", light: "day", sunAz: 110, sunEl: 40 },
  { id: 9, a: 1538, b: 1627, set: "yard", light: "golden", sunEl: 14 },
  { id: 10, a: 1627, b: TOTAL, set: "lab", light: "day", sunAz: 120, sunEl: 35 },
];
const HANS: V3 = [0, 0, 0], OWNER: V3 = [2.2, 0, 0.9], PFUNGST: V3 = [3.6, 0, 0.6];
const CAMS: Record<number, Key[]> = {
  1: [hold(0, [0.35, 1.5, 3.1], [0, 1.25, 0], 40), cutTo(88, [0.12, 1.6, 1.85], [0, 1.45, 0], 38, -0.05, 0.003, 0.006)],
  2: [hold(130, [10, 7, 22], [0, 2, -4], 44, 0, 0.002), cutTo(191, [2.2, 1.6, 4.4], [0.4, 1.4, 0], 40, 0.04, 0.003, 0.006),
    cutTo(241, [1.2, 1.7, 7.2], [1.2, 1.2, 0.3], 42, 0, 0.0025)],
  3: [cutTo(371, [-1.9, 1.7, 1.2], [-3.2, 1.6, -1.5], 38, 0.03, 0.003), cutTo(437, [3.4, 1.65, 4.6], [1.6, 1.4, 0.4], 40, -0.03, 0.0025),
    cutTo(514, [0.6, 0.7, 3.4], [0.6, 0.6, 0], 40, 0.04, 0.0025, 0.006), cutTo(567, [0, 4.5, 15], [0, 1.5, 0], 46, 0, 0.003)],
  4: [hold(585, [-6, 3.5, 16], [0, 1.6, 2], 46, 0, 0.002), cutTo(668, [6.5, 1.7, 9.5], [2.5, 1.5, 5.4], 42, 0.03, 0.0025)],
  5: [hold(775, [2.25, 1.9, 11.5], [2.25, 1.4, 0.3], 40, 0, 0.0015), cutTo(868, [4.5, 1.65, 2.6], [3.6, 1.6, 0.6], 36, -0.04, 0.003),
    cutTo(929, [1.9, 1.75, 3.0], [0.8, 1.6, 0], 38, 0.05, 0.003, 0.006), cutTo(975, [1.2, 3.6, 7.8], [1.6, 1.0, 0.2], 44, 0, 0.0025)],
  6: [hold(1066, [2.0, 1.6, 4.2], [0.4, 1.4, 0], 40, 0, 0.0025), cutTo(1123, [1.5, 1.4, 3.6], [0.4, 1.3, 0], 38, -0.04, 0.0025),
    cutTo(1183, [0.9, 1.75, 2.4], [2.2, 1.75, 0.9], 34, 0.03, 0.003, 0.006)],
  7: [hold(1293, [0.1, 1.7, 8.8], [0.05, 1.3, 0.5], 40, 0, 0.003), cutTo(1335, [-0.6, 1.75, 2.2], [-1.3, 1.7, 0.0], 34, 0.04, 0.003, 0.006)],
  8: [hold(1394, [1.4, 3.4, 7.4], [1.6, 1.1, 0.2], 44, 0, 0.0025), glideTo(1470, 30, [4.6, 1.7, 3.2], [3.6, 1.6, 0.6], 38, -0.03)],
  9: [hold(1538, [2.0, 1.5, 4.0], [0.4, 1.3, 0], 40, 0, 0.003), cutTo(1589, [1.2, 1.4, 3.0], [0.5, 1.4, 0], 36, 0.04, 0.003, 0.006)],
  10: [hold(1627, [0.3, 1.5, 3.0], [0, 1.25, 0], 40, 0, 0.0022), cutTo(1771, [0.1, 1.58, 1.9], [0, 1.45, 0], 38, 0.04, 0.003, 0.006)],
};
const KICKS: [number, number][] = [[T_WRONG, 0.6], [T_CORRECT, 0.4]];
const DOF: Dof[] = [
  { f: 0, cInf: 12 }, { f: 130, cInf: 0 }, { f: 191, cInf: 12 }, { f: 241, cInf: 8 }, { f: 371, cInf: 11 }, { f: 437, cInf: 9 },
  { f: 514, cInf: 13 }, { f: 567, cInf: 0 }, { f: 668, cInf: 9 }, { f: 775, cInf: 9 }, { f: 975, cInf: 0 }, { f: 1066, cInf: 11 },
  { f: 1293, cInf: 10 }, { f: 1394, cInf: 0 }, { f: 1470, cInf: 10 }, { f: 1538, cInf: 11 }, { f: 1627, cInf: 12 },
];

// ---------------- cast ----------------
const TEACHER: Outfit = { jacket: "#4a4a55", pants: "#2b2f3a", boots: "#2a211c", hat: "hair", hair: "#d9d0c0", skin: SKINS[0], moustache: "#d9d0c0", build: "stout" };
const PSYCH: Outfit = { jacket: "#2f5f6a", pants: "#2b2f3a", boots: "#2a211c", hat: "hair", hair: "#6b3e26", skin: SKINS[1] };
const EXPERT = (i: number): Outfit => ({ ...folk(i, "old"), hat: "tophat", dress: undefined, jacket: ["#2b2f3a", "#3b3f52", "#4a3a2a"][i % 3] });
const HOST: Outfit = { jacket: "#e5b02a", pants: "#2b2f3a", boots: "#2a211c", hat: "hair", hair: "#1f1a18", skin: SKINS[3] };
const envelope = (p: Pen) => { p.poly([[20, 40], [280, 40], [280, 200], [20, 200]], "#f6f0de", 8); p.poly([[20, 40], [150, 130], [280, 40]], null, 6); p.ell(150, 128, 22, 22, "#c0392b", 5); };

/** taps: hoof up/down 3 per second while tapping, eleven fast taps in shot 3 */
const tapAt = (id: number, t: number) => {
  const wave = (t0: number, t1: number, hz: number) => (t >= t0 && t < t1 ? Math.max(0, Math.sin((t - t0) * hz * Math.PI * 2)) : 0);
  if (id === 2) return wave(T_TAP1, 12.3, 3);
  if (id === 3) return wave(T_11, T_11 + 11 / 7.5, 7.5);
  if (id === 5) return wave(30.6, 32.5, 3);
  if (id === 6) return wave(39.9, T_NOD + 0.1, 3);
  return 0;
};
const moodAt = (id: number, t: number): Mood =>
  id === 5 && t >= T_WRONG - 0.1 ? "dizzy" : id === 6 ? (t < 37.44 ? "smug" : "blank") : id === 9 ? "proud" : "happy";
const horse = (out: ReturnType<typeof newStage>, id: number, t: number) => {
  const tap = Math.round(tapAt(id, t) * 6) / 6, mood = moodAt(id, t);
  card(out, `hans|${tap}|${mood}`, [HANS[0], 1.19, HANS[2]], 2.7, 2.43, 1000, 900, (p) => drawHorse(p, tap, mood));
  if (tap > 0.95 && id !== 6) dust(out, [0.9, 0.2, 0.15], t, 0.5, 2);
};

const stage = (id: number, t: number, cam: CamInfo, _sets: Sets) => {
  const out = newStage();
  if (id === 1 || id === 10) {
    const tl: [number, Expr][] = id === 1 ? [[0, "smile"], [3.4, "nervous"]] : [[0, "neutral"], [58.0, "smile"], [T_RIGHT - 0.1, "grin"]];
    otto(out, cam, [0, 0, 0], t, tl, { look: id === 1 ? 0.2 : 0 });
    card(out, "cactus", [0.62, 1.29, -0.75], 0.55, 0.55, 400, 400, drawCactus);
    return out;
  }
  if (id === 7) { // quiz: host smiles just before the contestant's answer
    person(out, cam, 80, HOST, [-1.3, 0, 0.0], t, { expr: t > 44.2 ? "grin" : "neutral", swaps: [44.2], look: 0.5 });
    person(out, cam, 81, folk(6), [1.4, 0, 0.0], t, { expr: t > 45.6 ? "grin" : "nervous", swaps: [45.6], look: -0.5 });
    if (t > 45.6 && t < 46.4) burst(out, [1.4, 2.3, 0.0], clamp01((t - 45.6) / 0.8), 1.6, "#ffd84a", false);
    return out;
  }
  horse(out, id, t);
  if (id === 2 || id === 3 || id === 4 || id === 6 || id === 9) {
    const ownerExpr: Expr = id === 6 && t > 39.4 ? (t > T_NOD ? "smile" : "neutral") : t > T_CORRECT && id === 3 ? "grin" : "smile";
    person(out, cam, 1, TEACHER, OWNER, t, { expr: ownerExpr, swaps: [T_CORRECT, T_NOD], look: -0.6, headTilt: id === 6 && t > T_NOD && t < T_NOD + 0.4 ? 6 : 0 });
    const crowd = id === 2 ? 10 : id === 4 ? 18 : id === 9 ? 8 : id === 3 ? 10 : 0;
    for (let i = 0; i < crowd; i++) {
      const x = -6 + (i % 9) * 1.5 + hh(i) * 0.4, z = 5.4 + Math.floor(i / 9) * 1.3 + hh(i, 2) * 0.4;
      const ex: Expr = id === 3 && t > T_CORRECT ? (i % 2 ? "laugh" : "grin") : id === 9 ? "smile" : i % 3 ? "smile" : "grin";
      person(out, cam, 10 + i, folk(i, "old"), [x, 0, z], t, { expr: ex, swaps: [T_CORRECT], look: -0.3 });
    }
    if (id === 4 && t > 22.2) for (let i = 0; i < 13; i++) // the 13-member commission, notebooks out
      person(out, cam, 40 + i, EXPERT(i), [1.0 + (i % 7) * 0.9, 0, 3.0 + Math.floor(i / 7) * 1.1], t, { expr: t > 24.9 ? "smile" : "stern", swaps: [24.9], look: -0.5 });
    if (id === 9) for (let k = 0; k < 2; k++) person(out, cam, 30 + k, { ...folk(k + 3), build: "kid" }, [2.5 + k * 0.6, 0, 0.8], t, { expr: "laugh", look: -0.6 });
  }
  if (id === 5 || id === 8) {
    const hidden = (id === 5 && t >= T_SEE - 0.3) || id === 8;
    const pos: V3 = hidden ? [3.4, 0, 0.4] : PFUNGST;
    person(out, cam, 2, PSYCH, pos, t, { expr: id === 5 && t > 29.0 && t < T_WRONG ? "nervous" : id === 8 ? "neutral" : "stern", swaps: [29.0, T_WRONG], look: -0.6 });
    if (id === 8) card(out, "envelope", [pos[0] - 0.3, 1.25, pos[2] + 0.25], 0.5, 0.33, 300, 240, envelope);
  }
  return out;
};

const pose = (id: number, _t: number, sets: Sets) => {
  const screen = sets.barn.userData.screen; if (screen) screen.visible = id === 8 || (id === 5 && _t >= T_SEE - 0.3);
};

export const EP02: Episode = {
  id: "ep-02", total: TOTAL, flashAt: 130, shots: SHOTS, xfade: { 5: 8, 6: 8, 7: 8, 8: 8, 9: 8, 10: 8 }, cams: CAMS, kicks: KICKS, dof: DOF,
  looks: { lab: { inside: true }, barn: { inside: true }, quiz: { inside: true } },
  build: buildSets, pose, stage, captions, accent: ACCENT,
};
