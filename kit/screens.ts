// Scene library for tech / product ads: live screens inside the 3D world. A Screen is a monitor (bezel + stand) whose
// face is a canvas texture redrawn when its content key changes: typing terminal, code editor, app screenshot,
// bar-chart number reveal, before/after split. Screens are unlit (they glow like real displays) and carry no world ink.
// Terminal prompts are always the generic "lab@mac-studio ~ %": never a real user name, host or path.
import * as THREE from "three";
import { mesh, box, col, P3 } from "./props";
import { NOINK } from "./ink";

export const PROMPT = "lab@mac-studio ~ %";
const FONT = (px: number, w = 600) => `${w} ${px}px "SF Mono", Menlo, "DejaVu Sans Mono", monospace`;
/** images preloaded by Short.tsx (Episode.images): name -> HTMLImageElement */
export const IMAGES = new Map<string, HTMLImageElement>();

export class Screen {
  group = new THREE.Group();
  private cv = document.createElement("canvas");
  private tex: THREE.CanvasTexture;
  private key = "";
  constructor(public w = 1.2, public h = 0.75, pos: P3 = [0, 1.3, 0], yaw = 0, stand = true, bezel = "#20242c") {
    this.cv.width = 1280; this.cv.height = Math.round(1280 * (h / w));
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false }));
    face.position.z = 0.031; face.layers.set(NOINK);
    this.group.add(mesh(box(w + 0.06, h + 0.06, 0.05), col("bezel" + bezel, bezel), [0, 0, 0]), face);
    if (stand) this.group.add(mesh(box(0.08, 0.35, 0.06), col("stand", "#3a3d45"), [0, -h / 2 - 0.17, -0.03]), mesh(box(0.4, 0.03, 0.25), col("stand", "#3a3d45"), [0, -h / 2 - 0.34, 0]));
    this.group.position.set(...pos); this.group.rotation.y = yaw;
  }
  /** redraw only when `key` changes (cheap per frame) */
  show(key: string, draw: (g: CanvasRenderingContext2D, W: number, H: number) => void) {
    if (key === this.key) return;
    this.key = key;
    const g = this.cv.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.cv.width, this.cv.height);
    draw(g, this.cv.width, this.cv.height);
    this.tex.needsUpdate = true;
  }
}

// ---------------- screen contents ----------------
/** terminal typing `lines` (prompt lines start with "$ "), `chars` characters revealed so far, blinking cursor */
export const terminal = (lines: string[], chars: number, t = 0, accent = "#88D445") => (g: CanvasRenderingContext2D, W: number, H: number) => {
  g.fillStyle = "#0f1218"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#1c212b"; g.fillRect(0, 0, W, 54);
  for (const [i, c] of ["#ff5f57", "#febc2e", "#28c840"].entries()) { g.fillStyle = c; g.beginPath(); g.arc(30 + i * 30, 27, 9, 0, 7); g.fill(); }
  const px = Math.round(H / 16); g.font = FONT(px); let left = chars, y = 54 + px * 1.6;
  for (const raw of lines) {
    if (left <= 0) break;
    const isCmd = raw.startsWith("$ "), body = isCmd ? raw.slice(2) : raw, show = body.slice(0, Math.max(0, left));
    let x = 28;
    if (isCmd) { g.fillStyle = accent; g.fillText(PROMPT, x, y); x += g.measureText(PROMPT + " ").width; }
    g.fillStyle = isCmd ? "#e8ecf2" : "#9aa6b8"; g.fillText(show, x, y);
    left -= body.length;
    if (left <= 0 && Math.floor(t * 2) % 2 === 0) { g.fillStyle = "#e8ecf2"; g.fillRect(x + g.measureText(show).width + 4, y - px * 0.8, px * 0.55, px); }
    y += px * 1.35;
  }
};
/** code editor with line numbers, keyword colouring and one highlighted line */
export const code = (lines: string[], hl = -1, accent = "#88D445") => (g: CanvasRenderingContext2D, W: number, H: number) => {
  g.fillStyle = "#151924"; g.fillRect(0, 0, W, H);
  const px = Math.round(H / 18); g.font = FONT(px, 500);
  lines.forEach((ln, i) => {
    const y = 40 + (i + 1) * px * 1.4;
    if (i === hl) { g.fillStyle = "rgba(136,212,69,0.16)"; g.fillRect(0, y - px * 1.05, W, px * 1.4); g.fillStyle = accent; g.fillRect(0, y - px * 1.05, 6, px * 1.4); }
    g.fillStyle = "#4b5468"; g.fillText(String(i + 1).padStart(2, " "), 18, y);
    let x = 18 + px * 2.2;
    for (const tok of ln.split(/(\s+)/)) {
      g.fillStyle = /^(def|class|return|import|from|if|for|const|let|function|async|await|export)$/.test(tok) ? "#c792ea"
        : /^["'].*["']$/.test(tok) ? "#c3e88d" : /^\d+(\.\d+)?%?$/.test(tok) ? "#f78c6c" : tok.startsWith("#") || tok.startsWith("//") ? "#5c6680" : "#e1e6ef";
      g.fillText(tok, x, y); x += g.measureText(tok).width;
    }
  });
};
/** an app screenshot (Episode.images name), letterboxed on the app background colour */
export const shot = (name: string, bg = "#f4f1ea") => (g: CanvasRenderingContext2D, W: number, H: number) => {
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const im = IMAGES.get(name); if (!im) return;
  const k = Math.min(W / im.width, H / im.height), w = im.width * k, h = im.height * k;
  g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
};
/** a simple mock app window when no screenshot exists: sidebar, header, cards (no text that could be mistaken for real data) */
export const mockApp = (accent: string, title = "") => (g: CanvasRenderingContext2D, W: number, H: number) => {
  g.fillStyle = "#f7f5f0"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#1d2230"; g.fillRect(0, 0, W * 0.2, H);
  for (let i = 0; i < 6; i++) { g.fillStyle = i === 1 ? accent : "#3a4152"; g.fillRect(24, 90 + i * 64, W * 0.2 - 48, 30); }
  g.fillStyle = "#1d2230"; g.font = FONT(Math.round(H / 14), 700); g.fillText(title, W * 0.24, 70);
  for (let i = 0; i < 3; i++) { g.fillStyle = "#ffffff"; g.fillRect(W * 0.24 + i * W * 0.25, 120, W * 0.23, H * 0.3); g.fillStyle = accent; g.fillRect(W * 0.24 + i * W * 0.25, 120, W * 0.23, 8); }
  g.fillStyle = "#ffffff"; g.fillRect(W * 0.24, H * 0.55, W * 0.73, H * 0.38);
};
/** animated bar chart: values revealed with progress u 0..1 (pass only real, sourced numbers) */
export const bars = (items: { label: string; value: number; color: string }[], u: number, unit = "%", max = 100) => (g: CanvasRenderingContext2D, W: number, H: number) => {
  g.fillStyle = "#11151d"; g.fillRect(0, 0, W, H);
  const px = Math.round(H / 14), bw = (W - 120) / items.length;
  items.forEach((it, i) => {
    const e = 1 - (1 - Math.min(1, Math.max(0, u * 1.4 - i * 0.25))) ** 3, h = (H - 200) * (it.value / max) * e, x = 60 + i * bw + bw * 0.15;
    g.fillStyle = it.color; g.fillRect(x, H - 90 - h, bw * 0.7, h);
    g.fillStyle = "#e8ecf2"; g.font = FONT(px, 800); g.textAlign = "center";
    g.fillText(`${(it.value * e).toFixed(1)}${unit}`, x + bw * 0.35, H - 110 - h);
    g.font = FONT(Math.round(px * 0.7), 600); g.fillStyle = "#9aa6b8"; g.fillText(it.label, x + bw * 0.35, H - 40);
    g.textAlign = "left";
  });
};
/** before / after split with a sliding divider (u 0..1) */
export const split = (before: ReturnType<typeof mockApp>, after: ReturnType<typeof mockApp>, u: number) => (g: CanvasRenderingContext2D, W: number, H: number) => {
  before(g, W, H);
  const x = W * (1 - u);
  g.save(); g.beginPath(); g.rect(x, 0, W - x, H); g.clip(); after(g, W, H); g.restore();
  g.fillStyle = "#ffffff"; g.fillRect(x - 3, 0, 6, H);
};

/** a tech desk set: two monitors, laptop, mug, plant, wall with sticky notes. Returns the screens to drive. */
export const desk = (accent: string) => {
  const g = new THREE.Group();
  g.add(mesh(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2), col("dFloor", "#c9b79a"), [0, 0, 0], false));
  g.add(mesh(box(14, 4, 0.2), col("dWall", "#eae4f2"), [0, 2, -1.9], false));
  for (let i = 0; i < 8; i++) g.add(mesh(box(0.26, 0.26, 0.02), col("dnote" + (i % 3 ? "n" : accent), i % 3 ? "#f6e7a8" : accent), [-2.6 + (i % 4) * 0.36, 2.55 - Math.floor(i / 4) * 0.36, -1.78], false));
  g.add(mesh(box(3.6, 0.07, 0.9), col("dDesk", "#b47a4a"), [-0.1, 0.95, -1.15]), mesh(box(3.5, 0.92, 0.85), col("dDeskB", "#9c6638"), [-0.1, 0.46, -1.15]));
  const main = new Screen(1.15, 0.68, [-0.2, 1.5, -1.35], 0.05), side = new Screen(0.75, 0.47, [-1.3, 1.42, -1.25], 0.3);
  g.add(main.group, side.group);
  g.add(mesh(box(0.5, 0.02, 0.34), col("laptop", "#c3c7cf"), [0.75, 1.0, -0.95]));
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 14), col("mug", accent), [0.35, 1.05, -0.85]));
  return { group: g, main, side };
};
