// Oddly Proven kit renderer (from the cartoon-3d-short skill's bridge renderer), shared by every episode: in the flat-characters-in-a-3D-toon-world style.
// One three.js world (world.ts) posed per frame from the story timeline (story.ts). Post chain (look-match pass):
//   InkPass (world ink lines, own pass) -> lens blur pre + main (thin-lens DOF per shot from dofAt) ->
//   [bloom (emissive only) + NEUTRAL tone mapping + colour grade] (one merged EffectPass), MSAA 4.
// Ink runs before the DOF so lines blur with what they belong to; bloom after the DOF so glows defocus with their
// source; the grade is display-referred, so it comes after tone mapping. Every pixel-sized parameter is specified at
// 1080x1920 and scaled with the output size, so stills at --scale 0.5 and the 1440x2560 final match.
// Place changes crossfade by stacking a second canvas for the fade frames; the hook ends on a 4-frame white flash.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { KitWorld } from "./world";
import { Episode, layersAt, dofAt } from "./episode";
import { Subtitles } from "./Subtitles";
import { Overlays } from "./Overlays";
import { Anchored } from "./Anchored";
import { IMAGES } from "./screens";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur, GrainEffect } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { Kit } from "./build";

/** A/B switches for test stills only (Remotion inputProps `{ post: { ink: false, ... } }`); everything is on by default. */
type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** Bloom for emissive sources only (depth.md 6.4). Its MIP chain always starts at 540x960 (half of 1080x1920),
 *  whatever the output size, so the glow keeps the same size relative to the frame (e-fold ~30 px at 1080p,
 *  ~1.5 % of the frame height) at 540, 1080 and 1440 widths. ADD blend: HDR-safe (SCREEN darkens values > 1). */
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const EMPTY_KIT: Kit = {}; // no Kenney GLBs: trees come from build.ts cartoon vegetation
const useKit = () => EMPTY_KIT;

const Inner: React.FC<{ ep: Episode; id: number; kit: Kit }> = ({ ep, id, kit }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new KitWorld(ep, kit), [ep, kit]);
  const target = useMemo(() => new THREE.Vector3(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
    grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }), // film grain, OFF by default (inputProps post.grain): the reference measures no grain and it quadruples the file size
  }), [camera, scene]);
  useEffect(() => () => { try { (fx.ink as { dispose?: () => void }).dispose?.(); } catch { /* composer already disposed it */ } }, [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      {[
        on.ink ? <primitive key="ink" object={fx.ink} dispose={null} /> : null,
        on.lens && on.pre ? <primitive key="pre" object={fx.lens.pre} dispose={null} /> : null,
        on.lens ? <primitive key="lens" object={fx.lens.main} dispose={null} /> : null,
        on.bloom ? <primitive key="bloom" object={fx.bloom} dispose={null} /> : null,
        <primitive key="tone" object={fx.tone} dispose={null} />,
        on.grade ? <primitive key="grade" object={fx.grade} dispose={null} /> : null,
        on.grain ? <primitive key="grain" object={fx.grain} dispose={null} /> : null,
      ].filter((x): x is JSX.Element => x !== null)}
    </EffectComposer>
  ), [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene));
  noInkFallback(world.root);
  // thin-lens focus: distance along the view axis to the shot's focus point (default: the camera's look target)
  const d = dofAt(ep, f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, ep.shots[id - 1].light);
  fx.grain.seed = f; // deterministic per frame
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

/** test stills only: inputProps `{ post: { dpr: 0.5 } }` forces the WebGL buffer size (R3F clamps dpr to >= 1 by default) */
const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ ep: Episode; id: number; kit: Kit; alpha: number }> = ({ ep, id, kit, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.2, far: 1500 }}>
      <Inner ep={ep} id={id} kit={kit} />
    </ThreeCanvas>
  </AbsoluteFill>
);

/** preload screenshots for screen inserts (Episode.images) into screens.ts IMAGES before the first frame */
const useImages = (imgs?: Record<string, string>) => {
  const [ok, setOk] = React.useState(!imgs || Object.keys(imgs).every((k) => IMAGES.has(k)));
  React.useEffect(() => {
    if (ok || !imgs) return;
    const h = delayRender("screenshots");
    Promise.all(Object.entries(imgs).map(([k, src]) => new Promise<void>((res) => {
      const im = new Image(); im.onload = () => { IMAGES.set(k, im); res(); }; im.onerror = () => res(); im.src = staticFile(src);
    }))).then(() => { setOk(true); continueRender(h); });
  }, [imgs, ok]);
  return ok;
};

/** the full short for one episode: shot layers (crossfades), the white flash after the hook, burned-in subtitles */
export const makeShort = (ep: Episode): React.FC => {
  const C: React.FC = () => {
    const f = useCurrentFrame();
    const kit = useKit();
    const ready = useImages(ep.images);
    if (!ready) return null;
    const end = ep.overlays?.find((o) => o.kind === "end");
    const flash = f >= ep.flashAt && f < ep.flashAt + 4 ? [1, 0.75, 0.45, 0.2][f - ep.flashAt] : 0;
    return (
      <AbsoluteFill style={{ background: "#cfe3f2" }}>
        {layersAt(ep, f).map((l, i) => <ShotView key={i ? "over" : "base"} ep={ep} id={l.id} kit={kit} alpha={l.alpha} />)}
        {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
        <Overlays items={ep.overlays ?? []} accent={ep.accent} />
        <Anchored ep={ep} />
        <Subtitles captions={ep.captions} accent={ep.accent} style={ep.subStyle} hideFrom={end?.from} />
      </AbsoluteFill>
    );
  };
  return C;
};
