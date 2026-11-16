// Sets for "The Horse That Could Count" (Clever Hans): Otto's lab, a cobbled courtyard ringed by storybook houses
// (fence, blackboard), a plank barn with a wooden screen, and a TV-quiz stage for the analogy.
import * as THREE from "three";
import { Kit } from "../oddly-kit/build";
import { Sets } from "../oddly-kit/episode";
import { mesh, box, col, ground, house, lab, tree, cobbleMat, grassMat } from "../oddly-kit/props";
import { lam } from "../oddly-kit/build";
import { ctex } from "../oddly-kit/paint";

export const ACCENT = "#88D445";
const chalk = () => ctex("chalkboard", 512, 384, (g, r) => {
  g.fillStyle = "#2f4a3a"; g.fillRect(0, 0, 512, 384);
  g.strokeStyle = "rgba(240,240,230,0.9)"; g.lineWidth = 7; g.lineCap = "round";
  // abstract chalk sums: strokes, plus signs, a clock face
  for (let row = 0; row < 3; row++) {
    const y = 80 + row * 110;
    for (let i = 0; i < 4; i++) { const x = 50 + i * 70; g.beginPath(); g.moveTo(x, y - 25); g.lineTo(x, y + 25); g.stroke(); }
    g.beginPath(); g.moveTo(330, y); g.lineTo(370, y); g.moveTo(350, y - 20); g.lineTo(350, y + 20); g.stroke();
  }
  g.beginPath(); g.arc(440, 130, 45, 0, Math.PI * 2); g.moveTo(440, 130); g.lineTo(440, 100); g.moveTo(440, 130); g.lineTo(465, 140); g.stroke();
});
const planks = () => ctex("barnPlanks", 512, 512, (g, r) => {
  g.fillStyle = "#a8743f"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) { g.fillStyle = `rgba(60,30,10,${0.25 + r() * 0.2})`; g.fillRect(x, 0, 5, 512); }
});

export const buildSets = (kit: Kit): Sets => {
  const L = lab(ACCENT);
  // ---- courtyard (horse at the origin, facing +x) ----
  const Y = new THREE.Group();
  Y.add(ground(600, 600, grassMat("#e8f0b0", 120), [0, -0.01, 0]), ground(60, 60, cobbleMat(20), [0, 0, 0]));
  for (let i = 0; i < 6; i++) Y.add(house(-25 + i * 10, -22, 9.5, 8, 10 + (i % 3) * 1.6, i, 0));
  for (let i = 0; i < 4; i++) Y.add(house(-26, -12 + i * 10, 9, 8, 9 + (i % 2) * 2, i + 1, Math.PI / 2));
  for (let i = 0; i < 4; i++) Y.add(house(26, -12 + i * 10, 9, 8, 9.5 + (i % 2) * 2, i + 2, -Math.PI / 2));
  const fence = col("fence", "#efe6cf");
  for (let x = -8; x <= 8; x += 1.2) Y.add(mesh(box(0.12, 1.0, 0.12), fence, [x, 0.5, 4.5]));
  Y.add(mesh(box(16.5, 0.12, 0.08), fence, [0, 0.85, 4.5]), mesh(box(16.5, 0.12, 0.08), fence, [0, 0.45, 4.5]));
  const board = new THREE.Group();
  board.add(mesh(box(2.0, 1.5, 0.08), lam("chalkM", () => ({ map: chalk() })), [0, 1.6, 0]), mesh(box(0.08, 2.4, 0.08), col("easel", "#7a4a22"), [-0.7, 1.2, -0.1]), mesh(box(0.08, 2.4, 0.08), col("easel", "#7a4a22"), [0.7, 1.2, -0.1]));
  board.position.set(-3.2, 0, -1.5); board.rotation.y = 0.35; Y.add(board);
  for (let i = 0; i < 10; i++) { const t = tree(kit, -40 + i * 9, -40 - (i % 3) * 6, 9 + (i % 3) * 2); if (t) Y.add(t); }
  // ---- barn (horse at the origin; a wooden screen at x = 2.2 can hide the questioner) ----
  const B = new THREE.Group(), pl = lam("barnPl", () => ({ map: planks() }));
  B.add(ground(20, 20, col("straw", "#d9be73"), [0, 0, 0]));
  B.add(mesh(box(20, 6, 0.3), pl, [0, 3, -4], false), mesh(box(0.3, 6, 20), pl, [-7, 3, 0], false), mesh(box(0.3, 6, 20), pl, [7, 3, 0], false));
  for (let i = 0; i < 4; i++) B.add(mesh(box(0.3, 6, 0.3), col("beam", "#7a4a22"), [-6 + i * 4, 3, -3.7], false));
  for (let i = 0; i < 5; i++) B.add(mesh(box(1.2, 0.7, 1.0), col("hay", "#e6c85a"), [-5.5 + (i % 3) * 1.3, 0.35 + Math.floor(i / 3) * 0.7, -3]));
  const screen = mesh(box(0.15, 2.3, 2.4), col("screen", "#c98a5a"), [2.4, 1.15, 0.4]); screen.name = "screen"; B.add(screen); B.userData.screen = screen;
  // ---- quiz stage ----
  const Q = new THREE.Group();
  Q.add(ground(20, 20, col("qFloor", "#2b2350"), [0, 0, 0]), mesh(box(20, 8, 0.3), col("qWall", "#3a2f6e"), [0, 4, -3], false));
  for (let i = 0; i < 9; i++) Q.add(mesh(new THREE.SphereGeometry(0.16, 10, 8), lam("bulb" + (i % 3), () => ({ color: ["#ffd84a", "#ff7ab8", "#6ee0ff"][i % 3], emissive: ["#ffb800", "#ff3d8a", "#28b8ff"][i % 3] })), [-4 + i, 3.6, -2.8], false));
  Q.add(mesh(box(1.2, 1.1, 0.7), col("podium", "#e2453c"), [-1.3, 0.55, 0.5]), mesh(box(1.2, 1.1, 0.7), col("podium2", "#2e6db4"), [1.4, 0.55, 0.5]));
  Q.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 16), lam("buzzer", () => ({ color: "#ff5a3a", emissive: "#661100" })), [1.4, 1.16, 0.5]));
  return { lab: L, yard: Y, barn: B, quiz: Q };
};
