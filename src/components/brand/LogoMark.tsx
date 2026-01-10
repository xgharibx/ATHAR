import * as React from "react";

import { cn } from "@/lib/utils";

export function LogoMark(props: { className?: string; title?: string }) {
  const title = props.title ?? "ATHAR";

  return (
    <svg
      viewBox="0 0 512 512"
      role="img"
      aria-label={title}
      className={cn("block", props.className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="atharGlow" cx="50%" cy="42%" r="60%">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <filter id="atharSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id="atharShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Background (theme-aware) */}
      <rect width="512" height="512" fill="var(--bg)" />
      <rect width="512" height="512" fill="url(#atharGlow)" />

      {/* Fingerprint mark */}
      <g transform="translate(256 228)" filter="url(#atharShadow)">
        <circle r="110" fill="var(--accent)" fillOpacity="0.10" />
        <g
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.90"
          strokeLinecap="round"
          filter="url(#atharSoft)"
        >
          <path d="M -86 -4 C -56 -66, 56 -66, 86 -4" strokeWidth="6" />
          <path d="M -92 18 C -60 -56, 60 -56, 92 18" strokeWidth="5" />
          <path d="M -86 42 C -54 -38, 54 -38, 86 42" strokeWidth="4.5" />
          <path d="M -72 66 C -42 -22, 42 -22, 72 66" strokeWidth="4" />
          <path d="M -52 86 C -28 -8, 28 -8, 52 86" strokeWidth="3.5" />
          <path d="M -28 102 C -14 18, 14 18, 28 102" strokeWidth="3" />
        </g>
      </g>

      {/* Title */}
      <g filter="url(#atharShadow)">
        <text
          x="256"
          y="280"
          textAnchor="middle"
          fontFamily="'Noto Naskh Arabic','Noto Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif"
          fontSize="104"
          fontWeight="700"
          fill="var(--fg)"
        >
          أثر
        </text>
      </g>

      {/* Tagline */}
      <text
        x="256"
        y="356"
        textAnchor="middle"
        fontFamily="'Noto Naskh Arabic','Noto Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif"
        fontSize="22"
        fontWeight="500"
        fill="var(--fg)"
        opacity="0.85"
      >
        همسة تطمئن قلبك، وتترك أثرًا.
      </text>
    </svg>
  );
}
