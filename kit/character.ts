// Consistent character kit. A character is defined ONCE in characters/<name>.json and drawn by drawCharacter()
// in every video, so the same person always has the same face, hair, glasses, outfit, colours and props. Only the
// expression, gaze, blink and gesture change per frame. Built on toon.ts bodyFront (bean head, plum ink, stick limbs).
import { Pen, bodyFront, headBlob, Outfit, Expr, INK } from "./toon";

export type CharacterSpec = {
  name: string;
  role?: string;
  skin: string;                                  // e.g. "#ecd0b6"
  hair: { color: string; style: "tuft" | "neat" | "bun" | "cap"; cap?: string };
  glasses?: "round" | "square" | null;
  top: { color: string; buttons?: string; shirt?: string; collar?: boolean };   // cardigan / jacket / hoodie colour
  pants: string; shoes: string;
  pin?: { kind: "cactus" | "star" | "heart" | "none"; color: string };
  pocket?: { kind: "notebook" | "pen" | "none"; color: string };
  moustache?: string;
  build?: "adult" | "stout" | "kid";
  seed: number;                                  // fixed head shape (1-7)
};
export type Pose = { expr?: Expr; look?: number; blink?: number; light?: number; wave?: number; mode?: "stand" | "march"; phase?: number };

const BUILD = { adult: { a: 118, torso: 1.1, legs: 1.4 }, stout: { a: 118, torso: 1.15, legs: 1.32 }, kid: { a: 112, torso: 0.85, legs: 1.0 } };

export const outfitOf = (c: CharacterSpec): Outfit => ({
  jacket: c.top.color, pants: c.pants, boots: c.shoes, skin: c.skin, buttons: c.top.buttons, moustache: c.moustache, build: c.build ?? "adult",
  hat: c.hair.style === "cap" ? "cap" : "hair", hair: c.hair.color, cap: c.hair.cap ?? c.hair.color,
});

/** the character on the 600 x 1000 design canvas (soles at y = 975), facing the lens */
export const drawCharacter = (p: Pen, c: CharacterSpec, o: Pose = {}) => {
  const mode = o.mode ?? "stand";
  bodyFront(p, outfitOf(c), { mode, phase: o.phase, expr: o.expr ?? "smile", look: o.look ?? 0, blink: o.blink ?? 0, light: o.light, seed: c.seed, wave: o.wave });
  if (mode !== "stand") return; // overlays are placed for the standing pose
  const B = BUILD[c.build ?? "adult"], H = headBlob(c.seed, B.a, 0), HH = 2 * H.b, W = 2 * H.a, u = W / 100;
  const chin = 975 - B.legs * HH - B.torso * HH, hc = chin - H.b, crown = hc - H.b;
  p.rot = null;
  if (c.top.shirt) { // shirt V + collar points under the jacket
    p.poly([[300 - 11 * u, chin + 1 * u], [300 + 11 * u, chin + 1 * u], [300, chin + 0.42 * HH]], c.top.shirt, 1.6 * u);
    if (c.top.collar !== false) {
      p.poly([[300 - 11 * u, chin + 1 * u], [300 - 2 * u, chin + 1 * u], [300 - 7 * u, chin + 9 * u]], "#ffffff", 1.4 * u);
      p.poly([[300 + 2 * u, chin + 1 * u], [300 + 11 * u, chin + 1 * u], [300 + 7 * u, chin + 9 * u]], "#ffffff", 1.4 * u);
    }
  }
  const px = 300 + 21 * u, py = chin + 0.3 * HH;
  if (c.pin?.kind === "cactus") {
    p.ell(px, py, 2.6 * u, 4.6 * u, c.pin.color, 1.1 * u);
    p.ell(px - 3.6 * u, py - 0.6 * u, 1.4 * u, 2.4 * u, c.pin.color, 0.9 * u);
    p.ell(px + 3.6 * u, py - 1.4 * u, 1.4 * u, 2.4 * u, c.pin.color, 0.9 * u);
  } else if (c.pin?.kind === "star") {
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) { const r = (i % 2 ? 2.2 : 5) * u, a = -Math.PI / 2 + (i * Math.PI) / 5; pts.push([px + r * Math.cos(a), py + r * Math.sin(a)]); }
    p.poly(pts, c.pin.color, 1 * u);
  } else if (c.pin?.kind === "heart") {
    p.ell(px - 1.8 * u, py - 1 * u, 2.4 * u, 2.4 * u, c.pin.color, 0.9 * u); p.ell(px + 1.8 * u, py - 1 * u, 2.4 * u, 2.4 * u, c.pin.color, 0.9 * u);
    p.poly([[px - 4 * u, py], [px + 4 * u, py], [px, py + 4.5 * u]], c.pin.color, 0.9 * u);
  }
  const nx = 300 - 24 * u, ny = chin + 0.72 * HH;
  if (c.pocket?.kind === "notebook") {
    p.poly([[nx - 6 * u, ny - 9 * u], [nx + 6 * u, ny - 9 * u], [nx + 6 * u, ny + 3 * u], [nx - 6 * u, ny + 3 * u]], c.pocket.color, 1.3 * u);
  } else if (c.pocket?.kind === "pen") {
    p.stroke([[nx + 2 * u, ny - 12 * u], [nx + 2 * u, ny]], 2.4 * u, c.pocket.color);
  }
  if (c.pocket && c.pocket.kind !== "none") // pocket flap
    p.poly([[nx - 9 * u, ny - 1 * u], [nx + 9 * u, ny - 1 * u], [nx + 9 * u, ny + 8 * u], [nx - 9 * u, ny + 8 * u]], shade(c.top.color), 1.5 * u);
  if (c.hair.style === "tuft")
    p.poly([[300 - 9 * u, crown + 5 * u], [300 - 4 * u, crown - 9 * u], [300, crown + 2 * u], [300 + 6 * u, crown - 11 * u], [300 + 9 * u, crown + 4 * u]], c.hair.color, 1.8 * u);
  else if (c.hair.style === "bun") p.ell(300, crown - 6 * u, 12 * u, 10 * u, c.hair.color, 1.8 * u);
  if (c.glasses === "round") for (const s of [-1, 1]) p.arc(300 + s * 13 * u, hc, 10.5 * u, 9.5 * u, 0, 360, 2.6 * u, INK);
  if (c.glasses === "square") for (const s of [-1, 1])
    p.poly([[300 + s * 13 * u - 10 * u, hc - 8 * u], [300 + s * 13 * u + 10 * u, hc - 8 * u], [300 + s * 13 * u + 10 * u, hc + 8 * u], [300 + s * 13 * u - 10 * u, hc + 8 * u]], null, 2.4 * u);
  if (c.glasses) {
    p.stroke([[300 - 2.5 * u, hc - 1 * u], [300 + 2.5 * u, hc - 1 * u]], 2.4 * u, INK);
    for (const s of [-1, 1]) p.stroke([[300 + s * 23.5 * u, hc - 1 * u], [300 + s * 30 * u, hc - 3 * u]], 2.2 * u, INK);
  }
};
const shade = (hex: string) => {
  const n = parseInt(hex.slice(1), 16), k = 0.82, c = (v: number) => Math.round(v * k).toString(16).padStart(2, "0");
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
};
