/**
 * Pure helper that builds the page index from a QuranDB + page map.
 *
 * Lives in `src/data` so both `quranLoad` (for IDB caching) and the Mushaf
 * page (for the reactive rendering) can use the exact same logic without
 * dragging the full Mushaf component in just for the builder.
 */
import type { QuranDB, QuranPageMap } from "./quranTypes";

export interface PageItem {
  surahId: number;
  surahName: string;
  originalAyah: number;
  displayAyah: number; // 0 = basmalah header (not numbered)
  text: string;
  isBasmalahHeader: boolean;
}

const BASMALAH_VARIANTS = [
  "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  "بِسْمِ ٱللَّهِ الرَّحْمَانِ الرَّحِيمِ",
  "بِسْمِ اللَّهِ الرَّحْمَانِ الرَّحِيمِ",
  "بسم الله الرحمن الرحيم",
];
const BASMALAH_NFC = BASMALAH_VARIANTS.map((v) => v.normalize("NFC"));

export function buildPageIndexForCache(
  quranDB: QuranDB,
  pageMap: Record<string, number>,
): Map<number, PageItem[]> {
  const result = new Map<number, PageItem[]>();
  for (const surah of quranDB) {
    const raw = surah.ayahs.map((a) => (a ?? "").replace(/^\uFEFF/, "").normalize("NFC").trim());
    const firstText = raw[0] ?? "";

    const firstIsBasmalah = firstText.length > 0 && (
      surah.id === 1 || BASMALAH_NFC.some((v) => firstText === v)
    );
    const firstHasBasmalahPrefix = !firstIsBasmalah && firstText.length > 0 &&
      BASMALAH_NFC.some((v) => firstText.startsWith(v));
    for (let i = 0; i < raw.length; i++) {
      const originalAyah = i + 1;
      const pageNum = Number(pageMap[`${surah.id}:${originalAyah}`]);
      if (!Number.isFinite(pageNum) || pageNum < 1) continue;

      const isBasmalahHeader = firstIsBasmalah && i === 0 && surah.id !== 1;
      const displayAyah = (firstIsBasmalah && surah.id !== 1) ? (isBasmalahHeader ? 0 : originalAyah - 1) : originalAyah;

      let text = raw[i] ?? "";
      if (i === 0 && firstHasBasmalahPrefix) {
        for (const v of BASMALAH_NFC) {
          if (text.startsWith(v)) { text = text.slice(v.length).trim(); break; }
        }
      }

      if (!result.has(pageNum)) result.set(pageNum, []);
      result.get(pageNum)!.push({
        surahId: surah.id,
        surahName: surah.name,
        originalAyah,
        displayAyah,
        text,
        isBasmalahHeader,
      });
    }
  }
  for (const [, items] of result) {
    items.sort((a, b) => a.surahId - b.surahId || a.originalAyah - b.originalAyah);
  }
  return result;
}