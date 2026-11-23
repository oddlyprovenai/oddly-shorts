// generated-by: gemini-ultra
// Per-platform UI obstruction & subtitle safe-zone presets for 9:16 vertical shorts (1080x1920) and X video.
// Keeps burned-in subtitles and 2D cards clear of TikTok, YouTube Shorts, Instagram Reels, and X chrome.
import React from "react";

export type PlatformPreset = "universal" | "tiktok" | "youtube-shorts" | "reels" | "instagram-reels" | "x";

export type SafeZoneSpec = {
  id: PlatformPreset;
  label: string;
  /** Top chrome obstruction (% of frame height) */
  topBlockedPct: number;
  /** Bottom caption / audio / scrubber obstruction (% of frame height) */
  bottomBlockedPct: number;
  /** Right-side action rail obstruction (% of frame width, and vertical span %) */
  rightRailWidthPct: number;
  rightRailTopPct: number;
  rightRailHeightPct: number;
  /** Subtitle box placement (% of frame) */
  subLeftPct: number;
  subWidthPct: number;
  subTopPct: number;
  subHeightPct: number;
  /** Font sizes at 1080x1920 */
  fontPx: number;
  longFontPx: number;
};

export const SAFE_ZONES: Record<Exclude<PlatformPreset, "instagram-reels">, SafeZoneSpec> = {
  universal: {
    id: "universal",
    label: "Universal (TikTok + Shorts + Reels + X); same band as before the presets existed",
    topBlockedPct: 12,
    bottomBlockedPct: 24,
    rightRailWidthPct: 15,
    rightRailTopPct: 38,
    rightRailHeightPct: 44,
    subLeftPct: 10,
    subWidthPct: 80,
    subTopPct: 55,
    subHeightPct: 17,
    fontPx: 104,
    longFontPx: 84,
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok (9:16)",
    topBlockedPct: 12,
    bottomBlockedPct: 24,
    rightRailWidthPct: 15,
    rightRailTopPct: 38,
    rightRailHeightPct: 44,
    subLeftPct: 7,
    subWidthPct: 76,
    subTopPct: 52,
    subHeightPct: 18,
    fontPx: 98,
    longFontPx: 80,
  },
  "youtube-shorts": {
    id: "youtube-shorts",
    label: "YouTube Shorts (9:16)",
    topBlockedPct: 10,
    bottomBlockedPct: 22,
    rightRailWidthPct: 14,
    rightRailTopPct: 44,
    rightRailHeightPct: 40,
    subLeftPct: 8,
    subWidthPct: 77,
    subTopPct: 55,
    subHeightPct: 17,
    fontPx: 102,
    longFontPx: 82,
  },
  reels: {
    id: "reels",
    label: "Instagram Reels (9:16)",
    topBlockedPct: 11,
    bottomBlockedPct: 25,
    rightRailWidthPct: 14,
    rightRailTopPct: 46,
    rightRailHeightPct: 38,
    subLeftPct: 8,
    subWidthPct: 76,
    subTopPct: 50,
    subHeightPct: 18,
    fontPx: 98,
    longFontPx: 80,
  },
  x: {
    id: "x",
    label: "X / Twitter Video",
    topBlockedPct: 8,
    bottomBlockedPct: 15,
    rightRailWidthPct: 0,
    rightRailTopPct: 0,
    rightRailHeightPct: 0,
    subLeftPct: 8,
    subWidthPct: 84,
    subTopPct: 64,
    subHeightPct: 18,
    fontPx: 104,
    longFontPx: 84,
  },
};

export const resolveSafeZone = (platform?: PlatformPreset): SafeZoneSpec => {
  if (!platform) return SAFE_ZONES.universal;
  if (platform === "instagram-reels") return SAFE_ZONES.reels;
  return SAFE_ZONES[platform] ?? SAFE_ZONES.universal;
};

export const SafeZoneGuides: React.FC<{ platform?: PlatformPreset }> = ({ platform }) => {
  const z = resolveSafeZone(platform);
  const labelStyle: React.CSSProperties = {
    fontFamily: '"SF Mono", Menlo, monospace',
    fontSize: 22,
    fontWeight: 700,
    color: "#ffffff",
    background: "rgba(14,17,22,0.75)",
    padding: "4px 10px",
    borderRadius: 6,
  };
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: `${z.topBlockedPct}%`, background: "rgba(229,72,77,0.20)", display: "flex", alignItems: "flex-end", padding: 12 }}>
        <span style={labelStyle}>{z.label} · TOP UI ({z.topBlockedPct}%)</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${z.bottomBlockedPct}%`, background: "rgba(229,72,77,0.20)", display: "flex", alignItems: "flex-start", padding: 12 }}>
        <span style={labelStyle}>BOTTOM UI ({z.bottomBlockedPct}%)</span>
      </div>
      {z.rightRailWidthPct > 0 && (
        <div style={{ position: "absolute", right: 0, top: `${z.rightRailTopPct}%`, width: `${z.rightRailWidthPct}%`, height: `${z.rightRailHeightPct}%`, background: "rgba(240,89,42,0.22)", borderLeft: "3px dashed rgba(240,89,42,0.8)" }} />
      )}
      <div style={{ position: "absolute", left: `${z.subLeftPct}%`, width: `${z.subWidthPct}%`, top: `${z.subTopPct}%`, height: `${z.subHeightPct}%`, border: "4px dashed rgba(59,130,246,0.9)", borderRadius: 14 }} />
    </>
  );
};
