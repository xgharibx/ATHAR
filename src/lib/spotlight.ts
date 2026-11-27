/**
 * Athar in iPhone search (SpotlightPlugin): the 114 surahs, the adhkar
 * sections and the main screens. Typing «الكهف», «أذكار النوم», «القبلة» or
 * «حديث اليوم» in Spotlight opens Athar right there. Indexed once per list version, after
 * start-up, on iPhone only.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { loadAdhkarDB } from "@/data/load";
import { loadQuranDB } from "@/data/quranLoad";

export type SpotlightItem = { route: string; title: string; subtitle?: string; keywords: string[] };

type SpotlightPlugin = {
  index(options: { version: string; items: SpotlightItem[] }): Promise<{ indexed: number }>;
};

/** Main screens people look for by name. */
export const SPOTLIGHT_SECTIONS: SpotlightItem[] = [
  { route: "/prayer-times", title: "مواقيت الصلاة", subtitle: "أثر", keywords: ["صلاة", "أذان", "prayer times"] },
  { route: "/qibla", title: "اتجاه القبلة", subtitle: "أثر", keywords: ["قبلة", "بوصلة", "qibla"] },
  { route: "/sebha", title: "السبحة", subtitle: "أثر", keywords: ["تسبيح", "مسبحة", "tasbeeh"] },
  { route: "/quran/page", title: "المصحف", subtitle: "تابع القراءة في أثر", keywords: ["قرآن", "مصحف", "quran"] },
  { route: "/quran/tasmee", title: "التسميع", subtitle: "سمِّع من حفظك في أثر", keywords: ["حفظ", "تسميع", "memorize"] },
  { route: "/hadith/today", title: "حديث اليوم", subtitle: "مع شرحه في أثر", keywords: ["حديث", "حديث اليوم", "hadith of the day"] },
  { route: "/hadith", title: "الأحاديث", subtitle: "الصحيحان والسنن والموطأ والأربعون في أثر", keywords: ["حديث", "البخاري", "مسلم", "الأربعون النووية", "hadith"] },
  { route: "/asma", title: "أسماء الله الحسنى", subtitle: "أثر", keywords: ["أسماء الله", "asma"] },
  { route: "/duas", title: "الأدعية", subtitle: "أثر", keywords: ["دعاء", "أدعية", "dua"] },
  { route: "/mosques", title: "المساجد القريبة", subtitle: "أثر", keywords: ["مسجد", "mosque"] },
  { route: "/ruqyah", title: "الرقية الشرعية", subtitle: "أثر", keywords: ["رقية", "ruqyah"] },
];

/** Without diacritics and Quranic marks, and without «سورة». */
export function plainSurahName(name: string): string {
  return name
    .replace(/آ/g, "آ")
    .replace(/ٱ/g, "ا")
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
    .replace(/^\s*سورة\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSpotlightItems(
  surahs: ReadonlyArray<{ id: number; name: string; englishName?: string; ayahs: readonly unknown[] }>,
  adhkarSections: ReadonlyArray<{ id: string; title: string }>,
): SpotlightItem[] {
  const surahItems = surahs.map((surah) => {
    const name = plainSurahName(surah.name);
    return {
      route: `/quran/read/${surah.id}`,
      title: `سورة ${name}`,
      subtitle: `${surah.ayahs.length} آية — المصحف في أثر`,
      keywords: [name, surah.englishName ?? "", "سورة", "surah"].filter(Boolean),
    };
  });
  const adhkarItems = adhkarSections
    .filter((section) => /^[A-Za-z0-9_-]+$/.test(section.id))
    .map((section) => ({
      route: `/c/${section.id}`,
      title: section.title,
      subtitle: "أذكار — أثر",
      keywords: [section.title.replace(/^أذكار\s+/, ""), "أذكار", "adhkar"],
    }));
  return [...SPOTLIGHT_SECTIONS, ...surahItems, ...adhkarItems];
}

/** Bump when the list's shape changes, so phones index it again. */
const LIST_VERSION = 2;

export async function indexAppForSpotlight(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return;
  try {
    const [quran, adhkar] = await Promise.all([loadQuranDB(), loadAdhkarDB()]);
    const items = buildSpotlightItems(quran, adhkar.db.sections);
    const version = `${LIST_VERSION}:${items.length}:${items.map((item) => item.title).join("|").length}`;
    await registerPlugin<SpotlightPlugin>("Spotlight").index({ version, items });
  } catch {
    // Search is a convenience: the app works the same without it.
  }
}
