import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * LogoMark — adaptive SVG header icon.
 *
 * Renders the brand fingerprint + "أثر" using CSS custom properties
 * (var(--accent), var(--fg), var(--bg)) so it automatically matches
 * whichever theme the user has selected.
 *
 * The real PNG (public/icons/icon-512.png) is used for Android launcher
 * icons, PWA manifest icons, and the splash screen — NOT here.
 */
export function LogoMark(props: { className?: string; title?: string }) {
  const title = props.title ?? "Athar";

  return (
    <svg
      viewBox="0 0 512 512"
      role="img"
      aria-label={title}
      className={cn("block", props.className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background — accent-tinted to match the active theme */}
      <rect
        width="512"
        height="512"
        fill="color-mix(in srgb, var(--accent) 22%, var(--bg))"
      />

      {/* Subtle radial glow behind fingerprint */}
      <radialGradient id="lmGlow" cx="50%" cy="40%" r="52%">
        <stop offset="0" stopColor="var(--accent)" stopOpacity="0.22" />
        <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
      </radialGradient>
      <ellipse cx="256" cy="200" rx="185" ry="200" fill="url(#lmGlow)" />

      {/* ── Fingerprint ridges (oval whorl) ───────────────────────────
          Seven arcs, each slightly wider and taller, forming an
          egg-shaped fingerprint centered at (256, 195).           */}
      <g
        fill="none"
        stroke="var(--accent)"
        strokeLinecap="round"
        strokeOpacity="0.92"
      >
        {/* Arc 1 — innermost */}
        <path d="M 234 212 Q 256 188 278 212" strokeWidth="13" />
        {/* Arc 2 */}
        <path d="M 218 232 Q 256 200 294 232" strokeWidth="12" />
        {/* Arc 3 */}
        <path d="M 200 255 Q 256 214 312 255" strokeWidth="11.5" />
        {/* Arc 4 — wide lower */}
        <path d="M 182 280 Q 256 228 330 280" strokeWidth="11" />
        {/* Arc 5 — upper mirror */}
        <path d="M 205 180 Q 256 148 307 180" strokeWidth="10.5" />
        {/* Arc 6 — upper wide */}
        <path d="M 186 158 Q 256 116 326 158" strokeWidth="10" />
        {/* Arc 7 — outermost lower */}
        <path d="M 164 308 Q 256 242 348 308" strokeWidth="10.5" />
      </g>

      {/* Drop shadow filter for the text */}
      <filter id="lmTxtShadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.45" />
      </filter>

      {/* "أثر" — large Arabic text overlapping bottom of fingerprint */}
      <text
        x="256"
        y="400"
        textAnchor="middle"
        fontFamily="'Noto Naskh Arabic','Noto Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif"
        fontSize="152"
        fontWeight="800"
        fill="var(--fg)"
        opacity="0.97"
        filter="url(#lmTxtShadow)"
        textRendering="optimizeLegibility"
      >
        أثر
      </text>
    </svg>
  );
}
