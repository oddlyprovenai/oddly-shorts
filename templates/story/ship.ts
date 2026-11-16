// A generic 17th-century two-deck warship for the Vasa episode (no reproduction of the real ship's carvings):
// lofted hull with painted planks and a red upper band, two rows of gunports with red lids, stern castle, three
// masts with yards and cream sails, a pennant. Local frame: bow toward -z, waterline y = 0, keel ~ -4.5.
import * as THREE from "three";
import { lam } from "../oddly-kit/build";
import { ctex } from "../oddly-kit/paint";
import { mesh, box, col } from "../oddly-kit/props";

const ZB = -26, ZS = 22, NS = 40, NM = 24;
const hullAt = (z: number) => {
  const u = (z - (ZB + ZS) / 2) / ((ZS - ZB) / 2); // -1 bow .. +1 stern
  const w = 5.8 * Math.sqrt(Math.max(0.004, 1 - Math.max(0, -u) ** 2.2)) * (1 - 0.3 * Math.max(0, u) ** 2);
  const h = 5 + 1.4 * Math.max(0, -u) ** 2 + 2.6 * Math.max(0, u) ** 2;
  const k = 4.5 * (1 - 0.6 * Math.max(0, -u) ** 3);
  return { w, h, k };
};
const ring = (z: number, a: number) => { const { w, h, k } = hullAt(z); return [w * Math.sin(a), h - (h + k) * Math.cos(a) ** 1.6, z] as const; };
/** hull-side point (x) at height y on the starboard side of station z */
const sideX = (z: number, y: number) => {
  const { w, h, k } = hullAt(z); const c = Math.max(0, (h - y) / (h + k)) ** (1 / 1.6); return w * Math.sin(Math.acos(Math.min(1, c)));
};
const hullTex = () => ctex("vasaHull", 512, 1024, (g, r) => {
  g.fillStyle = "#74462a"; g.fillRect(0, 0, 512, 1024);
  for (let x = 0; x < 512; x += 16) { g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.08})`; g.fillRect(x, 0, 2, 1024); }
  for (const [a, b] of [[0, 34], [478, 512]]) { g.fillStyle = "#a3402e"; g.fillRect(a, 0, b - a, 1024); }
  g.fillStyle = "#d9a441"; g.fillRect(32, 0, 5, 1024); g.fillRect(475, 0, 5, 1024);
  g.fillStyle = "#3a2516"; g.fillRect(150, 0, 8, 1024); g.fillRect(354, 0, 8, 1024); // wales
});

export const buildShip = () => {
  const ship = new THREE.Group();
  // ---- lofted hull ----
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= NS; i++) {
    const z = ZB + ((ZS - ZB) * i) / NS;
    for (let j = 0; j <= NM; j++) { const a = -Math.PI / 2 + (Math.PI * j) / NM; pos.push(...ring(z, a)); uv.push(j / NM, i / NS); }
  }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NM; j++) {
    const p = i * (NM + 1) + j, q = p + NM + 1;
    idx.push(p, p + 1, q, p + 1, q + 1, q);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const hullM = lam("vasaHullM", () => ({ map: hullTex(), side: THREE.DoubleSide }));
  ship.add(mesh(g, hullM, [0, 0, 0]));
  // deck (planks colour) and transom
  const deck: number[] = [], di: number[] = [];
  for (let i = 0; i <= NS; i++) { const z = ZB + ((ZS - ZB) * i) / NS, { w, h } = hullAt(z); deck.push(-w * 0.97, h - 0.35, z, w * 0.97, h - 0.35, z); }
  for (let i = 0; i < NS; i++) { const p = 2 * i; di.push(p, p + 2, p + 1, p + 1, p + 2, p + 3); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.Float32BufferAttribute(deck, 3)); dg.setIndex(di); dg.computeVertexNormals();
  ship.add(mesh(dg, lam("vasaDeck", () => ({ color: "#c79a62", side: THREE.DoubleSide })), [0, 0, 0]));
  const st = hullAt(ZS);
  ship.add(mesh(box(st.w * 2, st.h + st.k, 0.3), col("vasaTransom", "#a3402e"), [0, (st.h - st.k) / 2, ZS + 0.1]));
  // stern castle + bow beak
  ship.add(mesh(box(7.2, 4.2, 6), col("vasaCastle", "#a3402e"), [0, st.h + 1.8, ZS - 3.2]));
  ship.add(mesh(box(7.6, 0.4, 6.4), col("vasaGold", "#d9a441"), [0, st.h + 4.0, ZS - 3.2]));
  for (const x of [-2.4, 0, 2.4]) ship.add(mesh(box(1.0, 1.4, 0.15), col("vasaWin", "#2a1a12"), [x, st.h + 2.0, ZS - 0.12]));
  const beak = new THREE.ConeGeometry(0.9, 7, 8); beak.rotateX(-Math.PI / 2 - 0.25);
  ship.add(mesh(beak, col("vasaGold", "#d9a441"), [0, 4.2, ZB - 2.5]));
  // two rows of gunports (dark openings + red lids), both sides
  const port = col("vasaPort", "#22150d"), lid = col("vasaLid", "#b8402e");
  for (const y of [1.5, 3.4]) for (let z = -18; z <= 14; z += 3.2) for (const s of [-1, 1]) {
    const x = sideX(z, y) * s;
    const o = mesh(box(0.2, 0.9, 1.0), port, [x + s * 0.05, y, z]); ship.add(o);
    const l = mesh(box(0.12, 0.9, 1.0), lid, [x + s * 0.45, y + 0.65, z]); l.rotation.z = s * 0.9; ship.add(l);
  }
  // masts, yards, sails, pennant
  const wood = col("vasaMast", "#6b4a2e"), sail = lam("vasaSail", () => ({ color: "#efe6cf", side: THREE.DoubleSide }));
  for (const [z, H] of [[-13, 44], [0, 50], [12, 34]] as const) {
    ship.add(mesh(new THREE.CylinderGeometry(0.35, 0.55, H, 10), wood, [0, 5 + H / 2, z]));
    for (const [y, W] of [[0.42, 1], [0.72, 0.75]] as const) {
      ship.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 16 * W, 8).rotateZ(Math.PI / 2), wood, [0, 5 + H * y, z - 0.4]));
      const sp = new THREE.PlaneGeometry(14.5 * W, H * 0.24, 6, 4);
      const pa = sp.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < pa.count; v++) pa.setZ(v, -0.9 * Math.cos((pa.getX(v) / (7.2 * W)) * Math.PI / 2)); // billow
      sp.computeVertexNormals();
      ship.add(mesh(sp, sail, [0, 5 + H * y - H * 0.13, z - 0.5]));
    }
  }
  const pen = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.8), lam("vasaPennant", () => ({ color: "#2f6db4", side: THREE.DoubleSide })));
  pen.position.set(0, 55.5, 2); pen.rotation.y = Math.PI / 2; ship.add(pen);
  return ship;
};
