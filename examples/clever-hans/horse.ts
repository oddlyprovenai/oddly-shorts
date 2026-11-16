// Hans, an original cartoon horse card (toon ink, flat colours), side view facing right, on a 1000 x 900 canvas
// with the hooves at y = 880. `tap` 0..1 lifts the near foreleg (1 = raised), `mood` sets eye and mouth.
import { Pen, INK } from "../oddly-kit/toon";

export type Mood = "happy" | "blank" | "dizzy" | "smug" | "proud";
const C = "#b9773e", DARK = "#7a4a22", MANE = "#3a2516";
const leg = (p: Pen, hip: [number, number], knee: [number, number], hoof: [number, number], col: string) => {
  p.stroke([hip, knee, hoof], 46, INK); p.stroke([hip, knee, hoof], 34, col);
  p.ell(hoof[0] + 6, hoof[1] + 2, 26, 14, "#2a1d14", 5);
};
export const drawHorse = (p: Pen, tap = 0, mood: Mood = "happy") => {
  // far legs (darker), tail
  leg(p, [330, 560], [320, 720], [318, 870], DARK);
  leg(p, [640, 560], [650, 720], [652, 870], DARK);
  p.poly([[230, 470], [150, 520], [120, 660], [170, 640], [205, 560]], MANE, 8);
  // body
  p.ell(470, 500, 260, 125, C, 10);
  // near legs; the near foreleg taps (knee forward, hoof up)
  leg(p, [360, 575], [350, 725], [350, 875], C);
  const k: [number, number] = [612 + 70 * tap, 720 - 60 * tap], h: [number, number] = [610 + 90 * tap, 875 - 150 * tap];
  leg(p, [610, 575], k, h, C);
  // neck + head
  p.poly([[640, 440], [700, 260], [790, 230], [800, 330], [720, 540]], C, 10);
  p.ell(840, 270, 110, 62, C, 10, 0, 360, 25);
  p.ell(920, 300, 40, 34, "#d9a079", 8, 0, 360, 25);
  p.ell(925, 296, 8, 6, INK, 0);
  // ears + mane
  p.poly([[760, 200], [775, 130], [805, 205]], C, 8);
  p.poly([[640, 470], [690, 250], [770, 205], [735, 300], [675, 480]], MANE, 8);
  // eye + mouth by mood
  const ex = 845, ey = 245;
  if (mood === "dizzy") { p.arc(ex, ey, 18, 18, 0, 300, 6, INK); p.arc(ex, ey, 8, 8, 0, 300, 5, INK); }
  else if (mood === "blank") p.ell(ex, ey, 10, 10, INK, 0);
  else if (mood === "smug") { p.ell(ex, ey + 4, 16, 9, "#ffffff", 5); p.ell(ex + 4, ey + 6, 7, 6, INK, 0); p.stroke([[ex - 18, ey - 6], [ex + 18, ey - 2]], 7, INK); }
  else { p.ell(ex, ey, 16, 20, "#ffffff", 5); p.ell(ex + 5, ey + 3, 8, 10, INK, 0); }
  if (mood === "happy" || mood === "proud") p.arc(905, 320, 30, 18, 10, 150, 7, INK);
  else if (mood === "dizzy") p.stroke([[880, 330], [905, 322], [930, 332]], 7, INK);
  else p.stroke([[885, 328], [930, 328]], 7, INK);
  if (mood === "proud") p.ell(780, 395, 26, 26, "#e2453c", 6); // a rosette
};
