import * as React from "react";
import { PremiumShareComposer } from "@/components/share/PremiumShareComposer";
import type { PosterContent } from "@/lib/premiumPoster";

interface SharePosterModalProps {
  text: string;
  sectionTitle?: string;
  count?: number;
  onClose: () => void;
}

/** A dhikr shared as an image, in the premium design. */
export function SharePosterModal({ text, sectionTitle, count, onClose }: SharePosterModalProps) {
  const content = React.useMemo<PosterContent>(
    () => ({ kind: "dhikr", text, heading: sectionTitle, count }),
    [text, sectionTitle, count],
  );
  return (
    <PremiumShareComposer
      open
      onClose={onClose}
      content={content}
      title={sectionTitle || "ذكر"}
      filename="athar-dhikr.png"
      shareText={text}
    />
  );
}
