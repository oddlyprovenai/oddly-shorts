// reel-edit · overlay primitives: spring pop-in / clean exit, glass card, small SVG icon set (no emoji fonts needed).
import React from "react";
import { interpolate, spring } from "remotion";

export const INK = "#0E1116", GREEN = "#88D445", ORANGE = "#F0592A", RED = "#E5484D", PAPER = "#F4F1E8";
export const SANS = '"Montserrat", "Arial Black", "Helvetica Neue", sans-serif';
export const MONO = '"SF Mono", Menlo, "DejaVu Sans Mono", monospace';

// 0..1 spring from local time l (s); overshoots a little, like a pop
export const pop = (l: number, fps = 30, delay = 0) => spring({ frame: Math.max(0, (l - delay) * fps), fps, config: { damping: 11, stiffness: 170, mass: 0.7 } });
export const ease = (l: number, a: number, b: number) => interpolate(l, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// in: spring scale from 0.4; out: last 0.25 s shrink + fade; a slow 2 px float while on screen
export const Motion: React.FC<{ l: number; dur: number; children: React.ReactNode }> = ({ l, dur, children }) => {
  const p = pop(l), out = ease(l, dur - 0.25, dur);
  const s = (0.4 + 0.6 * p) * (1 - 0.2 * out), y = Math.sin(l * 2.2) * 2 - 18 * (1 - Math.min(1, p));
  return <div style={{ width: "100%", height: "100%", opacity: Math.min(1, p * 1.4) * (1 - out), transform: `translateY(${y}px) scale(${s})`, transformOrigin: "50% 100%" }}>{children}</div>;
};

export const Glass: React.FC<{ children: React.ReactNode; tint?: string; style?: React.CSSProperties }> = ({ children, tint = GREEN, style }) => (
  <div style={{ width: "100%", height: "100%", boxSizing: "border-box", borderRadius: 30, padding: "22px 26px",
    background: "linear-gradient(160deg, rgba(30,36,46,0.78), rgba(14,17,22,0.86))", backdropFilter: "blur(14px)",
    border: `2px solid ${tint}55`, boxShadow: `0 18px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12), 0 0 0 1px rgba(0,0,0,0.3)`,
    color: "#f4f6f8", fontFamily: SANS, ...style }}>{children}</div>
);

export const Pill: React.FC<{ text: string; color?: string; bg?: string; size?: number }> = ({ text, color = INK, bg = GREEN, size = 26 }) => (
  <span style={{ display: "inline-block", background: bg, color, fontFamily: SANS, fontWeight: 800, fontSize: size, padding: "6px 16px", borderRadius: 999, whiteSpace: "nowrap" }}>{text}</span>
);

// icons drawn on a 100x100 box
const P: Record<string, (c: string) => React.ReactNode> = {
  cross: (c) => <path d="M38 14h24v24h24v24H62v24H38V62H14V38h24z" fill={c} />,
  up: (c) => <path d="M50 10 88 52H64v38H36V52H12z" fill={c} />,
  down: (c) => <path d="M50 90 12 48h24V10h28v38h24z" fill={c} />,
  check: (c) => <path d="M14 52 38 76 86 24" fill="none" stroke={c} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />,
  x: (c) => <path d="M20 20 80 80M80 20 20 80" fill="none" stroke={c} strokeWidth={14} strokeLinecap="round" />,
  coin: (c) => <><circle cx="50" cy="50" r="38" fill={c} /><text x="50" y="66" textAnchor="middle" fontSize="46" fontWeight="900" fontFamily="Montserrat, sans-serif" fill={INK}>$</text></>,
  habit: (c) => <><rect x="14" y="14" width="72" height="72" rx="16" fill={c} /><path d="M30 52 44 66 70 36" fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" /></>,
  heart: (c) => <path d="M50 86 16 52C4 40 10 16 30 16c10 0 16 6 20 12 4-6 10-12 20-12 20 0 26 24 14 36z" fill={c} />,
  folder: (c) => <path d="M10 26h30l8 10h42v48H10z" fill={c} />,
  laptop: (c) => <><rect x="18" y="22" width="64" height="42" rx="6" fill="none" stroke={c} strokeWidth="8" /><path d="M8 74h84l-6 8H14z" fill={c} /></>,
  rocket: (c) => <><path d="M50 8c16 12 22 30 18 52H32C28 38 34 20 50 8z" fill="none" stroke={c} strokeWidth="7" strokeDasharray="10 7" /><circle cx="50" cy="36" r="7" fill={c} /></>,
  eye: (c) => <><path d="M6 50Q50 6 94 50 50 94 6 50z" fill="none" stroke={c} strokeWidth="8" /><circle cx="50" cy="50" r="12" fill={c} /></>,
  wifi_off: (c) => <><path d="M14 40Q50 10 86 40M28 54Q50 36 72 54M42 68Q50 62 58 68" fill="none" stroke={c} strokeWidth="8" strokeLinecap="round" /><path d="M16 14 84 86" stroke={RED} strokeWidth="9" strokeLinecap="round" /></>,
  bot: (c) => <><rect x="20" y="30" width="60" height="46" rx="12" fill="none" stroke={c} strokeWidth="8" /><circle cx="38" cy="52" r="6" fill={c} /><circle cx="62" cy="52" r="6" fill={c} /><path d="M50 30V16" stroke={c} strokeWidth="7" /></>,
  receipt: (c) => <><path d="M22 10h56v80l-9-7-9 7-9-7-9 7-9-7-11 7z" fill={c} /><path d="M34 32h32M34 46h32M34 60h20" stroke={INK} strokeWidth="6" /></>,
};
export const Icon: React.FC<{ name: string; color?: string; size?: number }> = ({ name, color = GREEN, size = 80 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">{(P[name] ?? P.check)(color)}</svg>
);

// padlock: shackle closes over [t0, t0 + 0.25 s] (closed = 1); "click" squash at the moment it shuts
export const Lock: React.FC<{ closed: number; color?: string; size?: number }> = ({ closed, color = ORANGE, size = 120 }) => {
  const lift = (1 - closed) * 22, sq = 1 + 0.08 * Math.sin(Math.min(1, closed) * Math.PI);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `scale(${sq}, ${2 - sq})` }}>
      <path d={`M30 ${48 - lift}V${34 - lift}a20 20 0 0 1 40 0V${48 - (closed < 1 ? lift + 10 : 0)}`} fill="none" stroke="#dfe4ea" strokeWidth="10" strokeLinecap="round" />
      <rect x="18" y="46" width="64" height="46" rx="12" fill={color} />
      <circle cx="50" cy="66" r="7" fill={INK} /><rect x="47" y="68" width="6" height="14" rx="3" fill={INK} />
    </svg>
  );
};
