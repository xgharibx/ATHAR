/**
 * «مشكاة» — the section's signature shapes (docs/QURAN_V2_DESIGN.md): the niche
 * (a pointed arch, the mihrab's profile) holding a lamp, the rosette of the
 * Madina mushaf's border, and a progress ring drawn as a gilded orbit.
 */
import * as React from "react";

/** The pointed arch, in a 100 × 140 box: straight sides, an ogee-like point. */
export const ARCH_PATH = "M0 140V60C0 30 20 12 50 0c30 12 50 30 50 60v80z";
const ARCH_INNER = "M5 136V61C5 34 23 17 50 6c27 11 45 28 45 55v75z";

/** A niche: content inside a pointed arch, with a gold hairline and a lamp at its top. */
export function Niche({ children, className = "", lamp = true, style }: { children: React.ReactNode; className?: string; lamp?: boolean; style?: React.CSSProperties }) {
  return (
    <div className={`q2-niche ${className}`} style={style}>
      <div className="q2-niche-fill" aria-hidden="true" />
      <div className="q2-niche-lattice" aria-hidden="true" />
      <svg className="q2-niche-line" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
        <path d={ARCH_PATH} vectorEffect="non-scaling-stroke" />
        <path d={ARCH_INNER} vectorEffect="non-scaling-stroke" className="is-inner" />
      </svg>
      {lamp ? <Lamp /> : null}
      <div className="q2-niche-body">{children}</div>
    </div>
  );
}

/** The lamp: a small hanging glass lamp with a slow, breathing light. */
export function Lamp({ size = 34 }: { size?: number }) {
  return (
    <div className="q2-lamp" aria-hidden="true">
      <span className="q2-lamp-glow" />
      <svg width={size} height={size * 1.6} viewBox="0 0 34 54">
        <line x1="17" y1="0" x2="17" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <path d="M9 14h16l-2 4H11z" fill="currentColor" opacity="0.85" />
        <path d="M11 18c-6 4-8 11-6 18 2 7 7 11 12 11s10-4 12-11c2-7 0-14-6-18z" fill="url(#q2-lamp-glass)" stroke="currentColor" strokeWidth="1" />
        <path d="M13 47h8l-1 4h-6z" fill="currentColor" opacity="0.85" />
        <defs>
          <radialGradient id="q2-lamp-glass" cx="50%" cy="55%" r="60%">
            <stop offset="0%" stopColor="#fff8e1" />
            <stop offset="55%" stopColor="var(--q2-lamp)" />
            <stop offset="100%" stopColor="var(--q2-gold)" stopOpacity="0.6" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * A small flower of eight rounded petals, the rosette of the Madina mushaf's
 * border, as an ornament or a medallion.
 */
export function Rosette({ size = 14, className = "", filled = true }: { size?: number; className?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth="1">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
          <ellipse key={r} cx="12" cy="6.4" rx="2.6" ry="4.9" transform={`rotate(${r} 12 12)`} opacity={r % 90 === 0 ? 1 : 0.62} />
        ))}
      </g>
      <circle cx="12" cy="12" r="2.4" fill={filled ? "var(--q2-card, #fff)" : "currentColor"} />
    </svg>
  );
}

/** A progress ring drawn as a gilded orbit, with its value in the middle. */
export function Orbit({ value, label, sub, tone = "green" }: { value: number; label: React.ReactNode; sub: string; tone?: "green" | "gold" }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="q2-orbit">
      <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
        <circle cx="36" cy="36" r={r} className="q2-orbit-track" />
        <circle
          cx="36"
          cy="36"
          r={r}
          className={`q2-orbit-arc is-${tone}`}
          strokeDasharray={`${c * v} ${c}`}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <b>{label}</b>
      <span>{sub}</span>
    </div>
  );
}
