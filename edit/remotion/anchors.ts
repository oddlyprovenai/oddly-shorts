// reel-edit · face/shoulder anchors. The face track (Apple Vision, scripts/face.swift) is in source-frame coordinates;
// the frame on screen is the source scaled by Z around the clip origin (ox, oy), so every anchor follows the punch-in.
export type Face = [number, number, number, number, number]; // t, x, y, w, h (normalized, top-left origin)
export type Rect = { x: number; y: number; w: number; h: number }; // pixels on the 1080x1920 frame
export const W = 1080, H = 1920;

// face box at edit time t: linear interpolation of the track, averaged over +-0.3 s (no jitter)
// lo/hi: the clip's edit-time bounds, so the average never mixes two different shots
export const faceAt = (all: Face[], t: number, lo = -1e9, hi = 1e9): Face | null => {
  const inClip = all.filter((f) => f[0] >= lo && f[0] < hi), track = inClip.length ? inClip : all;
  if (!track.length) return null;
  const near = track.filter((f) => Math.abs(f[0] - t) <= 0.3);
  const use = near.length ? near : [track.reduce((a, b) => (Math.abs(b[0] - t) < Math.abs(a[0] - t) ? b : a))];
  const m = [0, 1, 2, 3, 4].map((i) => use.reduce((s, f) => s + f[i], 0) / use.length);
  return m as Face;
};

export const toScreen = (f: Face, Z: number, ox: number, oy: number): Rect => {
  const sx = (x: number) => (ox + (x - ox) * Z) * W, sy = (y: number) => (oy + (y - oy) * Z) * H;
  return { x: sx(f[1]), y: sy(f[2]), w: f[3] * Z * W, h: f[4] * Z * H };
};

// biggest zoom that keeps the chin above the caption band (captions sit right under the face)
export const maxZoomFor = (f: Face, oy: number, chinMax = 0.66) => (chinMax - oy) / Math.max(0.05, f[2] + f[4] - oy);

const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const SAFE = { x: 32, y: 96, r: W - 32, b: H * 0.8 };

export type Anchor = "head" | "rshoulder" | "lshoulder" | "chest";
// Place a w x h overlay at the preferred anchor; never over the face (padded) or any obstacle (captions, hook text, AI tag),
// never in the bottom 20 %. Tries the other anchors, then shrinks to 70 %. Returns the box and its scale.
export const place = (face: Rect, w: number, h: number, pref: Anchor, obstacles: Rect[]): Rect & { s: number; a: Anchor } => {
  const ex = Math.max(24, face.w * 0.1);   // ears and glasses arms sit outside the detector box
  const pad = { x: face.x - ex, y: face.y - 30, w: face.w + 2 * ex, h: face.h + 90 };
  const order: Anchor[] = [pref, ...(["head", "rshoulder", "lshoulder", "chest"] as Anchor[]).filter((a) => a !== pref)];
  for (const s of [1, 0.85, 0.7]) {
    const ww = w * s, hh = h * s;
    for (const a of order) {
      let x = a === "head" || a === "chest" ? face.x + face.w / 2 - ww / 2 : a === "rshoulder" ? pad.x + pad.w + 8 : pad.x - ww - 8;
      let y = a === "head" ? face.y - hh - 34 : a === "chest" ? pad.y + pad.h + 12 : face.y + face.h * 0.95 - hh;
      x = Math.min(Math.max(x, SAFE.x), SAFE.r - ww); y = Math.min(Math.max(y, SAFE.y), SAFE.b - hh);
      const r = { x, y, w: ww, h: hh };
      if (!hit(r, pad) && !obstacles.some((o) => hit(r, o))) return { ...r, s, a };
    }
  }
  // last resort: above the head, squeezed into whatever is there (still never on the face)
  const hh = Math.max(80, Math.min(h * 0.7, pad.y - SAFE.y)), s = hh / h;
  return { x: Math.min(Math.max(face.x + face.w / 2 - (w * s) / 2, SAFE.x), SAFE.r - w * s), y: Math.max(SAFE.y, pad.y - hh), w: w * s, h: hh, s, a: "head" };
};
