// generated-by: gemini-ultra
import React from "react";
import { DiagramExplain, DiagramExplainProps } from "../oddly-kit/Templates";
import { Caption } from "../oddly-kit/episode";
import plan from "./plan.json";
import captions from "./captions.json";

const P = plan as unknown as DiagramExplainProps & { total: number; overlays?: { kind: string; from: number; title: string; lines: string[]; handle?: string }[] };
const end = P.overlays?.find((o) => o.kind === "end");
export const FRAMES = Math.round(P.total * 30);
export const Short: React.FC = () => (
  <DiagramExplain
    accent={P.accent}
    platform={P.platform}
    subStyle={P.subStyle}
    kicker={P.kicker}
    title={P.title}
    nodes={P.nodes}
    edges={P.edges}
    takeaway={P.takeaway}
    captions={captions as Caption[]}
    end={end ? { from: end.from, title: end.title, lines: end.lines, handle: end.handle } : undefined}
  />
);
export { DiagramExplain };
