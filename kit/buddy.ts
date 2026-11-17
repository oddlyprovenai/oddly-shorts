// The talking AI buddy: a friendly cactus in our own toon ink (style of the SPIKE brand mark, never a third-party
// logo). 400 x 400 canvas, base at the bottom. `mouth` 0..1 opens the mouth (lip-sync from voice/lines.json),
// `blink` 0..1 closes the eyes, `mood` shifts the brows, `prop` adds a small padlock (Cage episodes).
import { Pen } from "./toon";

const DK = "#052E1E", G = "#5FBB47", HI = "#88D445", PALE = "#E3FADA";
export type BuddyPose = { mouth?: number; blink?: number; mood?: "happy" | "proud" | "worried" | "wink"; wave?: number; prop?: "lock" | null };

export const drawBuddy = (p: Pen, o: BuddyPose = {}) => {
  const m = Math.max(0, Math.min(1, o.mouth ?? 0)), bl = Math.max(0, Math.min(1, o.blink ?? 0)), wave = o.wave ?? 0;
  p.ell(200, 386, 110, 11, "rgba(5,46,30,0.25)", 0);
  // arms (the right one waves)
  p.poly([[70, 250], [70, 165], [95, 140], [122, 165], [122, 232], [150, 252], [150, 292], [100, 292]], G, 9);
  const a = wave * 0.5, rx = 330, ry = 150, R = (x: number, y: number): [number, number] => [278 + (x - 278) * Math.cos(a) - (y - 250) * Math.sin(a), 250 + (x - 278) * Math.sin(a) + (y - 250) * Math.cos(a)];
  p.poly([R(rx, 232), R(rx, ry), R(305, 126), R(278, ry), R(278, 222), R(250, 242), R(250, 282), R(300, 282)], G, 9);
  // trunk + highlight + spines
  p.poly([[130, 382], [130, 112], [150, 64], [200, 42], [250, 64], [270, 112], [270, 382]], G, 10);
  p.poly([[158, 362], [158, 122], [176, 80], [200, 68], [196, 362]], HI, 0);
  for (const [x, y, d] of [[200, 32, 0], [262, 72, 40], [138, 72, -40], [62, 152, -60], [338, 140, 60]] as const) {
    const r = (d * Math.PI) / 180; p.stroke([[x, y], [x + 18 * Math.sin(r), y - 18 * Math.cos(r)]], 7, DK);
  }
  // face
  const ey = 172;
  for (const s of [-1, 1]) {
    const ex = 200 + s * 24;
    if (o.mood === "wink" && s > 0) p.arc(ex, ey + 4, 11, 7, 200, 340, 7, DK);
    else if (bl > 0.6) p.stroke([[ex - 10, ey + 2], [ex + 10, ey + 2]], 7, DK);
    else { p.ell(ex, ey, 10, 14 * (1 - 0.6 * bl), DK, 0); p.ell(ex + 3, ey - 5, 3, 3, PALE, 0); }
    if (o.mood === "worried") p.stroke([[ex - 11, ey - 26 - s * 4], [ex + 11, ey - 26 + s * 4]], 6, DK);
    if (o.mood === "proud") p.stroke([[ex - 11, ey - 24], [ex + 11, ey - 28]], 6, DK);
  }
  if (m > 0.08) { p.ell(201, 208, 16, 6 + 16 * m, DK, 0); p.ell(201, 212 + 6 * m, 9, 4 + 5 * m, "#E26A6A", 0); }
  else p.arc(201, 198, 18, 12, 20, 160, 7, DK);
  for (const [x, y] of [[188, 280], [222, 310], [186, 340]] as const) p.stroke([[x, y], [x, y + 18]], 6, DK);
  if (o.prop === "lock") { // small padlock held by the left arm
    p.arc(96, 128, 22, 26, 180, 360, 9, "#c9cdd4");
    p.poly([[66, 128], [126, 128], [126, 182], [66, 182]], "#F0592A", 7);
    p.ell(96, 150, 7, 7, "#8a2a10", 0);
  }
};

/** mouth opening for the buddy at time t from dialogue spans: open while its lines play, flapping ~7 Hz */
export const mouthAt = (t: number, spans: { speaker: string; start: number; end: number }[], who: string) => {
  const s = spans.find((x) => x.speaker === who && t >= x.start && t < x.end);
  if (!s) return 0;
  const k = Math.sin((t - s.start) * Math.PI * 2 * 3.6);
  return Math.round(Math.max(0, k) * 6) / 6;
};
