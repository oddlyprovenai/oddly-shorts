// Sets for "The Ship That Failed Its Test" (Vasa): Otto's lab, a 1620s harbour quay with storybook houses and a
// gun pile, the seabed, a living room with a wobbly bookshelf, and a museum hall. The ship lives in "always" and
// is posed (or hidden) per shot by story.ts.
import * as THREE from "three";
import { Kit } from "../oddly-kit/build";
import { Sets } from "../oddly-kit/episode";
import { mesh, box, col, ground, water, house, lab, tree, cobbleMat, grassMat } from "../oddly-kit/props";
import { buildShip } from "./ship";

export const ACCENT = "#88D445";
export const QUAY_X = -15, QUAY_Y = 1.6;

export const buildSets = (kit: Kit): Sets => {
  // ---- lab ----
  const L = lab(ACCENT);
  // ---- harbour ----
  const H = new THREE.Group();
  const w = water(3000, 3000, [500, 0, 0]); H.add(w); H.userData.water = w;
  H.add(mesh(box(400, QUAY_Y + 3, 900), col("quayStone", "#a89a86"), [QUAY_X - 200, QUAY_Y / 2 - 1.5, 0]));
  H.add(ground(380, 900, cobbleMat(60), [QUAY_X - 190, QUAY_Y + 0.01, 0]));
  for (let i = 0; i < 18; i++) H.add(house(-34 - (i % 2) * 2, -130 + i * 15, 10 + (i % 3), 9, 9 + (i % 4) * 1.6, i, Math.PI / 2));
  for (let i = 0; i < 12; i++) H.add(house(-60, -100 + i * 18, 11, 9, 13 + (i % 3) * 2, i + 2, Math.PI / 2));
  for (let z = -40; z <= 40; z += 10) H.add(mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.0, 10), col("bollard", "#3a3d45"), [QUAY_X - 1, QUAY_Y + 0.5, z]));
  // a pile of new guns on the quay
  const gun = col("iron", "#2f3036");
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6 - r; c++) {
    const gl = new THREE.CylinderGeometry(0.28, 0.36, 3.0, 12); gl.rotateX(Math.PI / 2);
    H.add(mesh(gl, gun, [-22 + c * 0.75 + r * 0.37, QUAY_Y + 0.35 + r * 0.6, 10]));
  }
  // the far shore: low green hills with trees
  H.add(mesh(new THREE.SphereGeometry(260, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.12, 1), grassMat("#cfe3a0", 40), [700, 0, -100]));
  for (let i = 0; i < 16; i++) { const t = tree(kit, 520 + (i % 4) * 30, -260 + i * 34, 16 + (i % 3) * 4); if (t) { t.position.y = 12; H.add(t); } }
  // ---- seabed ----
  const S = new THREE.Group();
  S.add(ground(600, 600, col("sand", "#6f8a86"), [0, -30, 0]));
  for (let i = 0; i < 26; i++) {
    const r = new THREE.SphereGeometry(1 + (i % 4) * 0.8, 10, 8).scale(1, 0.55, 1);
    S.add(mesh(r, col("rock", "#4d5f62"), [-60 + ((i * 37) % 120), -30, -50 + ((i * 53) % 100)]));
  }
  // ---- living room with the wobbly bookshelf (shelf is posed by story.ts) ----
  const R = new THREE.Group();
  R.add(ground(10, 10, col("rFloor", "#b98a5a"), [0, 0, 0]), mesh(box(10, 4, 0.2), col("rWall", "#e7d7f0"), [0, 2, -0.9], false));
  const shelf = new THREE.Group(); shelf.name = "shelf";
  const wood = col("shelfWood", "#9c6638");
  shelf.add(mesh(box(0.08, 2.4, 0.4), wood, [-0.7, 1.2, 0]), mesh(box(0.08, 2.4, 0.4), wood, [0.7, 1.2, 0]));
  for (const y of [0.05, 0.8, 1.55, 2.35]) shelf.add(mesh(box(1.48, 0.06, 0.4), wood, [0, y, 0]));
  const BOOK = ["#c0392b", "#2e6db4", "#e5b02a", "#3c8f5a", "#7b5ac9", "#d9772e"];
  for (const [y, n] of [[0.08, 9], [0.83, 8], [1.58, 7], [2.38, 10]] as const) for (let i = 0; i < n; i++) {
    const hb = 0.42 + ((i * 7) % 5) * 0.05;
    const ci = (i + Math.round(y * 10)) % 6;
    shelf.add(mesh(box(0.11, hb, 0.3), col("book" + ci, BOOK[ci]), [-0.6 + i * 0.13, y + hb / 2, 0]));
  }
  shelf.position.set(0, 0, -0.4); R.add(shelf); R.userData.shelf = shelf;
  // ---- museum hall ----
  const M = new THREE.Group();
  M.add(ground(160, 160, col("mFloor", "#3c3a44"), [0, 0, 0]));
  for (const [x, z, sx, sz] of [[0, -70, 160, 1], [0, 70, 160, 1], [-70, 0, 1, 160], [70, 0, 1, 160]] as const) M.add(mesh(box(sx, 70, sz), col("mWall", "#2b3140"), [x, 35, z], false));
  M.add(mesh(box(160, 1, 160), col("mCeil", "#232836"), [0, 70, 0], false));
  for (const z of [-14, 0, 14]) M.add(mesh(box(3, 1.2, 9), col("cradle", "#54595f"), [0, 0.6, z]));
  for (let i = 0; i < 6; i++) M.add(mesh(box(6, 1, 0.6), col("rail", "#8a8f99"), [20, 0.5, -30 + i * 12]));
  // ---- the ship ----
  const ship = buildShip(); ship.name = "ship";
  const A = new THREE.Group(); A.add(ship); A.userData.ship = ship;
  return { lab: L, harbour: H, seabed: S, room: R, museum: M, always: A };
};
