// Word-synced burned-in subtitles (on by default). Cards of 1-3 words from captions.json (tools/voice.py), bold
// rounded sans, white with a #0E1116 outline, placed inside the selected platform's safe band (kit/safezones.ts:
// "tiktok", "youtube-shorts", "reels", "x", or default "universal"). Styles:
//   "pop"      the card pops in, the key word (marked *word* in the script) takes the accent colour
//   "karaoke"  words light up in the accent colour as they are spoken (per-word times written by voice.py)
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, FPS } from "./episode";
import { PlatformPreset, resolveSafeZone } from "./safezones";

const FONT = `@font-face { font-family: "OddRound"; src: local("Arial Rounded MT Bold"), local("ArialRoundedMTBold"); font-weight: 700; }`;
export type SubStyle = "pop" | "karaoke";

export const Subtitles: React.FC<{
  captions: Caption[];
  accent: string;
  style?: SubStyle;
  hideFrom?: number;
  platform?: PlatformPreset;
}> = ({ captions, accent, style = "pop", hideFrom, platform }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const zone = resolveSafeZone(platform);
  const c = captions.find((k) => t >= k.start && t < k.end);
  if (!c || (hideFrom !== undefined && t >= hideFrom)) return <style>{FONT}</style>;
  const age = f - Math.round(c.start * FPS), pop = Math.min(1, age / 4), s = style === "pop" ? 0.86 + 0.14 * (1 - (1 - pop) ** 3) : 1;
  const long = c.words.join(" ").length > 16;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <style>{FONT}</style>
      <div style={{
        position: "absolute",
        left: `${zone.subLeftPct}%`,
        width: `${zone.subWidthPct}%`,
        top: `${zone.subTopPct}%`,
        height: `${zone.subHeightPct}%`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          transform: `scale(${s})`, textAlign: "center", lineHeight: 1.08,
          fontFamily: '"OddRound", "Arial Rounded MT Bold", "Montserrat", sans-serif', fontWeight: 700,
          fontSize: long ? zone.longFontPx : zone.fontPx, letterSpacing: 1, color: "#ffffff",
          WebkitTextStroke: "16px #0E1116", paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(14,17,22,0.55)",
        }}>
          {c.words.map((w, i) => {
            const lit = style === "karaoke" ? (c.times?.[i] ?? c.start) <= t : i === c.key;
            return <span key={i} style={{ color: lit ? accent : "#ffffff" }}>{w}{i < c.words.length - 1 ? " " : ""}</span>;
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
