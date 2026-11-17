// reel-edit · the finished vertical short from an edited clip: per-clip framing (keeps devices/logos out of shot),
// subtle punch-in alternating 100 % / 112 % every 3-4 s, light film grain (no colour filter, no skin smoothing),
// word-by-word captions under the face and out of the bottom 20 %, 1.5 s lab-card cutaways, an "AI-generated" tag
// in the first 3 s, a 1.5 s end card, and an optional on-screen hook text (hook variants). Props come from
// reel-edit/scripts/build_props.py.
import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, staticFile, useCurrentFrame, interpolate, random } from "remotion";

export type ReelCaption = { words: string[]; key: number; start: number; end: number };
export type ReelProps = {
  video: string; audio: string; fps: number; duration: number; voiceEnd: number; accent: string;
  clips: { start: number; end: number; zoom: number; ox: number; oy: number }[];
  punch: number[];                               // edit-time seconds where the punch-in toggles
  captions: ReelCaption[];
  cards: { from: number; dur: number; text: string; sub?: string }[];
  end: { title: string; line: string };
  hook?: { text: string; until: number } | null;
};
const SANS = '"Montserrat", "Arial Black", "Helvetica Neue", sans-serif';
const MONO = '"SF Mono", Menlo, "DejaVu Sans Mono", monospace';
const FONT = `@font-face { font-family: "Montserrat"; src: url("${staticFile("comun/fuentes/Montserrat-Variable.ttf")}"); font-weight: 100 900; }`;

const Grain: React.FC<{ seed: number }> = ({ seed }) => (
  <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.07, mixBlendMode: "overlay" }}>
    <svg width="100%" height="100%"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} /></filter>
      <rect width="100%" height="100%" filter="url(#g)" /></svg>
  </AbsoluteFill>
);

export const ReelEdit: React.FC<ReelProps> = (p) => {
  const f = useCurrentFrame(), t = f / p.fps;
  const clip = p.clips.find((c) => t >= c.start && t < c.end) ?? p.clips[p.clips.length - 1];
  const k = p.punch.filter((x) => t >= x).length, punch = k % 2 ? 1.12 : 1.0;
  const last = Math.max(0, ...p.punch.filter((x) => t >= x)), ease = interpolate(t - last, [0, 0.35], [k % 2 ? 1.0 : 1.12, punch], { extrapolateRight: "clamp" });
  const z = clip.zoom * ease;
  const card = p.cards.find((c) => t >= c.from && t < c.from + c.dur);
  const cap = p.captions.find((c) => t >= c.start && t < c.end);
  const ending = t >= p.voiceEnd;
  return (
    <AbsoluteFill style={{ background: "#0E1116" }}>
      <style>{FONT}</style>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <OffthreadVideo src={staticFile(p.video)} muted style={{ width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${z})`, transformOrigin: `${clip.ox * 100}% ${clip.oy * 100}%` }} />
      </AbsoluteFill>
      <Audio src={staticFile(p.audio)} />
      <Grain seed={Math.floor(random(f) * 1000)} />
      {card && (
        <AbsoluteFill style={{ background: "#0E1116", alignItems: "center", justifyContent: "center" }}>
          <div style={{ border: `3px solid ${p.accent}`, borderRadius: 28, padding: "56px 60px", width: "78%", textAlign: "center",
            opacity: interpolate(t - card.from, [0, 0.15], [0, 1], { extrapolateRight: "clamp" }),
            transform: `scale(${interpolate(t - card.from, [0, card.dur], [0.96, 1.04])})` /* slow push: a card is never a frozen frame */ }}>
            <div style={{ fontFamily: MONO, color: p.accent, fontSize: 30, letterSpacing: 4, marginBottom: 22 }}>LAB CARD</div>
            <div style={{ fontFamily: MONO, color: "#f4f6f8", fontSize: 64, fontWeight: 700, lineHeight: 1.2 }}>{card.text}</div>
            {card.sub && <div style={{ fontFamily: MONO, color: "#9aa6b8", fontSize: 30, marginTop: 20 }}>{card.sub}</div>}
          </div>
        </AbsoluteFill>
      )}
      {p.hook && t < p.hook.until && !card && (
        <div style={{ position: "absolute", top: "8%", left: "8%", width: "84%", textAlign: "center", fontFamily: SANS, fontWeight: 900,
          fontSize: 66, lineHeight: 1.1, color: "#fff", WebkitTextStroke: "12px #0E1116", paintOrder: "stroke fill" }}>{p.hook.text}</div>
      )}
      {t < 3 && (
        <div style={{ position: "absolute", top: p.hook && t < p.hook.until ? "22%" : "5.5%", right: "6%", background: "rgba(14,17,22,0.72)", color: "#e8ecf2",
          fontFamily: SANS, fontWeight: 700, fontSize: 26, padding: "8px 16px", borderRadius: 999 }}>AI-generated</div>
      )}
      {cap && !card && !ending && (
        <div style={{ position: "absolute", top: "61%", height: "14%", left: "6%", width: "88%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: cap.words.join(" ").length > 12 ? 96 : 116, color: "#fff", textTransform: "uppercase",
            WebkitTextStroke: "16px #0E1116", paintOrder: "stroke fill", textAlign: "center", letterSpacing: 1,
            transform: `scale(${interpolate(f - Math.round(cap.start * p.fps), [0, 3], [0.9, 1], { extrapolateRight: "clamp" })})` }}>
            {cap.words.map((w, i) => <span key={i} style={{ color: i === cap.key ? p.accent : "#fff" }}>{w}{i < cap.words.length - 1 ? " " : ""}</span>)}
          </div>
        </div>
      )}
      {ending && (
        <AbsoluteFill style={{ background: `rgba(14,17,22,${interpolate(t - p.voiceEnd, [0, 0.25], [0, 0.9], { extrapolateRight: "clamp" })})`, alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", fontFamily: SANS, color: "#fff" }}>
            <div style={{ fontSize: 92, fontWeight: 900, color: p.accent }}>{p.end.title}</div>
            <div style={{ fontSize: 48, fontWeight: 700, marginTop: 24 }}>{p.end.line}</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
