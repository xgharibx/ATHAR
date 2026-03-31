/** 
 * Each section ID maps to a visual identity:
 * accent color, gradient, emoji icon, and descriptive badge label.
 */
export type SectionIdentity = {
  accent: string;       // CSS color
  grad: string;         // Tailwind gradient classes
  icon: string;         // emoji
  badge: string;        // short label
  bg: string;           // subtle bg overlay (rgba)
};

const IDENTITIES: Record<string, SectionIdentity> = {
  morning:      { accent: "#f59e0b", grad: "from-amber-500/15 to-orange-400/10",  icon: "🌅", badge: "صباح",   bg: "rgba(245,158,11,.06)"   },
  evening:      { accent: "#8b5cf6", grad: "from-violet-500/15 to-purple-500/10", icon: "🌙", badge: "مساء",   bg: "rgba(139,92,246,.06)"  },
  sleep:        { accent: "#6366f1", grad: "from-indigo-600/15 to-blue-600/10",   icon: "🌌", badge: "نوم",    bg: "rgba(99,102,241,.06)"  },
  prayer:       { accent: "#10b981", grad: "from-emerald-500/15 to-teal-500/10",  icon: "🕌", badge: "صلاة",   bg: "rgba(16,185,129,.06)"  },
  post_prayer:  { accent: "#14b8a6", grad: "from-teal-500/15 to-cyan-500/10",     icon: "📿", badge: "بعد الصلاة", bg: "rgba(20,184,166,.06)" },
  home:         { accent: "#f97316", grad: "from-orange-500/15 to-red-400/10",    icon: "🏡", badge: "منزل",   bg: "rgba(249,115,22,.06)"  },
  mosque:       { accent: "#0ea5e9", grad: "from-sky-500/15 to-blue-500/10",      icon: "🕌", badge: "مسجد",   bg: "rgba(14,165,233,.06)"  },
  toilet:       { accent: "#6b7280", grad: "from-gray-500/15 to-slate-500/10",    icon: "🚿", badge: "دخول",   bg: "rgba(107,114,128,.06)" },
  adhan:        { accent: "#f43f5e", grad: "from-rose-500/15 to-pink-500/10",     icon: "📣", badge: "أذان",   bg: "rgba(244,63,94,.06)"   },
  misc:         { accent: "#a78bfa", grad: "from-purple-400/15 to-indigo-400/10", icon: "☪️",  badge: "متنوع",  bg: "rgba(167,139,250,.06)" },
};

const DEFAULT_IDENTITY: SectionIdentity = {
  accent: "var(--accent)",
  grad: "from-white/5 to-transparent",
  icon: "📖",
  badge: "أذكار",
  bg: "rgba(255,255,255,.03)",
};

export function getSectionIdentity(sectionId: string): SectionIdentity {
  // Try exact match first
  if (IDENTITIES[sectionId]) return IDENTITIES[sectionId]!;
  // Try prefix match
  for (const [key, val] of Object.entries(IDENTITIES)) {
    if (sectionId.startsWith(key) || key.startsWith(sectionId.split("_")[0]!)) return val;
  }
  return DEFAULT_IDENTITY;
}
