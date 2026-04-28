import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * LogoMark — renders the real brand PNG.
 * Deep-green background + gold fingerprint — matches the physical brand identity.
 */
export function LogoMark(props: { className?: string; title?: string }) {
  const title = props.title ?? "Athar";

  return (
    <img
      src="/icons/icon-512.png"
      alt={title}
      draggable={false}
      className={cn("block object-cover select-none", props.className)}
    />
  );
}
