// Head / shoulder anchored overlays for the 3D host (same library as the reel editor, kit/anchored/*): the host's head
// is projected through the shot camera every frame, so a counter, bar, padlock or receipt pops above the head or
// beside a shoulder and follows the camera moves. Never on the face, never in the bottom 20 %, clear of subtitles.
//   ep.anchoredAt = (id, f) => ({ head: [x, y, z], r: 0.32 })   // world-space head centre + head radius (Marc ~0.3)
//   ep.anchored  = [{ kind: "bar", from: 3.2, dur: 3, anchor: "rshoulder", d: { ... } }]   // times in seconds
import React from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { Episode, FPS, V3, camAt, layersAt } from "./episode";
import { place, Rect, W, H } from "./anchored/anchors";
import { KINDS, OverlayBody } from "./anchored/overlays";
import { Motion } from "./anchored/fx";

const cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 1500), v = new THREE.Vector3();
const toPx = (p: V3) => { v.set(...p).project(cam); return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H] as const; };

/** screen rect of the host's face (head sphere of radius r around `head`) for shot `id` at frame f */
export const faceRect = (ep: Episode, id: number, f: number, head: V3, r: number): Rect => {
  const c = camAt(ep, id, f);
  cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll); cam.fov = c.fov;
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const [cx, cy] = toPx(head), [, ty] = toPx([head[0], head[1] + r, head[2]]), rad = Math.abs(cy - ty);
  return { x: cx - rad, y: cy - rad, w: 2 * rad, h: 2 * rad };
};

export const Anchored: React.FC<{ ep: Episode }> = ({ ep }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const live = (ep.anchored ?? []).filter((o) => t >= o.from && t < o.from + o.dur);
  if (!live.length || !ep.anchoredAt) return null;
  const id = layersAt(ep, f)[0].id, a = ep.anchoredAt(id, f);
  if (!a) return null;
  const face = faceRect(ep, id, f, a.head, a.r);
  const subs: Rect[] = [{ x: W * 0.06, y: H * 0.62, w: W * 0.88, h: H * 0.14 }];   // the kit's subtitle band
  return (
    <>
      {live.map((o, i) => {
        const K = KINDS[o.kind]; if (!K) return null;
        const r = place(face, K.w, K.h, o.anchor, subs);
        return (
          <div key={i} style={{ position: "absolute", left: r.x, top: r.y, width: K.w, height: K.h, transform: `scale(${r.s})`, transformOrigin: "0 0" }}>
            <Motion l={t - o.from} dur={o.dur}><OverlayBody ov={o} l={t - o.from} accent={ep.accent} /></Motion>
          </div>
        );
      })}
    </>
  );
};
