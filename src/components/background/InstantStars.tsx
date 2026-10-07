import * as React from "react";

/** First-paint stars: CSS only, while the existing WebGL scene prepares. */
export function InstantStars({ hidden = false, color }: { hidden?: boolean; color?: string }) {
  return <div
    aria-hidden="true"
    data-instant-stars
    className="athar-star-seed"
    style={{ color: color ?? "#ffd780", opacity: hidden ? 0 : 0.8, transition: "opacity 350ms ease-out" }}
  />;
}
