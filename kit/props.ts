// Set-building helpers for episodes: two-tone meshes (lam), ground planes with painted textures, water, simple
// storybook houses with gable roofs, trees from build.ts cartoon vegetation, and the lab set where Otto closes
// every episode (desk, notebook wall, window) so the ending looks the same each day.
import * as THREE from "three";
import { lam, kitClone, Kit } from "./build";
import { ctex, rep, grassHD, cobbleHD, facadeHD, roofHD } from "./paint";
import { NOINK } from "./ink";

export type P3 = [number, number, number];
export const mesh = (g: THREE.BufferGeometry, m: THREE.Material, p: P3, shadow = true) => {
  const o = new THREE.Mesh(g, m); o.position.set(...p); o.castShadow = shadow; o.receiveShadow = true; return o;
};
export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const col = (key: string, c: string) => lam(key, () => ({ color: c }));
export const ground = (w: number, d: number, m: THREE.Material, p: P3) => {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); return mesh(g, m, p, false);
};
export const grassMat = (tint = "#ffffff", tile = 160) => lam("grass" + tint + tile, () => ({ map: rep(grassHD(), tile, tile), color: tint }));
export const cobbleMat = (tile = 20) => lam("cobble" + tile, () => ({ map: rep(cobbleHD(), tile, tile) }));
export const tree = (kit: Kit, x: number, z: number, h: number, kind = "tree_oak") => { const t = kitClone(kit, kind, h); if (t) t.position.set(x, 0, z); return t; };

const waterTex = (deep: string, light: string) => ctex("water" + deep + light, 512, 512, (g, r) => {
  g.fillStyle = deep; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = light; g.lineCap = "round";
  for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() * 512, w = 20 + r() * 50; g.lineWidth = 3 + r() * 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 6, x + w, y); g.stroke(); }
});
/** flat painted water; its texture scrolls with water.userData.tex.offset */
export const water = (w: number, d: number, p: P3, deep = "#1d6fa6", light = "#7fd3ea") => {
  const tex = rep(waterTex(deep, light), w / 24, d / 24);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), lam("water" + deep + w, () => ({ map: tex })));
  m.position.set(...p); m.receiveShadow = true; m.userData.tex = tex; return m;
};

const STY = [{ wall: "#e9dcc0", shutter: "#3f6fb5" }, { wall: "#c98a5a", shutter: "#2f5f6a" }, { wall: "#d9b86a", shutter: "#8c3b4a" }, { wall: "#f1ece0", shutter: "#5d7a3a" }];
const ROOFS = ["#a2483a", "#6b5a8a", "#7d4a32", "#3f5a6e"];
/** storybook house: painted facade on the front (+z), gable roof; base centred at (x, 0, z), turned by yaw */
export const house = (x: number, z: number, w: number, d: number, h: number, i: number, yaw = 0) => {
  const g = new THREE.Group(), s = STY[i % 4];
  const front = lam(`fac${i % 4}_${w}_${h}`, () => ({ map: facadeHD(`facade${i % 4}_${w}_${h}`, w, h, { ...s, door: true }) }));
  const side = col("wall" + s.wall, s.wall);
  g.add(mesh(box(w, h, d), [side, side, side, side, front, side] as unknown as THREE.Material, [0, h / 2, 0]));
  const roof = new THREE.CylinderGeometry(w * 0.62, w * 0.62, d + 0.6, 3, 1); roof.rotateX(Math.PI / 2); roof.rotateZ(Math.PI); roof.scale(1, 0.75, 1);
  g.add(mesh(roof, lam("roof" + i % 4, () => ({ map: roofHD(ROOFS[i % 4]) })), [0, h + w * 0.23, 0]));
  g.add(mesh(box(0.7, 1.6, 0.7), col("chimney", "#8a5a4a"), [w * 0.25, h + w * 0.35, -d * 0.2]));
  g.position.set(x, 0, z); g.rotation.y = yaw; return g;
};

/** Otto's lab corner (local frame: Otto stands at the origin facing +z toward the lens) */
export const lab = (accent: string) => {
  const g = new THREE.Group();
  g.add(ground(12, 12, col("labFloor", "#c9b79a"), [0, 0, 0]));
  g.add(mesh(box(12, 4, 0.2), col("labWall", "#f3eadb"), [0, 2, -2.2], false));
  g.add(mesh(box(1.8, 1.1, 0.08), lam("labWin", () => ({ color: "#bfe3f5", emissive: "#4d7a94" })), [1.6, 2.3, -2.08], false));
  g.add(mesh(box(2.6, 0.08, 1.0), col("labDesk", "#b47a4a"), [-1.6, 0.95, -1.4]), mesh(box(2.5, 0.9, 0.9), col("labDeskBody", "#9c6638"), [-1.6, 0.47, -1.4]));
  g.add(mesh(box(0.9, 0.6, 0.06), col("labScreen", "#1d2230"), [-1.9, 1.35, -1.7]), mesh(box(0.08, 0.3, 0.08), col("labStand", "#3a3d45"), [-1.9, 1.08, -1.7]));
  // sticky notes on the wall in the accent colour + neutral cards
  for (let i = 0; i < 7; i++) g.add(mesh(box(0.28, 0.28, 0.02), col("note" + (i % 3 ? "n" : accent), i % 3 ? "#f6e7a8" : accent), [-0.3 + (i % 4) * 0.42, 2.3 - Math.floor(i / 4) * 0.42, -2.08], false));
  g.add(mesh(box(0.6, 1.0, 0.6), col("labSide", "#b47a4a"), [0.62, 0.5, -0.75])); // side table: the project cameo stands here
  const plant = new THREE.CylinderGeometry(0.16, 0.12, 0.25, 12);
  g.add(mesh(plant, col("pot", "#c2603a"), [-0.6, 1.11, -1.2]));
  return g;
};
export { NOINK };
