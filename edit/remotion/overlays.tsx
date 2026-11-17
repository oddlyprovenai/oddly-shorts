// reel-edit · overlay library. Each kind illustrates the idea being said (never repeats the caption) and has a base
// size; anchors.place() decides where it goes (above the head or beside a shoulder) and how much it shrinks.
// Numbers are never "rolled" through intermediate values: only real figures from the fact sheet are ever drawn.
// Times inside `d` ("at") are seconds relative to the overlay start.
import React from "react";

import { Glass, Icon, INK, GREEN, ORANGE, RED, PAPER, SANS, MONO, Pill, Lock, pop, ease } from "./fx";

export type Ov = { kind: string; from: number; dur: number; anchor: "head" | "rshoulder" | "lshoulder" | "chest"; d: any };
type K = React.FC<{ l: number; d: any; accent: string }>;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const IconK: K = ({ l, d }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, height: "100%", filter: "drop-shadow(0 10px 18px rgba(0,0,0,.5))" }}>
    <Icon name={d.icon} color={d.color ?? GREEN} size={200} />
    {d.label && <div style={{ opacity: ease(l, 0.15, 0.35) }}><Pill text={d.label} bg={d.color ?? GREEN} size={36} /></div>}
  </div>
);

const Icons: K = ({ l, d }) => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 18, height: "100%", filter: "drop-shadow(0 10px 18px rgba(0,0,0,.5))" }}>
    {d.items.map((it: any, i: number) => {
      const p = pop(l, 30, it.at ?? i * 0.3), broke = d.breakAt != null && l >= d.breakAt;
      return (
        <React.Fragment key={i}>
          {i > 0 && <div style={{ width: 36, height: 8, alignSelf: "center", marginBottom: 46, borderRadius: 4, background: broke ? "transparent" : "rgba(255,255,255,.5)",
            borderTop: broke ? `6px dashed ${RED}` : undefined, opacity: p, transform: broke ? `rotate(${i % 2 ? 14 : -14}deg)` : undefined }} />}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transform: `scale(${p}) translateY(${(1 - p) * 30}px)` }}>
            <Icon name={it.icon} color={it.color ?? GREEN} size={130} />
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 32, color: "#fff", WebkitTextStroke: "8px " + INK, paintOrder: "stroke fill" }}>{it.label}</span>
          </div>
        </React.Fragment>
      );
    })}
  </div>
);

const Stamp: K = ({ l, d }) => {
  const c = d.ok ? GREEN : RED, hitK = pop(l, 30), s = lerp(2.2, 1, Math.min(1, hitK));
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${d.ok ? -6 : 7}deg) scale(${s})` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, border: `8px solid ${c}`, borderRadius: 22, padding: "12px 28px", background: "rgba(14,17,22,.72)",
        boxShadow: `0 0 0 4px rgba(14,17,22,.6), 0 16px 30px rgba(0,0,0,.45)` }}>
        <Icon name={d.ok ? "check" : "x"} color={c} size={78} />
        <span style={{ fontFamily: SANS, fontWeight: 900, fontSize: 64, color: c, letterSpacing: 3 }}>{d.text}</span>
      </div>
    </div>
  );
};

const Bar: K = ({ l, d, accent }) => {
  const g1 = ease(l, 0.15, 0.75), g2 = ease(l, d.afterAt ?? 0.9, (d.afterAt ?? 0.9) + 0.8);
  const row = (v: number, g: number, c: string, txt: string, cap: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14, height: 70 }}>
      <div style={{ width: 120, fontFamily: SANS, fontWeight: 700, fontSize: 24, color: "#aeb8c6" }}>{cap}</div>
      <div style={{ flex: 1, height: 44, borderRadius: 12, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
        <div style={{ width: `${v * g}%`, height: "100%", borderRadius: 12, background: `linear-gradient(90deg, ${c}88, ${c})`, boxShadow: `0 0 24px ${c}66` }} />
      </div>
      <div style={{ width: 130, textAlign: "right", fontFamily: MONO, fontWeight: 800, fontSize: 38, color: c, opacity: g >= 1 ? 1 : 0, transform: `scale(${g >= 1 ? 1 : 0.6})` }}>{txt}</div>
    </div>
  );
  return (
    <Glass tint={accent}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 28, color: "#dfe6ee", marginBottom: 6 }}>{d.title}</div>
      {row(d.before, g1, "#8a94a3", d.beforeText, d.beforeCap)}
      {row(d.after, g2, accent, d.afterText, d.afterCap)}
      {d.pill && <div style={{ textAlign: "right", marginTop: 10, opacity: ease(l, d.pillAt ?? 2, (d.pillAt ?? 2) + 0.2), transform: `scale(${pop(l, 30, d.pillAt ?? 2)})`, transformOrigin: "100% 50%" }}>
        <Pill text={d.pill} bg="#2a313c" color="#e8edf3" size={24} /></div>}
    </Glass>
  );
};

// RAM meter + padlock: steps [{at, value, text, locked}]; the bar eases between values, the padlock clicks on "locked"
const Meter: K = ({ l, d, accent }) => {
  const steps = d.steps as any[]; const i = Math.max(0, steps.filter((s) => l >= s.at).length - 1);
  const prev = steps[Math.max(0, i - 1)], cur = steps[i], k = ease(l, cur.at, cur.at + 0.45);
  const v = lerp(prev.value, cur.value, k) / d.max, closedK = cur.locked ? ease(l, cur.at, cur.at + 0.25) : 1 - ease(l, cur.at, cur.at + 0.25);
  const closed = i === 0 ? (cur.locked ? 1 : 0) : prev.locked === cur.locked ? (cur.locked ? 1 : 0) : closedK;
  return (
    <Glass tint={ORANGE}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Lock closed={closed} size={110} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 26, color: "#aeb8c6" }}>{d.title}</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 52, color: k >= 1 ? "#fff" : "transparent" }}>{cur.text}</div>
        </div>
      </div>
      <div style={{ marginTop: 18, height: 34, borderRadius: 17, background: "rgba(255,255,255,.08)", overflow: "hidden", border: "1px solid rgba(255,255,255,.12)" }}>
        <div style={{ width: `${Math.max(0, v) * 100}%`, height: "100%", borderRadius: 17, background: `linear-gradient(90deg, ${accent}, ${ORANGE})` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontWeight: 700, fontSize: 22, color: "#8e99a8", marginTop: 8 }}>
        <span>{cur.label}</span><span>RAM</span></div>
    </Glass>
  );
};

const LockK: K = ({ l, d }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, height: "100%", filter: "drop-shadow(0 12px 20px rgba(0,0,0,.5))" }}>
    <div style={{ position: "relative", marginRight: d.icon ? 44 : 0 }}>
      <Lock closed={ease(l, d.closeAt ?? 0.35, (d.closeAt ?? 0.35) + 0.25)} size={200} />
      {d.icon && <div style={{ position: "absolute", right: -50, bottom: 0 }}><Icon name={d.icon} color="#dfe4ea" size={96} /></div>}
    </div>
    <div style={{ opacity: ease(l, (d.closeAt ?? 0.35) + 0.2, (d.closeAt ?? 0.35) + 0.4) }}><Pill text={d.label} bg={ORANGE} color="#fff" size={34} /></div>
  </div>
);

// a paper receipt printing out of thin air, one line (with a tick) per "at"
const Receipt: K = ({ l, d }) => {
  const lines = d.lines as any[], shown = lines.filter((x) => l >= x.at).length, rows = 84 + shown * 52;
  const feed = lerp(rows - 52, rows, ease(l, lines[Math.max(0, shown - 1)]?.at ?? 0, (lines[Math.max(0, shown - 1)]?.at ?? 0) + 0.3));
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", height: 22, borderRadius: 11, background: "#2a313c", boxShadow: "0 6px 14px rgba(0,0,0,.5)", zIndex: 2 }} />
      <div style={{ width: "88%", height: feed, overflow: "hidden", marginTop: -6, background: PAPER, borderRadius: "0 0 6px 6px", boxShadow: "0 16px 30px rgba(0,0,0,.45)",
        WebkitMaskImage: "linear-gradient(180deg, #000 calc(100% - 12px), transparent)", padding: "18px 22px", boxSizing: "border-box", fontFamily: MONO, color: INK }}>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: 3, textAlign: "center", borderBottom: `3px dashed ${INK}55`, paddingBottom: 10, marginBottom: 6 }}>{d.title}</div>
        {lines.slice(0, shown).map((x, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 52, fontSize: 28, fontWeight: 700 }}>
            <span>{x.text}</span><span style={{ transform: `scale(${pop(l, 30, x.at + 0.2)})` }}><Icon name={x.ok === false ? "x" : "check"} color={x.ok === false ? RED : "#3f8f1a"} size={44} /></span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Chip: K = ({ l, d, accent }) => {
  const glow = 0.5 + 0.5 * Math.sin(l * 5);
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 18, position: "relative" }}>
      <svg width={240} height={240} viewBox="0 0 100 100" style={{ filter: `drop-shadow(0 0 ${8 + glow * 10}px ${accent}88) drop-shadow(0 10px 16px rgba(0,0,0,.5))` }}>
        {[22, 36, 50, 64, 78].map((p) => <g key={p} stroke="#b9c2cc" strokeWidth="4"><path d={`M${p} 4v12M${p} 84v12M4 ${p}h12M84 ${p}h12`} /></g>)}
        <rect x="16" y="16" width="68" height="68" rx="10" fill="#1c222b" stroke={accent} strokeWidth="3" />
        <text x="50" y="58" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="22" fill="#fff">{d.big}</text>
      </svg>
      <div style={{ opacity: ease(l, 0.3, 0.5) }}><Pill text={d.label} size={40} /></div>
      {d.icon && <div style={{ transform: `scale(${pop(l, 30, d.iconAt ?? 0.8)})` }}><Icon name={d.icon} color="#dfe4ea" size={110} /></div>}
    </div>
  );
};

// n specialists: n small dots light up around one model chip, then the real figure
const Dots: K = ({ l, d, accent }) => {
  const n = d.n as number, R = 150, done = l >= 0.25 + n * 0.06 + 0.2;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {Array.from({ length: n }, (_, i) => {
        const a = Math.PI * (1.05 + (0.9 * i) / (n - 1)), p = pop(l, 30, 0.2 + i * 0.06);
        return <div key={i} style={{ position: "absolute", left: `calc(50% + ${Math.cos(a) * R * 1.45}px - 29px)`, top: `calc(78% + ${Math.sin(a) * R}px - 29px)`,
          width: 58, height: 58, borderRadius: 29, background: accent, transform: `scale(${p})`, boxShadow: `0 0 16px ${accent}88, 0 6px 10px rgba(0,0,0,.4)` }} />;
      })}
      <div style={{ position: "absolute", left: "50%", top: "78%", transform: `translate(-50%, -50%) scale(${pop(l, 30, 0)})`, background: "#1c222b", border: `3px solid ${accent}`,
        borderRadius: 18, padding: "10px 18px", fontFamily: SANS, fontWeight: 800, fontSize: 34, color: "#fff", whiteSpace: "nowrap", boxShadow: "0 10px 20px rgba(0,0,0,.5)" }}>{d.center}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: "6%", textAlign: "center", opacity: done ? 1 : 0, fontFamily: SANS, fontWeight: 900, fontSize: 64, color: "#fff",
        WebkitTextStroke: "10px " + INK, paintOrder: "stroke fill" }}>{d.label}</div>
    </div>
  );
};

// a trading curve that wiggles, then flattens (no real edge)
const Flat: K = ({ l, d }) => {
  const k = ease(l, 0.1, 1.0), flatK = ease(l, 0.6, 1.2);
  const pts = Array.from({ length: 41 }, (_, i) => { const x = i / 40; const y = 50 + (1 - flatK) * 26 * Math.sin(x * 19) * Math.cos(x * 7); return [8 + x * 184 * k, y]; });
  return (
    <Glass tint="#9aa6b8">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Icon name="bot" color="#dfe4ea" size={60} />
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 28 }}>{d.title}</span></div>
      <svg width="100%" height={120} viewBox="0 0 200 100" preserveAspectRatio="none">
        <path d="M8 50H192" stroke="rgba(255,255,255,.18)" strokeWidth="2" strokeDasharray="5 5" />
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={ORANGE} strokeWidth="5" strokeLinejoin="round" />
      </svg>
      <div style={{ textAlign: "center", opacity: ease(l, 1.1, 1.3) }}><Pill text={d.label} bg="#2a313c" color="#e8edf3" /></div>
    </Glass>
  );
};

export const KINDS: Record<string, { c: K; w: number; h: number }> = {
  icon: { c: IconK, w: 520, h: 230 }, icons: { c: Icons, w: 900, h: 250 }, stamp: { c: Stamp, w: 560, h: 160 },
  bar: { c: Bar, w: 700, h: 300 }, meter: { c: Meter, w: 640, h: 270 }, lock: { c: LockK, w: 620, h: 230 },
  receipt: { c: Receipt, w: 500, h: 330 }, chip: { c: Chip, w: 640, h: 250 }, dots: { c: Dots, w: 800, h: 300 }, flat: { c: Flat, w: 600, h: 280 },
};
export const OverlayBody: React.FC<{ ov: Ov; l: number; accent: string }> = ({ ov, l, accent }) => {
  const K = KINDS[ov.kind]; return K ? <K.c l={l} d={ov.d} accent={accent} /> : null;
};
