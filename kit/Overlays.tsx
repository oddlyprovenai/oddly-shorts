// 2D overlays drawn over the 3D picture for ads: big number reveals (before -> after), lower thirds, the end card
// with the call to action, and optional safe-zone guides for review stills (inputProps { post: { guides: true } }).
// All text sits inside the 9:16 safe area: 8 % sides, clear of the top 12 % and the bottom 20 % (TikTok/Shorts/Reels UI).
import React from "react";
import { AbsoluteFill, getInputProps, interpolate, useCurrentFrame } from "remotion";
import { FPS } from "./episode";

export type Overlay =
  | { kind: "number"; from: number; to: number; before: string; after: string; label: string; note?: string }
  | { kind: "lower"; from: number; to: number; title: string; sub?: string }
  | { kind: "end"; from: number; title: string; lines: string[]; handle?: string };

const ROUND = '"OddRound", "Arial Rounded MT Bold", "Montserrat", sans-serif';
const STROKE = { WebkitTextStroke: "12px #0E1116", paintOrder: "stroke fill" } as const;
const ease = (u: number) => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3;

export const Overlays: React.FC<{ items: Overlay[]; accent: string }> = ({ items, accent }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const guides = !!(getInputProps() as { post?: { guides?: boolean } }).post?.guides;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {items.map((o, i) => {
        if (o.kind === "number" && t >= o.from && t < o.to) {
          const u = ease((t - o.from) / 0.5), v = ease((t - o.from - 0.7) / 0.5), out = 1 - ease((t - o.to + 0.3) / 0.3);
          return (
            <div key={i} style={{ position: "absolute", top: "16%", left: "8%", width: "84%", textAlign: "center", opacity: out, fontFamily: ROUND, color: "#fff" }}>
              <div style={{ fontSize: 54, ...STROKE, opacity: u }}>{o.label}</div>
              <div style={{ fontSize: 118, fontWeight: 700, lineHeight: 1.05, transform: `scale(${0.8 + 0.2 * u})`, ...STROKE, WebkitTextStroke: "18px #0E1116" }}>
                <span style={{ opacity: u }}>{o.before}</span>
                <span style={{ opacity: v, color: accent }}>{" → "}{o.after}</span>
              </div>
              {o.note && <div style={{ fontSize: 40, marginTop: 8, opacity: v, ...STROKE, WebkitTextStroke: "10px #0E1116" }}>{o.note}</div>}
            </div>
          );
        }
        if (o.kind === "lower" && t >= o.from && t < o.to) {
          const u = ease((t - o.from) / 0.35), out = 1 - ease((t - o.to + 0.3) / 0.3);
          return (
            <div key={i} style={{ position: "absolute", top: "13%", left: "8%", transform: `translateX(${(1 - u) * -60}px)`, opacity: u * out,
              background: "#0E1116", borderLeft: `14px solid ${accent}`, borderRadius: 18, padding: "18px 28px", fontFamily: ROUND, color: "#fff" }}>
              <div style={{ fontSize: 52, fontWeight: 700 }}>{o.title}</div>
              {o.sub && <div style={{ fontSize: 34, color: "#c9d1dc" }}>{o.sub}</div>}
            </div>
          );
        }
        if (o.kind === "end" && t >= o.from) {
          const u = ease((t - o.from) / 0.5);
          return (
            <AbsoluteFill key={i} style={{ alignItems: "center", fontFamily: ROUND, color: "#fff" }}>
              {/* a panel in the upper half: the host stays visible (and bright) below it */}
              <div style={{ position: "absolute", top: "13%", width: "84%", textAlign: "center", transform: `translateY(${(1 - u) * 40}px)`, opacity: u,
                background: "rgba(14,17,22,0.88)", borderRadius: 40, padding: "40px 34px 46px", borderTop: `12px solid ${accent}` }}>
                <div style={{ fontSize: 96, fontWeight: 700, color: accent, lineHeight: 1.05 }}>{o.title}</div>
                {o.lines.map((l, k) => <div key={k} style={{ fontSize: 50, marginTop: 26, lineHeight: 1.2, opacity: ease((t - o.from - 0.3 - 0.25 * k) / 0.4) }}>{l}</div>)}
                {o.handle && <div style={{ fontSize: 46, marginTop: 44, color: "#c9d1dc" }}>{o.handle}</div>}
              </div>
            </AbsoluteFill>
          );
        }
        return null;
      })}
      {guides && (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "12%", background: "rgba(255,0,0,0.18)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "20%", background: "rgba(255,0,0,0.18)" }} />
          <div style={{ position: "absolute", right: 0, top: "40%", width: "14%", height: "40%", background: "rgba(255,128,0,0.18)" }} />
          <div style={{ position: "absolute", left: "8%", right: "8%", top: "55%", height: "17%", border: "4px dashed rgba(0,200,255,0.8)" }} />
        </>
      )}
    </AbsoluteFill>
  );
};
export const fadeIn = (t: number, a: number, d = 0.4) => interpolate(t, [a, a + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
