import * as React from "react";
import { cn } from "@/lib/utils";

/** Variants map to different SVG illustrations */
export type EmptyStateVariant = "favorites" | "quran-favorites" | "search" | "default";

const illustrations: Record<EmptyStateVariant, React.ReactNode> = {
  favorites: (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="w-32 h-32 opacity-40"
    >
      {/* Arabesque medallion */}
      <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
      <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      {/* Heart shape in center */}
      <path
        d="M60 78 C38 65 38 42 60 55 C82 42 82 65 60 78Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {/* Decorative petals */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <path
          key={i}
          d={`M60 60 Q${60 + 28 * Math.cos((angle * Math.PI) / 180)} ${
            60 + 28 * Math.sin((angle * Math.PI) / 180)
          } ${60 + 14 * Math.cos(((angle + 22.5) * Math.PI) / 180)} ${
            60 + 14 * Math.sin(((angle + 22.5) * Math.PI) / 180)
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.25"
        />
      ))}
      {/* Star dots at corners */}
      {[0, 90, 180, 270].map((a, i) => (
        <circle
          key={i}
          cx={60 + 44 * Math.cos((a * Math.PI) / 180)}
          cy={60 + 44 * Math.sin((a * Math.PI) / 180)}
          r="2"
          fill="currentColor"
          opacity="0.35"
        />
      ))}
    </svg>
  ),

  "quran-favorites": (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="w-32 h-32 opacity-40"
    >
      {/* Open book */}
      <path
        d="M20 35 Q60 28 60 38 L60 90 Q20 82 20 72Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        opacity="0.6"
      />
      <path
        d="M100 35 Q60 28 60 38 L60 90 Q100 82 100 72Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        opacity="0.6"
      />
      {/* Text lines left page */}
      {[0, 1, 2, 3].map((i) => (
        <line key={`l${i}`} x1="28" y1={52 + i * 8} x2="54" y2={50 + i * 8} stroke="currentColor" strokeWidth="1" opacity="0.3" />
      ))}
      {/* Text lines right page */}
      {[0, 1, 2, 3].map((i) => (
        <line key={`r${i}`} x1="66" y1={52 + i * 8} x2="92" y2={50 + i * 8} stroke="currentColor" strokeWidth="1" opacity="0.3" />
      ))}
      {/* Arabesque border */}
      <circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.2" />
      {/* Crescent top */}
      <path
        d="M52 18 A12 12 0 0 1 68 18 A8 8 0 0 0 52 18Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.4"
      />
      <circle cx="71" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>
  ),

  search: (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="w-32 h-32 opacity-40"
    >
      {/* Magnifying glass */}
      <circle cx="52" cy="50" r="24" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.55" />
      <line x1="69" y1="67" x2="90" y2="88" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      {/* Inner arabesque pattern inside lens */}
      <circle cx="52" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.3" />
      {/* Stars/dots around */}
      {[0, 72, 144, 216, 288].map((a, i) => (
        <circle
          key={i}
          cx={52 + 32 * Math.cos((a * Math.PI) / 180)}
          cy={50 + 32 * Math.sin((a * Math.PI) / 180)}
          r="1.5"
          fill="currentColor"
          opacity="0.2"
        />
      ))}
      {/* Question lines — no result */}
      <line x1="42" y1="46" x2="62" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="44" y1="51" x2="60" y2="51" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="46" y1="56" x2="58" y2="56" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      {/* Outer dotted ring */}
      <circle cx="55" cy="55" r="52" fill="none" stroke="currentColor" strokeWidth="0.7" strokeDasharray="3 6" opacity="0.15" />
    </svg>
  ),

  default: (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="w-32 h-32 opacity-40"
    >
      <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.3" />
      <circle cx="60" cy="60" r="24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      {[0, 60, 120, 180, 240, 300].map((a, i) => (
        <line
          key={i}
          x1={60 + 26 * Math.cos((a * Math.PI) / 180)}
          y1={60 + 26 * Math.sin((a * Math.PI) / 180)}
          x2={60 + 44 * Math.cos((a * Math.PI) / 180)}
          y2={60 + 44 * Math.sin((a * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="1.2"
          opacity="0.25"
        />
      ))}
    </svg>
  ),
};

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  variant = "default",
  title,
  description,
  className,
  action,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 px-6 text-center",
        className
      )}
      role="status"
      aria-label={title}
    >
      <div className="text-[var(--fg)]">{illustrations[variant]}</div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold opacity-60 arabic-text">{title}</p>
        {description && (
          <p className="text-xs opacity-40 arabic-text leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
