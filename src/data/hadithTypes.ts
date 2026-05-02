/**
 * Hadith Types — Phase 2
 * Data model for the full hadith corpus (Kutub al-Sittah + extras)
 */

export interface HadithSection {
  id: number;
  title: string;   // English section title from source
  first: number;   // first hadithnumber in section
  last: number;    // last hadithnumber in section
}

/** Compact hadith item as stored in JSON packs */
export interface HadithItem {
  n: number;    // hadithnumber
  a: number;    // arabicnumber (display number)
  s: number;    // section id
  t: string;    // full Arabic text (isnad + matn)
  g: string[];  // grade strings (sahih | hasan | daif | maudu | raw)
}

/** Full book pack as loaded from public/data/hadith/{key}.json */
export interface HadithPack {
  key: string;
  title: string;       // Arabic title
  titleEn: string;     // English title
  color: string;       // accent hex color
  order: number;       // display order (1 = Bukhari)
  grade: string;       // "sahih" | "mixed"
  description: string; // Arabic description
  count: number;       // total hadith count
  sections: HadithSection[];
  hadiths: HadithItem[];
}

/** Metadata-only entry (from index.json — no hadiths array) */
export interface HadithBookMeta {
  key: string;
  title: string;
  titleEn: string;
  color: string;
  order: number;
  grade: string;
  description: string;
  count: number;
  sectionCount: number;
}

/** Computed grade label for display */
export const HADITH_GRADE_LABELS: Record<string, string> = {
  sahih: "صحيح",
  hasan: "حسن",
  daif: "ضعيف",
  maudu: "موضوع",
};

export function hadithGradeLabel(g: string): string {
  return HADITH_GRADE_LABELS[g] ?? g;
}

/**
 * Extract a short preview of a hadith text (first ~150 chars of matn).
 * The matn typically starts after the isnad chain. We try to find a
 * common marker; if not found, return the last portion of the text.
 */
export function hadithPreview(text: string, maxLen = 140): string {
  if (!text) return "";
  // Common matn markers in Arabic hadith texts
  const markers = [" قَالَ:", " قَالَ :", "قال:", "أَنَّ رَسُولَ", "أن رسول الله", "عَنِ النَّبِيِّ"];
  let start = 0;
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx > 0 && idx < text.length * 0.7) {
      start = idx + 1;
      break;
    }
  }
  const slice = text.slice(start).trim();
  return slice.length > maxLen ? slice.slice(0, maxLen) + "…" : slice;
}

/** Hadith reference string for display (e.g., "صحيح البخاري • ح١") */
export function hadithRef(bookTitle: string, hadithNumber: number): string {
  return `${bookTitle} • ح${hadithNumber}`;
}

/** All supported books with static metadata (used before index.json loads) */
export const HADITH_BOOKS_STATIC: HadithBookMeta[] = [
  {
    key: "bukhari",
    title: "صحيح البخاري",
    titleEn: "Sahih al-Bukhari",
    color: "#10b981",
    order: 1,
    grade: "sahih",
    description: "أصح كتاب في السنة النبوية، جمع الإمام محمد بن إسماعيل البخاري",
    count: 7563,
    sectionCount: 97,
  },
  {
    key: "muslim",
    title: "صحيح مسلم",
    titleEn: "Sahih Muslim",
    color: "#3b82f6",
    order: 2,
    grade: "sahih",
    description: "ثاني أصح كتاب في السنة النبوية، جمع الإمام مسلم بن الحجاج",
    count: 7453,
    sectionCount: 56,
  },
  {
    key: "abudawud",
    title: "سنن أبي داود",
    titleEn: "Sunan Abu Dawud",
    color: "#8b5cf6",
    order: 3,
    grade: "mixed",
    description: "من أمهات كتب السنة، للإمام أبي داود السجستاني",
    count: 5274,
    sectionCount: 43,
  },
  {
    key: "tirmidhi",
    title: "جامع الترمذي",
    titleEn: "Jami at-Tirmidhi",
    color: "#f59e0b",
    order: 4,
    grade: "mixed",
    description: "للإمام محمد بن عيسى الترمذي، مع بيان درجة كل حديث",
    count: 3956,
    sectionCount: 49,
  },
  {
    key: "nasai",
    title: "سنن النسائي",
    titleEn: "Sunan an-Nasai",
    color: "#ef4444",
    order: 5,
    grade: "mixed",
    description: "للإمام أحمد بن شعيب النسائي، من الكتب الستة المعتمدة",
    count: 5761,
    sectionCount: 51,
  },
  {
    key: "ibnmajah",
    title: "سنن ابن ماجه",
    titleEn: "Sunan Ibn Majah",
    color: "#ec4899",
    order: 6,
    grade: "mixed",
    description: "للإمام محمد بن يزيد القزويني ابن ماجه، تمام الكتب الستة",
    count: 4341,
    sectionCount: 37,
  },
  {
    key: "malik",
    title: "موطأ مالك",
    titleEn: "Muwatta Malik",
    color: "#06b6d4",
    order: 7,
    grade: "sahih",
    description: "للإمام مالك بن أنس، أقدم كتاب في السنة النبوية الموثّق",
    count: 1832,
    sectionCount: 61,
  },
  {
    key: "nawawi",
    title: "الأربعون النووية",
    titleEn: "40 Hadith Nawawi",
    color: "#84cc16",
    order: 8,
    grade: "sahih",
    description: "جمع الإمام النووي رحمه الله أجمع أحاديث الإسلام في أربعين حديثاً",
    count: 42,
    sectionCount: 1,
  },
  {
    key: "qudsi",
    title: "الأربعون القدسية",
    titleEn: "40 Hadith Qudsi",
    color: "#f97316",
    order: 9,
    grade: "sahih",
    description: "أحاديث قدسية مختارة، كلام الله عز وجل يرويه النبي ﷺ بأسلوبه",
    count: 40,
    sectionCount: 1,
  },
];
