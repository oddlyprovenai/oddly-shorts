// generated-by: gemini-ultra
// Reusable 2D/SVG Remotion templates for Oddly Proven Lab shorts (9:16, 1:1, 16:9):
//   1. ReceiptCard     — animated "Lab Receipt" card printing verified metrics, verdicts, and honest caveats
//   2. SplitBenchmark  — synchronized head-to-head benchmark comparison (bars + specs + gate line, counter-free)
//   3. DiagramExplain  — progressive node-and-edge architecture / concept explainer with step highlights
//   4. NewsReaction    — editorial headline/claim clipping + measured reality-check verdict stage
//
// Rules enforced by design:
// - Oddly Proven palette (#0E1116 ink, #F7F5EF paper, #88D445 lab green, #F0592A cage orange, #3B82F6 blue, #E5484D red)
// - Counter-free values (numbers snap/fade cleanly as spoken; never roll through fake intermediate numbers)
// - Continuous subtle motion (drift grid + gentle dolly push) so QA never flags frozen frame spans >= 12 f
// - Built-in per-platform subtitle safe-zone support (tiktok, youtube-shorts, reels, x, universal)
import React from "react";
import { AbsoluteFill, Audio, getInputProps, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "./episode";
import { Subtitles, SubStyle } from "./Subtitles";
import { PlatformPreset, SafeZoneGuides } from "./safezones";

const SANS = '"OddRound", "Arial Rounded MT Bold", "Montserrat", -apple-system, BlinkMacSystemFont, sans-serif';
const MONO = '"SF Mono", Menlo, "DejaVu Sans Mono", monospace';
const INK = "#0E1116";
const PAPER = "#F7F5EF";
const GREEN = "#88D445";
const ORANGE = "#F0592A";
const BLUE = "#3B82F6";
const RED = "#E5484D";

const clamp01 = (u: number) => Math.max(0, Math.min(1, u));
const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const springPop = (u: number) => {
  const x = clamp01(u);
  return x < 0.7 ? (x / 0.7) * 1.06 : 1.06 - ((x - 0.7) / 0.3) * 0.06;
};

export type CommonShortProps = {
  accent?: string;
  audio?: string;
  captions?: Caption[];
  subStyle?: SubStyle;
  platform?: PlatformPreset;
  aiLabel?: string | false;
  end?: { from: number; title: string; lines: string[]; handle?: string };
};

/** Moving laboratory background grid + subtle camera creep so no 12-frame span is ever pixel-static */
const LabStage: React.FC<{
  accent: string;
  lightPaper?: boolean;
  aiLabel?: string | false;
  platform?: PlatformPreset;
  captions?: Caption[];
  subStyle?: SubStyle;
  audio?: string;
  end?: CommonShortProps["end"];
  children: React.ReactNode;
}> = ({ accent, lightPaper = false, aiLabel = "AI-assisted animation", platform, captions = [], subStyle = "pop", audio, end, children }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames, height } = useVideoConfig();
  const t = f / fps;
  const k = height / 1920;
  const guides = !!(getInputProps() as { post?: { guides?: boolean } }).post?.guides;
  const push = interpolate(f, [0, Math.max(1, durationInFrames)], [0.985, 1.025], { extrapolateRight: "clamp" });
  const driftX = (f * 0.65) % 64;
  const driftY = (f * 0.45) % 64;
  const bg = lightPaper ? PAPER : INK;
  const dot = lightPaper ? "rgba(14,17,22,0.09)" : "rgba(247,245,239,0.08)";
  const endActive = end && t >= end.from;
  const endEase = end ? easeOut((t - end.from) / 0.45) : 0;

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", fontFamily: SANS }}>
      {audio ? <Audio src={staticFile(audio)} /> : null}
      <AbsoluteFill style={{
        backgroundImage: `radial-gradient(circle, ${dot} ${Math.max(1.5, 2.2 * k)}px, transparent ${Math.max(1.6, 2.4 * k)}px)`,
        backgroundSize: `${64 * k}px ${64 * k}px`,
        backgroundPosition: `${driftX * k}px ${driftY * k}px`,
      }} />
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "50% 42%" }}>
        {children}
      </AbsoluteFill>
      {aiLabel && t < 3.5 && (
        <div style={{
          position: "absolute", top: "4.5%", right: "6%",
          background: lightPaper ? "rgba(14,17,22,0.82)" : "rgba(247,245,239,0.14)",
          color: PAPER, fontFamily: MONO, fontWeight: 700, fontSize: Math.round(24 * k),
          padding: `${Math.round(8 * k)}px ${Math.round(16 * k)}px`, borderRadius: 999,
          border: `1.5px solid ${accent}`,
        }}>
          {aiLabel}
        </div>
      )}
      {endActive && end && (
        <AbsoluteFill style={{ background: `rgba(14,17,22,${0.92 * endEase})`, alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: "82%", textAlign: "center", color: PAPER,
            background: "#151A22", borderRadius: Math.round(38 * k),
            padding: `${Math.round(48 * k)}px ${Math.round(38 * k)}px`,
            borderTop: `${Math.round(12 * k)}px solid ${accent}`,
            transform: `translateY(${(1 - endEase) * 36 * k}px)`, opacity: endEase,
          }}>
            <div style={{ fontSize: Math.round(86 * k), fontWeight: 800, color: accent, lineHeight: 1.06 }}>{end.title}</div>
            {end.lines.map((ln, idx) => (
              <div key={idx} style={{ fontSize: Math.round(44 * k), marginTop: Math.round(24 * k), lineHeight: 1.25, opacity: easeOut((t - end.from - 0.22 * (idx + 1)) / 0.35) }}>
                {ln}
              </div>
            ))}
            {end.handle && <div style={{ fontFamily: MONO, fontSize: Math.round(36 * k), marginTop: Math.round(38 * k), color: "#B8C2D0" }}>{end.handle}</div>}
          </div>
        </AbsoluteFill>
      )}
      <Subtitles captions={captions} accent={accent} style={subStyle} hideFrom={end?.from} platform={platform} />
      {guides && <SafeZoneGuides platform={platform} />}
    </AbsoluteFill>
  );
};

// ============================================================================
// 1. ReceiptCard — Animated "Lab Receipt" Card
// ============================================================================
export type ReceiptRow = {
  at: number;
  label: string;
  value: string;
  note?: string;
  status?: "pass" | "fail" | "info";
};

export type ReceiptCardProps = CommonShortProps & {
  headerTag?: string;
  title: string;
  subtitle?: string;
  rows: ReceiptRow[];
  stamp?: { at: number; text: string; ok: boolean };
  caveat?: { at: number; text: string };
  source: string;
};

export const ReceiptCard: React.FC<ReceiptCardProps> = ({
  accent = GREEN,
  headerTag = "ODDLY PROVEN LAB · RECEIPT",
  title,
  subtitle,
  rows,
  stamp,
  caveat,
  source,
  ...common
}) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = f / fps, k = height / 1920;
  const feed = easeOut(t / 0.65);

  return (
    <LabStage accent={accent} {...common}>
      <div style={{
        position: "absolute", top: "11%", left: "8%", width: "78%",
        background: PAPER, color: INK, borderRadius: Math.round(28 * k),
        padding: `${Math.round(36 * k)}px ${Math.round(36 * k)}px ${Math.round(32 * k)}px`,
        boxShadow: "0 28px 64px rgba(0,0,0,0.48)",
        borderTop: `${Math.round(14 * k)}px solid ${accent}`,
        transform: `translateY(${(1 - feed) * -90 * k}px)`, opacity: feed,
      }}>
        <div style={{ fontFamily: MONO, fontSize: Math.round(24 * k), fontWeight: 700, letterSpacing: 2, color: "#4E535E" }}>
          {headerTag}
        </div>
        <div style={{ fontSize: Math.round(54 * k), fontWeight: 800, lineHeight: 1.08, marginTop: Math.round(10 * k) }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: Math.round(30 * k), color: "#4E535E", marginTop: Math.round(8 * k) }}>
            {subtitle}
          </div>
        )}
        <div style={{ borderBottom: `3px dashed rgba(14,17,22,0.22)`, margin: `${Math.round(22 * k)}px 0` }} />

        <div style={{ display: "flex", flexDirection: "column", gap: Math.round(18 * k) }}>
          {rows.map((r, i) => {
            if (t < r.at) return null;
            const u = springPop((t - r.at) / 0.35);
            const badgeCol = r.status === "pass" ? "#1E6F3D" : r.status === "fail" ? RED : BLUE;
            const badgeBg = r.status === "pass" ? "rgba(136,212,69,0.28)" : r.status === "fail" ? "rgba(229,72,77,0.16)" : "rgba(59,130,246,0.14)";
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: Math.round(14 * k),
                background: "#FFFFFF", borderRadius: Math.round(16 * k),
                padding: `${Math.round(16 * k)}px ${Math.round(20 * k)}px`,
                border: "1.5px solid rgba(14,17,22,0.10)",
                transform: `scale(${u})`, opacity: clamp01((t - r.at) / 0.2),
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: Math.round(30 * k), fontWeight: 700 }}>{r.label}</div>
                  {r.note && <div style={{ fontFamily: MONO, fontSize: Math.round(22 * k), color: "#4E535E", marginTop: 4 }}>{r.note}</div>}
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: Math.round(36 * k), fontWeight: 800,
                  color: badgeCol, background: badgeBg,
                  padding: `${Math.round(8 * k)}px ${Math.round(16 * k)}px`, borderRadius: Math.round(12 * k),
                }}>
                  {r.value}
                </div>
              </div>
            );
          })}
        </div>

        {caveat && t >= caveat.at && (
          <div style={{
            marginTop: Math.round(20 * k), padding: `${Math.round(14 * k)}px ${Math.round(18 * k)}px`,
            borderRadius: Math.round(14 * k), background: "rgba(240,89,42,0.12)",
            borderLeft: `${Math.round(6 * k)}px solid ${ORANGE}`,
            fontSize: Math.round(25 * k), color: INK, lineHeight: 1.3,
            opacity: easeOut((t - caveat.at) / 0.3),
          }}>
            <strong>Caveat:</strong> {caveat.text}
          </div>
        )}

        <div style={{ fontFamily: MONO, fontSize: Math.round(21 * k), color: "#585C65", marginTop: Math.round(20 * k) }}>
          Source: {source}
        </div>

        {stamp && t >= stamp.at && (
          <div style={{
            position: "absolute", right: Math.round(26 * k), top: Math.round(26 * k),
            border: `${Math.round(5 * k)}px solid ${stamp.ok ? "#1E6F3D" : RED}`,
            color: stamp.ok ? "#1E6F3D" : RED,
            background: "rgba(247,245,239,0.95)",
            fontFamily: MONO, fontWeight: 900, fontSize: Math.round(28 * k),
            padding: `${Math.round(8 * k)}px ${Math.round(16 * k)}px`, borderRadius: Math.round(10 * k),
            transform: `rotate(-8deg) scale(${2.1 - 1.1 * easeOut((t - stamp.at) / 0.22)})`,
            opacity: clamp01((t - stamp.at) / 0.12),
          }}>
            {stamp.ok ? "✓ " : "✗ "}{stamp.text}
          </div>
        )}
      </div>
    </LabStage>
  );
};

// ============================================================================
// 2. SplitBenchmark — Head-to-Head Split-Screen Benchmark
// ============================================================================
export type BenchmarkSide = {
  tag: string;
  name: string;
  spec: string;
  metricValue: number;
  metricText: string;
  secondaryText?: string;
  color: string;
  revealAt: number;
};

export type SplitBenchmarkProps = CommonShortProps & {
  question: string;
  maxBarValue: number;
  topSide: BenchmarkSide;
  bottomSide: BenchmarkSide;
  gateNote?: { at: number; text: string };
  source: string;
};

export const SplitBenchmark: React.FC<SplitBenchmarkProps> = ({
  accent = GREEN,
  question,
  maxBarValue,
  topSide,
  bottomSide,
  gateNote,
  source,
  ...common
}) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = f / fps, k = height / 1920;

  const renderPanel = (side: BenchmarkSide, idx: number) => {
    const u = easeOut((t - side.revealAt) / 0.55);
    const barPct = Math.min(100, Math.max(4, (side.metricValue / Math.max(1e-6, maxBarValue)) * 100)) * u;
    const landed = t >= side.revealAt + 0.35;
    return (
      <div key={idx} style={{
        background: "#161B24", borderRadius: Math.round(26 * k),
        padding: `${Math.round(26 * k)}px ${Math.round(28 * k)}px`,
        border: `2px solid ${landed ? side.color : "rgba(247,245,239,0.12)"}`,
        color: PAPER,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <span style={{ fontFamily: MONO, fontSize: Math.round(22 * k), color: side.color, fontWeight: 700 }}>{side.tag}</span>
            <div style={{ fontSize: Math.round(40 * k), fontWeight: 800, marginTop: 4 }}>{side.name}</div>
            <div style={{ fontFamily: MONO, fontSize: Math.round(23 * k), color: "#9AA6B8", marginTop: 4 }}>{side.spec}</div>
          </div>
          <div style={{
            fontFamily: MONO, fontSize: Math.round(52 * k), fontWeight: 900, color: side.color,
            opacity: landed ? easeOut((t - side.revealAt - 0.35) / 0.25) : 0,
          }}>
            {side.metricText}
          </div>
        </div>
        <div style={{
          height: Math.round(26 * k), background: "#0B0E13", borderRadius: 999,
          marginTop: Math.round(18 * k), overflow: "hidden",
        }}>
          <div style={{ width: `${barPct}%`, height: "100%", background: side.color, borderRadius: 999 }} />
        </div>
        {side.secondaryText && landed && (
          <div style={{ fontFamily: MONO, fontSize: Math.round(23 * k), color: "#C8D0DC", marginTop: Math.round(12 * k) }}>
            {side.secondaryText}
          </div>
        )}
      </div>
    );
  };

  return (
    <LabStage accent={accent} {...common}>
      <div style={{
        position: "absolute", top: "9.5%", left: "8%", width: "78%",
        display: "flex", flexDirection: "column", gap: Math.round(20 * k),
      }}>
        <div style={{
          background: PAPER, color: INK, borderRadius: Math.round(20 * k),
          padding: `${Math.round(18 * k)}px ${Math.round(24 * k)}px`,
          fontSize: Math.round(38 * k), fontWeight: 800, lineHeight: 1.15,
          borderLeft: `${Math.round(10 * k)}px solid ${accent}`,
        }}>
          {question}
        </div>
        {renderPanel(topSide, 0)}
        {renderPanel(bottomSide, 1)}
        {gateNote && t >= gateNote.at && (
          <div style={{
            background: "rgba(59,130,246,0.16)", border: `1.5px solid ${BLUE}`,
            color: PAPER, borderRadius: Math.round(16 * k),
            padding: `${Math.round(14 * k)}px ${Math.round(20 * k)}px`,
            fontSize: Math.round(26 * k), opacity: easeOut((t - gateNote.at) / 0.3),
          }}>
            {gateNote.text}
          </div>
        )}
        <div style={{ fontFamily: MONO, fontSize: Math.round(21 * k), color: "#8E99AB" }}>
          Source: {source}
        </div>
      </div>
    </LabStage>
  );
};

// ============================================================================
// 3. DiagramExplain — Progressive Node & Edge Architecture Explainer
// ============================================================================
export type DiagramNode = {
  id: string;
  title: string;
  subtitle: string;
  /** Normalized 0..1 coordinates inside diagram canvas */
  x: number;
  y: number;
  at: number;
  color?: string;
};

export type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
  at: number;
};

export type DiagramExplainProps = CommonShortProps & {
  kicker?: string;
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  takeaway?: { at: number; text: string };
};

export const DiagramExplain: React.FC<DiagramExplainProps> = ({
  accent = ORANGE,
  kicker = "HOW IT WORKS",
  title,
  nodes,
  edges,
  takeaway,
  ...common
}) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = f / fps, k = height / 1920;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const boxW = 840 * k, boxH = 680 * k;

  return (
    <LabStage accent={accent} {...common}>
      <div style={{ position: "absolute", top: "9.5%", left: "8%", width: "78%" }}>
        <div style={{ fontFamily: MONO, fontSize: Math.round(24 * k), fontWeight: 700, color: accent, letterSpacing: 2 }}>
          {kicker}
        </div>
        <div style={{ fontSize: Math.round(48 * k), fontWeight: 800, color: PAPER, lineHeight: 1.1, marginTop: Math.round(6 * k) }}>
          {title}
        </div>

        <div style={{
          position: "relative", width: boxW, height: boxH, marginTop: Math.round(24 * k),
          background: "#141922", borderRadius: Math.round(28 * k),
          border: "1.5px solid rgba(247,245,239,0.14)", overflow: "hidden",
        }}>
          <svg width={boxW} height={boxH} style={{ position: "absolute", inset: 0 }}>
            {edges.map((e, i) => {
              const a = nodeMap.get(e.from), b = nodeMap.get(e.to);
              if (!a || !b || t < e.at) return null;
              const u = easeOut((t - e.at) / 0.45);
              const x1 = a.x * boxW, y1 = a.y * boxH;
              const x2 = x1 + (b.x * boxW - x1) * u, y2 = y1 + (b.y * boxH - y1) * u;
              return (
                <g key={i}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth={5 * k} strokeLinecap="round" strokeDasharray={`${10 * k} ${6 * k}`} />
                  {e.label && u > 0.7 && (
                    <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 12 * k} textAnchor="middle" fill="#C8D0DC" fontFamily={MONO} fontSize={Math.round(20 * k)} fontWeight={700}>
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {nodes.map((n) => {
            if (t < n.at) return null;
            const pop = springPop((t - n.at) / 0.35);
            const col = n.color ?? accent;
            const nw = 250 * k;
            return (
              <div key={n.id} style={{
                position: "absolute",
                left: n.x * boxW - nw / 2,
                top: n.y * boxH - 58 * k,
                width: nw,
                background: PAPER,
                color: INK,
                borderRadius: Math.round(18 * k),
                padding: `${Math.round(14 * k)}px ${Math.round(16 * k)}px`,
                borderTop: `${Math.round(7 * k)}px solid ${col}`,
                boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
                textAlign: "center",
                transform: `scale(${pop})`,
              }}>
                <div style={{ fontSize: Math.round(27 * k), fontWeight: 800, lineHeight: 1.15 }}>{n.title}</div>
                <div style={{ fontFamily: MONO, fontSize: Math.round(19 * k), color: "#4E535E", marginTop: 4 }}>{n.subtitle}</div>
              </div>
            );
          })}
        </div>

        {takeaway && t >= takeaway.at && (
          <div style={{
            marginTop: Math.round(18 * k), background: "rgba(136,212,69,0.15)",
            borderLeft: `${Math.round(7 * k)}px solid ${GREEN}`, color: PAPER,
            padding: `${Math.round(14 * k)}px ${Math.round(20 * k)}px`, borderRadius: Math.round(14 * k),
            fontSize: Math.round(27 * k), opacity: easeOut((t - takeaway.at) / 0.3),
          }}>
            {takeaway.text}
          </div>
        )}
      </div>
    </LabStage>
  );
};

// ============================================================================
// 4. NewsReaction — Editorial Claim Clipping + Measured Reality Check
// ============================================================================
export type NewsReactionProps = CommonShortProps & {
  publicationLabel: string;
  publishedDate: string;
  headline: string;
  quotedClaim?: string;
  verdictAt: number;
  verdictStamp: string;
  verdictOk: boolean;
  findings: { at: number; text: string }[];
  source: string;
};

export const NewsReaction: React.FC<NewsReactionProps> = ({
  accent = ORANGE,
  publicationLabel,
  publishedDate,
  headline,
  quotedClaim,
  verdictAt,
  verdictStamp,
  verdictOk,
  findings,
  source,
  ...common
}) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = f / fps, k = height / 1920;
  const clipIn = easeOut(t / 0.45);

  return (
    <LabStage accent={accent} {...common}>
      <div style={{
        position: "absolute", top: "9.5%", left: "8%", width: "78%",
        display: "flex", flexDirection: "column", gap: Math.round(20 * k),
      }}>
        {/* Editorial clipping card (zero third-party logos) */}
        <div style={{
          background: PAPER, color: INK, borderRadius: Math.round(24 * k),
          padding: `${Math.round(26 * k)}px ${Math.round(30 * k)}px`,
          borderLeft: `${Math.round(10 * k)}px solid ${BLUE}`,
          transform: `translateY(${(1 - clipIn) * -40 * k}px) rotate(-0.6deg)`, opacity: clipIn,
          boxShadow: "0 20px 44px rgba(0,0,0,0.4)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: Math.round(21 * k), color: "#4E535E", fontWeight: 700 }}>
            <span>{publicationLabel}</span>
            <span>{publishedDate}</span>
          </div>
          <div style={{ fontSize: Math.round(42 * k), fontWeight: 800, lineHeight: 1.12, marginTop: Math.round(12 * k) }}>
            “{headline}”
          </div>
          {quotedClaim && (
            <div style={{ fontSize: Math.round(26 * k), color: "#4E535E", marginTop: Math.round(10 * k), fontStyle: "italic" }}>
              {quotedClaim}
            </div>
          )}
        </div>

        {/* Measured Lab Response */}
        {t >= verdictAt && (
          <div style={{
            background: "#161B24", color: PAPER, borderRadius: Math.round(24 * k),
            padding: `${Math.round(26 * k)}px ${Math.round(28 * k)}px`,
            border: `2px solid ${verdictOk ? GREEN : RED}`,
            opacity: easeOut((t - verdictAt) / 0.3),
          }}>
            <div style={{
              display: "inline-block", fontFamily: MONO, fontWeight: 900, fontSize: Math.round(25 * k),
              color: verdictOk ? INK : "#FFFFFF",
              background: verdictOk ? GREEN : RED,
              padding: `${Math.round(6 * k)}px ${Math.round(16 * k)}px`, borderRadius: Math.round(10 * k),
              transform: `scale(${springPop((t - verdictAt) / 0.28)})`,
            }}>
              {verdictStamp}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: Math.round(14 * k), marginTop: Math.round(18 * k) }}>
              {findings.map((item, idx) => {
                if (t < item.at) return null;
                return (
                  <div key={idx} style={{
                    display: "flex", gap: Math.round(12 * k), alignItems: "flex-start",
                    fontSize: Math.round(30 * k), lineHeight: 1.25,
                    opacity: easeOut((t - item.at) / 0.25),
                  }}>
                    <span style={{ color: accent, fontWeight: 900 }}>▸</span>
                    <span>{item.text}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ fontFamily: MONO, fontSize: Math.round(20 * k), color: "#8E99AB", marginTop: Math.round(18 * k) }}>
              Verified against: {source}
            </div>
          </div>
        )}
      </div>
    </LabStage>
  );
};
