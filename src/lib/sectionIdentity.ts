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
  morning:         { accent: "#f59e0b", grad: "from-amber-500/15 to-orange-400/10",    icon: "🌅", badge: "صباح",            bg: "rgba(245,158,11,.06)"   },
  evening:         { accent: "#8b5cf6", grad: "from-violet-500/15 to-purple-500/10",   icon: "🌙", badge: "مساء",            bg: "rgba(139,92,246,.06)"  },
  sleep:           { accent: "#6366f1", grad: "from-indigo-600/15 to-blue-600/10",     icon: "🌌", badge: "نوم",             bg: "rgba(99,102,241,.06)"  },
  prayer:          { accent: "#10b981", grad: "from-emerald-500/15 to-teal-500/10",    icon: "🕌", badge: "صلاة",            bg: "rgba(16,185,129,.06)"  },
  post_prayer:     { accent: "#14b8a6", grad: "from-teal-500/15 to-cyan-500/10",       icon: "📿", badge: "بعد الصلاة",      bg: "rgba(20,184,166,.06)" },
  home:            { accent: "#f97316", grad: "from-orange-500/15 to-red-400/10",      icon: "🏡", badge: "منزل",            bg: "rgba(249,115,22,.06)"  },
  mosque:          { accent: "#0ea5e9", grad: "from-sky-500/15 to-blue-500/10",        icon: "🕌", badge: "مسجد",            bg: "rgba(14,165,233,.06)"  },
  toilet:          { accent: "#6b7280", grad: "from-gray-500/15 to-slate-500/10",      icon: "🚿", badge: "دخول",            bg: "rgba(107,114,128,.06)" },
  adhan:           { accent: "#f43f5e", grad: "from-rose-500/15 to-pink-500/10",       icon: "📣", badge: "أذان",            bg: "rgba(244,63,94,.06)"   },
  misc:            { accent: "#a78bfa", grad: "from-purple-400/15 to-indigo-400/10",   icon: "☪️",  badge: "متفرقة",           bg: "rgba(167,139,250,.06)" },
  waking:          { accent: "#fb923c", grad: "from-orange-400/15 to-yellow-400/10",   icon: "🌄", badge: "صحو",             bg: "rgba(251,146,60,.06)"  },
  wudu:            { accent: "#06b6d4", grad: "from-cyan-500/15 to-sky-400/10",        icon: "💧", badge: "وضوء",            bg: "rgba(6,182,212,.06)"   },
  food:            { accent: "#84cc16", grad: "from-lime-500/15 to-green-400/10",      icon: "🍽️", badge: "طعام",            bg: "rgba(132,204,22,.06)"  },
  hajj:            { accent: "#dc2626", grad: "from-red-600/15 to-rose-500/10",        icon: "🕋", badge: "حج وعمرة",        bg: "rgba(220,38,38,.06)"   },
  virtue:          { accent: "#d97706", grad: "from-amber-600/15 to-yellow-500/10",    icon: "⭐", badge: "فضائل",           bg: "rgba(217,119,6,.06)"   },
  salaah:          { accent: "#059669", grad: "from-emerald-600/15 to-teal-500/10",    icon: "🕌", badge: "الصلاة",          bg: "rgba(5,150,105,.06)"   },
  tasabeeh:        { accent: "#7c3aed", grad: "from-violet-600/15 to-purple-500/10",   icon: "📿", badge: "تسابيح",          bg: "rgba(124,58,237,.06)"  },
  quranic_duas:    { accent: "#059669", grad: "from-emerald-500/15 to-green-400/10",   icon: "📖", badge: "أدعية قرآنية",    bg: "rgba(5,150,105,.06)"   },
  prophets_duas:   { accent: "#0284c7", grad: "from-sky-600/15 to-blue-500/10",        icon: "🤲", badge: "أدعية الأنبياء", bg: "rgba(2,132,199,.06)"   },
  prophetic_duas:  { accent: "#0ea5e9", grad: "from-sky-500/15 to-cyan-400/10",        icon: "🤲", badge: "أدعية نبوية",    bg: "rgba(14,165,233,.06)"  },
  jawami_dua:      { accent: "#8b5cf6", grad: "from-violet-500/15 to-purple-400/10",   icon: "🤲", badge: "جوامع الدعاء",   bg: "rgba(139,92,246,.06)"  },
  ruqyah:          { accent: "#16a34a", grad: "from-green-600/15 to-emerald-500/10",   icon: "🛡️", badge: "رقية",            bg: "rgba(22,163,74,.06)"   },
  essentials:      { accent: "#34d399", grad: "from-emerald-400/15 to-teal-400/10",    icon: "✦", badge: "أقل القليل",      bg: "rgba(52,211,153,.06)"  },
  salawat:         { accent: "#f59e0b", grad: "from-amber-500/15 to-yellow-400/10",     icon: "ﷺ", badge: "صلوات",           bg: "rgba(245,158,11,.06)"   },
  forgotten_sunnahs:{ accent: "#38bdf8", grad: "from-sky-400/15 to-cyan-400/10",       icon: "☀️", badge: "سنن",             bg: "rgba(56,189,248,.06)"  },
  istikhara:       { accent: "#0ea5e9", grad: "from-sky-500/15 to-indigo-400/10",     icon: "🧭", badge: "الاستخارة",       bg: "rgba(14,165,233,.06)"  },
  friday:          { accent: "#10b981", grad: "from-emerald-500/15 to-green-400/10",   icon: "🕌", badge: "الجمعة",          bg: "rgba(16,185,129,.06)"  },
  ramadan:         { accent: "#f59e0b", grad: "from-amber-500/15 to-yellow-400/10",    icon: "🌙", badge: "رمضان",           bg: "rgba(245,158,11,.06)"  },
  khatm_quran:     { accent: "#059669", grad: "from-emerald-600/15 to-teal-500/10",    icon: "📖", badge: "ختم القرآن",      bg: "rgba(5,150,105,.06)"   },
  sunan:           { accent: "#38bdf8", grad: "from-sky-400/15 to-cyan-400/10",        icon: "☀️", badge: "السنن",           bg: "rgba(56,189,248,.06)"  },
  sahaba_duas:     { accent: "#a855f7", grad: "from-purple-500/15 to-fuchsia-400/10",   icon: "🤲", badge: "دعاء الصحابة",    bg: "rgba(168,85,247,.06)"  },
  dua_istiadha:    { accent: "#ef4444", grad: "from-red-500/15 to-orange-400/10",       icon: "🛡️", badge: "الاستعاذة",       bg: "rgba(239,68,68,.06)"   },
  dua_maghfira:    { accent: "#22c55e", grad: "from-green-500/15 to-emerald-400/10",    icon: "🤲", badge: "المغفرة والتوبة", bg: "rgba(34,197,94,.06)"   },
  dua_huda:        { accent: "#3b82f6", grad: "from-blue-500/15 to-sky-400/10",         icon: "🧭", badge: "الهداية والثبات", bg: "rgba(59,130,246,.06)"  },
  sunan_salah:     { accent: "#10b981", grad: "from-emerald-500/15 to-teal-400/10",     icon: "🕌", badge: "سنن الصلاة",      bg: "rgba(16,185,129,.06)"  },
  sunan_purity:    { accent: "#06b6d4", grad: "from-cyan-500/15 to-sky-400/10",         icon: "💧", badge: "سنن الطهارة",     bg: "rgba(6,182,212,.06)"   },
  sunan_dhikr:     { accent: "#8b5cf6", grad: "from-violet-500/15 to-purple-400/10",    icon: "📿", badge: "سنن الذكر",       bg: "rgba(139,92,246,.06)"  },
  sunan_siyam:     { accent: "#f59e0b", grad: "from-amber-500/15 to-yellow-400/10",     icon: "🌙", badge: "سنن الصيام",      bg: "rgba(245,158,11,.06)"  },
  sunan_adab:      { accent: "#f97316", grad: "from-orange-500/15 to-amber-400/10",     icon: "🤝", badge: "سنن الآداب",      bg: "rgba(249,115,22,.06)"  },
  sunan_akhlaq:    { accent: "#ec4899", grad: "from-pink-500/15 to-rose-400/10",        icon: "💛", badge: "سنن الأخلاق",     bg: "rgba(236,72,153,.06)"  },
  sunan_hajj:      { accent: "#dc2626", grad: "from-red-600/15 to-rose-500/10",         icon: "🕋", badge: "سنن الحج",        bg: "rgba(220,38,38,.06)"   },
  sunan_hady:      { accent: "#0ea5e9", grad: "from-sky-500/15 to-blue-400/10",         icon: "☀️", badge: "هدي النبي ﷺ",     bg: "rgba(14,165,233,.06)"  },
  sunan_janaiz:    { accent: "#6b7280", grad: "from-gray-500/15 to-slate-500/10",       icon: "🌿", badge: "سنن الجنائز",     bg: "rgba(107,114,128,.06)" },
  my_adhkar:       { accent: "#ec4899", grad: "from-pink-500/15 to-rose-400/10",       icon: "✦", badge: "أذكاري",           bg: "rgba(236,72,153,.06)"  },
  custom:          { accent: "#ec4899", grad: "from-pink-500/15 to-rose-400/10",       icon: "✦", badge: "خاص",              bg: "rgba(236,72,153,.06)"  },
  al_mudhaaf:      { accent: "#10b981", grad: "from-emerald-500/15 to-teal-400/10",    icon: "💫", badge: "المضاعف",          bg: "rgba(16,185,129,.06)"  },
  istighfar_100:   { accent: "#22c55e", grad: "from-green-500/15 to-emerald-400/10",    icon: "🤲", badge: "استغفار",          bg: "rgba(34,197,94,.06)"   },
  multiplied_dhikr:{ accent: "#f59e0b", grad: "from-amber-500/15 to-yellow-400/10",   icon: "✨", badge: "متنوع",            bg: "rgba(245,158,11,.06)"  },
};

const DEFAULT_IDENTITY: SectionIdentity = {
  accent: "var(--accent)",
  grad: "from-white/5 to-transparent",
  icon: "📖",
  badge: "أذكار",
  bg: "var(--card)",
};

export function getSectionIdentity(sectionId: string): SectionIdentity {
  if (!sectionId) return DEFAULT_IDENTITY;
  // Try exact match first
  if (IDENTITIES[sectionId]) return IDENTITIES[sectionId]!;
  // Try prefix match
  for (const [key, val] of Object.entries(IDENTITIES)) {
    if (sectionId.startsWith(key) || key.startsWith(sectionId.split("_")[0]!)) return val;
  }
  return DEFAULT_IDENTITY;
}
