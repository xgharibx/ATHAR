/**
 * Settings page section catalog + filter helper.
 *
 * The Settings page became a long vertical list of ~10 cards. To make it
 * more "organized, intelligent, smart" without rewriting each Card body,
 * we drive the page from a static SECTION_REGISTRY and a tiny filter
 * function. Each section card carries its own id (matching the
 * <Card id="settings-..."> anchor in Settings.tsx), a short title, a
 * description, the category it belongs to, and free-text search "matches"
 * (Arabic + English keywords the user is most likely to type).
 *
 * The components in Settings.tsx are untouched — `filterSections()` is
 * used by the new search bar UI only.
 */

export type SettingsSectionId =
  | "summary"
  | "appearance"
  | "home-widgets"
  | "reading"
  | "quran"
  | "translation"
  | "tasbeeh"
  | "offline-content"
  | "reminders"
  | "backup"
  | "security"
  | "content"
  | "danger";

export type SettingsCategoryId = "personalize" | "quran" | "data";

export interface SettingsSection {
  id: SettingsSectionId;
  /** Arabic title shown in section nav and header row. */
  title: string;
  /** One-line description also shown to the user and used for search. */
  description: string;
  /** Quick emoji icon for the section nav pill. */
  icon: string;
  /** Top-level group the section belongs to in the page. */
  category: SettingsCategoryId;
  /** Arabic + English keywords. Empty query → matches everything. */
  keywords: string[];
}

export interface SettingsCategory {
  id: SettingsCategoryId;
  title: string;
  description: string;
}

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: "personalize",
    title: "تخصيصي",
    description: "مظهر وتطبيق والصفحة الرئيسية والقراءة",
  },
  {
    id: "quran",
    title: "القرآن",
    description: "كل ما يخص قراءة القرآن والتسبيح",
  },
  {
    id: "data",
    title: "البيانات",
    description: "النسخ الاحتياطي والمزامنة ومنطقة الخطر",
  },
];

/** The canonical order shown on the page. */
export const SECTIONS: SettingsSection[] = [
  {
    id: "summary",
    title: "ملخص بياناتك",
    description: "إحصائيات المفضلة والعلامات وأيام النشاط",
    icon: "✨",
    category: "data",
    keywords: ["ملخص", "بيانات", "إحصائيات", "summary", "stats"],
  },
  {
    id: "appearance",
    title: "المظهر",
    description: "اختر السمة واللون والخلفية والتأثيرات",
    icon: "🎨",
    category: "personalize",
    keywords: ["مظهر", "سمة", "لون", "خلفية", "ثيم", "theme", "appearance", "color"],
  },
  {
    id: "home-widgets",
    title: "الصفحة الرئيسية",
    description: "ترتيب بطاقات الواجهة وإظهارها أو إخفاؤها",
    icon: "🏠",
    category: "personalize",
    keywords: ["الرئيسية", "الصفحة الرئيسية", "ويدجت", "بطاقات", "home widgets", "home"],
  },
  {
    id: "reading",
    title: "القراءة",
    description: "حجم الخط والتباعد والخط والهدف اليومي",
    icon: "📖",
    category: "personalize",
    keywords: ["قراءة", "خط", "حجم", "font", "reading", "goal"],
  },
  {
    id: "quran",
    title: "القرآن",
    description: "التثبيت المحلي وخط المصحف وحيوية الخلفية",
    icon: "📜",
    category: "quran",
    keywords: ["قرآن", "مصحف", "quran", "mushaf", "font"],
  },
  {
    id: "translation",
    title: "ترجمة القرآن",
    description: "اختر مصدر الترجمة الذي يظهر أسفل كل آية",
    icon: "🌐",
    category: "quran",
    keywords: ["ترجمة", "إنجليزي", "أردو", "translation", "english", "urdu"],
  },
  {
    id: "tasbeeh",
    title: "تجربة التسبيح",
    description: "اهتزاز التسبيح وأهداف العدّاد",
    icon: "📿",
    category: "quran",
    keywords: ["تسبيح", "سبحة", "ذكر", "tasbeeh", "dhikr", "counter"],
  },
  {
    id: "offline-content",
    title: "المحتوى دون إنترنت",
    description: "حالة النسخة المحلية للقرآن",
    icon: "📦",
    category: "quran",
    keywords: ["دون", "إنترنت", "offline", "تثبيت", "تحميل"],
  },
  {
    id: "reminders",
    title: "التذكيرات",
    description: "تذكيرات يومية للأذكار والصلوات",
    icon: "🔔",
    category: "personalize",
    keywords: ["تذكير", "تذكيرات", "أذكار", "صلاة", "الصباح", "المساء", "reminder", "notification", "morning", "evening"],
  },
  {
    id: "backup",
    title: "النسخ الاحتياطي",
    description: "تصدير واستيراد بياناتك",
    icon: "💾",
    category: "data",
    keywords: ["نسخ", "احتياطي", "backup", "تصدير", "استيراد", "export", "import"],
  },
  {
    id: "security",
    title: "الأمان والمتقدّم",
    description: "القفل البيومتري وأيقونة التطبيق",
    icon: "🔒",
    category: "personalize",
    keywords: ["أمان", "بيومتري", "بصمة", "security", "biometric", "lock", "icon"],
  },
  {
    id: "content",
    title: "محتوى وأدلة",
    description: "صفحات المرجع في الأدعية والقصص والصلاة",
    icon: "📚",
    category: "personalize",
    keywords: ["محتوى", "أدلة", "أدعية", "قصص", "أنبياء", "content", "library", "guide"],
  },
  {
    id: "danger",
    title: "منطقة الخطر",
    description: "إعادة تعيين البيانات ومسح الذاكرة",
    icon: "⚠️",
    category: "data",
    keywords: ["خطر", "مسح", "حذف", "إعادة", "danger", "reset", "delete", "clear"],
  },
];

/**
 * Trim and lowercase a query so common Arabic prefixes don't bork the match.
 */
function normalize(q: string): string {
  return q.trim().toLowerCase();
}

/**
 * Returns the IDs of sections whose title / description / keywords match the
 * query. Empty / whitespace-only query ⇒ all IDs in canonical order.
 */
export function filterSettingsSections(query: string): SettingsSectionId[] {
  const q = normalize(query);
  const sections = SECTIONS.filter((s) => {
    if (!q) return true;
    const haystack = [s.title, s.description, ...s.keywords].join(" ").toLowerCase();
    return haystack.includes(q);
  });
  return sections.map((s) => s.id);
}

/** Group visible sections by category, keeping each group's canonical order. */
export function groupVisibleSectionsByCategory(
  visibleIds: SettingsSectionId[],
): Array<{ category: SettingsCategory; sections: SettingsSection[] }> {
  const order = new Map(SECTIONS.map((s, i) => [s.id, i] as const));
  const byCat = new Map<SettingsCategoryId, SettingsSection[]>();
  for (const id of visibleIds) {
    const sec = SECTIONS.find((s) => s.id === id);
    if (!sec) continue;
    if (!byCat.has(sec.category)) byCat.set(sec.category, []);
    byCat.get(sec.category)!.push(sec);
  }
  const out: Array<{ category: SettingsCategory; sections: SettingsSection[] }> = [];
  for (const cat of SETTINGS_CATEGORIES) {
    const list = byCat.get(cat.id);
    if (!list || list.length === 0) continue;
    list.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    out.push({ category: cat, sections: list });
  }
  return out;
}

/** Four most-used toggles surfaced in the Quick-toggles panel at the top. */
export type QuickToggleKey = "enableHaptics" | "enableSound" | "darkMode" | "soundProfile";

export const QUICK_TOGGLE_KEYS: QuickToggleKey[] = [
  "enableHaptics",
  "enableSound",
  "darkMode",
  "soundProfile",
];

export function isQuickToggleKey(k: string): k is QuickToggleKey {
  return (QUICK_TOGGLE_KEYS as string[]).includes(k);
}

/** First visible section (used to decide which card opens by default). */
export function firstVisibleSection(query: string): SettingsSectionId | null {
  const ids = filterSettingsSections(query);
  return ids[0] ?? null;
}
