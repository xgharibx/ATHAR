/**
 * بستان (Garden) theme ambient ornaments.
 *
 * Soft corner blossoms, two fluttering butterflies, and a few falling petals —
 * rendered only while the bustan theme is active, on every page (mounted in
 * AppShell). Purely decorative: aria-hidden, no pointer events, honors the
 * reduce-motion preference via CSS.
 */
import { useNoorStore } from "@/store/noorStore";

function Flower({ size, style }: { size: number; style: React.CSSProperties }) {
  return (
    <svg
      className="garden-flower"
      style={style}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
    >
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="24"
          cy="13"
          rx="6.5"
          ry="10"
          fill="var(--accent)"
          opacity="0.55"
          transform={`rotate(${deg} 24 24)`}
        />
      ))}
      <circle cx="24" cy="24" r="5" fill="var(--accent-2)" opacity="0.9" />
    </svg>
  );
}

function Butterfly({ size, className, style }: { size: number; className?: string; style: React.CSSProperties }) {
  return (
    <svg
      className={`garden-butterfly ${className ?? ""}`}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
    >
      <path
        d="M24 24C18 12 6 8 4 14c-2 6 8 14 18 14"
        fill="var(--accent)"
        opacity="0.8"
      />
      <path
        d="M24 24c6-12 18-16 20-10 2 6-8 14-18 14"
        fill="var(--accent)"
        opacity="0.65"
      />
      <path
        d="M24 26c-5 3-12 12-8 15 3.5 2.6 8-6 8-13"
        fill="var(--accent-2)"
        opacity="0.7"
      />
      <path
        d="M24 26c5 3 12 12 8 15-3.5 2.6-8-6-8-13"
        fill="var(--accent-2)"
        opacity="0.55"
      />
      <rect x="23" y="18" width="2" height="16" rx="1" fill="var(--fg)" opacity="0.55" />
    </svg>
  );
}

function Petal({ left, delay, duration }: { left: string; delay: number; duration: number }) {
  return (
    <svg
      className="garden-petal"
      style={{ left, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path d="M7 0C10.5 3 12 8 7 14 2 8 3.5 3 7 0Z" fill="var(--accent)" opacity="0.8" />
    </svg>
  );
}

export function GardenOrnaments() {
  const theme = useNoorStore((s) => s.prefs.theme);
  if (theme !== "bustan") return null;

  return (
    <div className="garden-ornaments" aria-hidden="true">
      {/* Corner blossoms */}
      <Flower size={64} style={{ top: "-14px", insetInlineStart: "-16px" }} />
      <Flower size={40} style={{ top: "34px", insetInlineStart: "36px", opacity: 0.35 }} />
      <Flower size={56} style={{ bottom: "96px", insetInlineEnd: "-14px", opacity: 0.4 }} />

      {/* Butterflies */}
      <Butterfly size={30} style={{ top: "18%", insetInlineEnd: "12%" }} />
      <Butterfly size={22} className="garden-butterfly-2" style={{ top: "58%", insetInlineStart: "8%" }} />

      {/* Falling petals */}
      <Petal left="12%" delay={0} duration={24} />
      <Petal left="38%" delay={-8} duration={28} />
      <Petal left="64%" delay={-16} duration={22} />
      <Petal left="86%" delay={-4} duration={26} />
    </div>
  );
}
