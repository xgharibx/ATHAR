import * as React from "react";
import { hueFor } from "@/lib/listen/catalog";
import { cn } from "@/lib/utils";

/**
 * A reciter's cover, drawn rather than photographed: a deep colour of their
 * own (the same everywhere in the app), a scroll of vine and leaves like the
 * border of the Madina mushaf, a gilded flower for a seal, and their name in
 * full, set like the title of a book. The golden recordings are bound in gold.
 *
 * Small sizes (the mini player, list rows) keep only the medallion, which
 * stays crisp where a name would not fit.
 */

/** Deep jewel tones, chosen by name, so every cover looks bound, never neon. */
const JEWELS = [
  { mid: "#1f6b52", deep: "#082a20", glow: "#7fd6b0" }, // emerald
  { mid: "#24508f", deep: "#0a1a38", glow: "#8fb4ff" }, // sapphire
  { mid: "#7a2236", deep: "#2a0911", glow: "#ff9fb2" }, // burgundy
  { mid: "#5a2f7a", deep: "#1e0d2e", glow: "#d3a6ff" }, // plum
  { mid: "#1d6a73", deep: "#06262b", glow: "#86e0e8" }, // teal
  { mid: "#34388a", deep: "#0f1033", glow: "#a9adff" }, // indigo
  { mid: "#8a4a22", deep: "#2e1608", glow: "#ffc08f" }, // copper
  { mid: "#4f5f2a", deep: "#1a200b", glow: "#d2e39a" }, // olive
] as const;

const GOLD = { mid: "#b8862c", deep: "#5a3a0c", glow: "#ffe7a3" } as const;

/** «الشيخ أبو بكر الشاطري» → ["أبو بكر", "الشاطري"]: the given name above the family name. */
function splitName(name: string): [string, string] {
  const clean = name.replace(/^(الشيخ|شيخ|القارئ)\s+/, "").trim();
  const words = clean.split(/\s+/);
  if (words.length <= 1) return [clean, ""];
  if (words.length === 2) return [words[0]!, words[1]!];
  // Compound given names: «عبد الباسط», «أبو بكر», «محمد صديق» stay together.
  const last = words[words.length - 1]!;
  return [words.slice(0, -1).join(" "), last];
}

function Medallion({ id, gold }: { id: string; gold: boolean }) {
  const ring = gold ? "#fff3cf" : "rgb(255 236 190 / 0.9)";
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-m`} cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor={gold ? "#fff4d6" : "#f6e2a8"} />
          <stop offset="1" stopColor={gold ? "#c99a3c" : "#b88a36"} />
        </radialGradient>
      </defs>
      {/* A rosette of eight rounded petals, the flower of the mushaf's border. */}
      <g transform="translate(50 50)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
          <ellipse key={r} cx="0" cy="-10.5" rx="5.4" ry="9" fill={`url(#${id}-m)`} opacity={r % 90 === 0 ? 0.96 : 0.78} transform={`rotate(${r})`} />
        ))}
        <circle r="7.5" fill="none" stroke={ring} strokeOpacity="0.85" strokeWidth="1.1" />
        <circle r="3.6" fill={ring} opacity="0.92" />
      </g>
    </g>
  );
}

export function ReciterMark({
  name,
  gold = false,
  className,
  style,
  withName,
}: {
  name: string;
  gold?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Show the name on the cover; defaults to on for covers drawn large. */
  withName?: boolean;
}) {
  const uid = React.useId().replace(/:/g, "");
  const hue = hueFor(name);
  const [first, last] = splitName(name);
  const width = typeof style?.width === "number" ? style.width : undefined;
  const showName = withName ?? (width === undefined || width >= 64);
  const tone = gold ? GOLD : JEWELS[hue % JEWELS.length]!;
  const deep = tone.deep;
  const mid = tone.mid;
  const glow = tone.glow;
  const line = gold ? "rgb(255 240 200 / 0.28)" : "rgb(255 235 190 / 0.16)";

  return (
    <span className={cn("ls-mark ls-cover", gold && "is-gold", className)} style={style} aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="presentation">
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={mid} />
            <stop offset="1" stopColor={deep} />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx="30%" cy="20%" r="70%">
            <stop offset="0" stopColor={glow} stopOpacity="0.55" />
            <stop offset="1" stopColor={glow} stopOpacity="0" />
          </radialGradient>
          {/* The vine: a stem in waves with its leaves, row after row. */}
          <pattern id={`${uid}-vine`} width="24" height="16" patternUnits="userSpaceOnUse" patternTransform={`rotate(${(hue % 5) * 6 - 12})`}>
            <g fill="none" stroke={line} strokeWidth="0.7" strokeLinecap="round">
              <path d="M0 8C3 3 9 3 12 8S21 13 24 8" />
            </g>
            <g fill={line}>
              <path d="M6 4.6c1.2-1.6 3.4-1.7 4.4 0-1 1.6-3.2 1.6-4.4 0z" />
              <path d="M14 11.4c1.2-1.6 3.4-1.7 4.4 0-1 1.6-3.2 1.6-4.4 0z" />
            </g>
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#${uid}-bg)`} />
        <rect width="100" height="100" fill={`url(#${uid}-vine)`} />
        <rect width="100" height="100" fill={`url(#${uid}-glow)`} />
        {/* With a name, the medallion sits small above it, like a seal on a book. */}
        <g transform={showName ? "translate(25 6) scale(0.5)" : undefined}>
          <Medallion id={uid} gold={gold} />
        </g>
        {showName ? (
          <g fill="#fff8e8" textAnchor="middle" style={{ fontFamily: "var(--font-arabic, 'Amiri', serif)" }}>
            <text x="50" y={last ? 62 : 70} fontSize={first.length > 12 ? 9 : 11} fontWeight="700">
              {first}
            </text>
            {last ? (
              <text x="50" y="78" fontSize={last.length > 12 ? 9 : 11.5} fontWeight="700" opacity="0.92">
                {last}
              </text>
            ) : null}
            <line x1="38" x2="62" y1="86" y2="86" stroke={gold ? "#fff0c8" : glow} strokeOpacity="0.6" strokeWidth="0.8" />
          </g>
        ) : null}
      </svg>
    </span>
  );
}
