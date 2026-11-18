// generated-by: gemini-ultra
import React from "react";
import { NewsReaction, NewsReactionProps } from "../oddly-kit/Templates";
import { Caption } from "../oddly-kit/episode";
import plan from "./plan.json";
import captions from "./captions.json";

const P = plan as unknown as NewsReactionProps & { total: number; overlays?: { kind: string; from: number; title: string; lines: string[]; handle?: string }[] };
const end = P.overlays?.find((o) => o.kind === "end");
export const FRAMES = Math.round(P.total * 30);
export const Short: React.FC = () => (
  <NewsReaction
    accent={P.accent}
    platform={P.platform}
    subStyle={P.subStyle}
    publicationLabel={P.publicationLabel}
    publishedDate={P.publishedDate}
    headline={P.headline}
    quotedClaim={P.quotedClaim}
    verdictAt={P.verdictAt}
    verdictStamp={P.verdictStamp}
    verdictOk={P.verdictOk}
    findings={P.findings}
    source={P.source}
    captions={captions as Caption[]}
    end={end ? { from: end.from, title: end.title, lines: end.lines, handle: end.handle } : undefined}
  />
);
export { NewsReaction };
