/** Islamic Quran metadata: revelation type and starting juz per surah. */

export type RevelationType = "meccan" | "medinan";

/** Whether each surah was revealed in Mecca or Medina (scholarly consensus). */
export const SURAH_REVELATION: Record<number, RevelationType> = {
  1: "meccan",  2: "medinan", 3: "medinan", 4: "medinan", 5: "medinan",
  6: "meccan",  7: "meccan",  8: "medinan", 9: "medinan", 10: "meccan",
  11: "meccan", 12: "meccan", 13: "medinan", 14: "meccan", 15: "meccan",
  16: "meccan", 17: "meccan", 18: "meccan",  19: "meccan", 20: "meccan",
  21: "meccan", 22: "medinan", 23: "meccan", 24: "medinan", 25: "meccan",
  26: "meccan", 27: "meccan", 28: "meccan",  29: "meccan", 30: "meccan",
  31: "meccan", 32: "meccan", 33: "medinan", 34: "meccan", 35: "meccan",
  36: "meccan", 37: "meccan", 38: "meccan",  39: "meccan", 40: "meccan",
  41: "meccan", 42: "meccan", 43: "meccan",  44: "meccan", 45: "meccan",
  46: "meccan", 47: "medinan", 48: "medinan", 49: "medinan", 50: "meccan",
  51: "meccan", 52: "meccan", 53: "meccan",  54: "meccan", 55: "medinan",
  56: "meccan", 57: "medinan", 58: "medinan", 59: "medinan", 60: "medinan",
  61: "medinan", 62: "medinan", 63: "medinan", 64: "medinan", 65: "medinan",
  66: "medinan", 67: "meccan", 68: "meccan",  69: "meccan", 70: "meccan",
  71: "meccan",  72: "meccan", 73: "meccan",  74: "meccan", 75: "meccan",
  76: "medinan", 77: "meccan", 78: "meccan",  79: "meccan", 80: "meccan",
  81: "meccan",  82: "meccan", 83: "meccan",  84: "meccan", 85: "meccan",
  86: "meccan",  87: "meccan", 88: "meccan",  89: "meccan", 90: "meccan",
  91: "meccan",  92: "meccan", 93: "meccan",  94: "meccan", 95: "meccan",
  96: "meccan",  97: "meccan", 98: "medinan", 99: "medinan", 100: "meccan",
  101: "meccan", 102: "meccan", 103: "meccan", 104: "meccan", 105: "meccan",
  106: "meccan", 107: "meccan", 108: "meccan", 109: "meccan", 110: "medinan",
  111: "meccan", 112: "meccan", 113: "meccan", 114: "meccan",
};

/**
 * The juz (1–30) in which each surah's first ayah falls.
 * Surahs that span multiple juz are listed by their starting juz.
 */
export const SURAH_JUZ: Record<number, number> = {
  1: 1,   2: 1,   3: 3,   4: 4,   5: 6,   6: 7,   7: 8,   8: 9,   9: 10,
  10: 11, 11: 11, 12: 12, 13: 13, 14: 13, 15: 14, 16: 14, 17: 15, 18: 15, 19: 16,
  20: 16, 21: 17, 22: 17, 23: 18, 24: 18, 25: 18, 26: 19, 27: 19, 28: 20, 29: 20,
  30: 21, 31: 21, 32: 21, 33: 21, 34: 22, 35: 22, 36: 22, 37: 23, 38: 23, 39: 23,
  40: 24, 41: 24, 42: 25, 43: 25, 44: 25, 45: 25, 46: 26, 47: 26, 48: 26, 49: 26,
  50: 26, 51: 26, 52: 27, 53: 27, 54: 27, 55: 27, 56: 27, 57: 27, 58: 28, 59: 28,
  60: 28, 61: 28, 62: 28, 63: 28, 64: 28, 65: 28, 66: 28, 67: 29, 68: 29, 69: 29,
  70: 29, 71: 29, 72: 29, 73: 29, 74: 29, 75: 29, 76: 29, 77: 29, 78: 30, 79: 30,
  80: 30, 81: 30, 82: 30, 83: 30, 84: 30, 85: 30, 86: 30, 87: 30, 88: 30, 89: 30,
  90: 30, 91: 30, 92: 30, 93: 30, 94: 30, 95: 30, 96: 30, 97: 30, 98: 30, 99: 30,
  100: 30, 101: 30, 102: 30, 103: 30, 104: 30, 105: 30, 106: 30, 107: 30, 108: 30, 109: 30,
  110: 30, 111: 30, 112: 30, 113: 30, 114: 30,
};

/** Total number of ayahs in the Quran. */
export const TOTAL_QURAN_AYAHS = 6236;

/**
 * The (surah, ayah) where each of the 60 hizbs begins — real Mushaf
 * boundary data (derived from hizb_quarter markers, whole-hizb granularity:
 * ceil(quarter/4)), not a page-proportion estimate. Sorted by surah then
 * ayah, so getHizbForAyah() can binary-search it directly.
 * Source: malekverse/quran-dataset (per-ayah juz/hizb/ruku metadata).
 */
export const HIZB_START: { hizb: number; surah: number; ayah: number }[] = [
  { hizb: 1, surah: 1, ayah: 1 }, { hizb: 2, surah: 2, ayah: 75 }, { hizb: 3, surah: 2, ayah: 142 },
  { hizb: 4, surah: 2, ayah: 203 }, { hizb: 5, surah: 2, ayah: 253 }, { hizb: 6, surah: 3, ayah: 15 },
  { hizb: 7, surah: 3, ayah: 93 }, { hizb: 8, surah: 3, ayah: 171 }, { hizb: 9, surah: 4, ayah: 24 },
  { hizb: 10, surah: 4, ayah: 88 }, { hizb: 11, surah: 4, ayah: 148 }, { hizb: 12, surah: 5, ayah: 27 },
  { hizb: 13, surah: 5, ayah: 82 }, { hizb: 14, surah: 6, ayah: 36 }, { hizb: 15, surah: 6, ayah: 111 },
  { hizb: 16, surah: 7, ayah: 1 }, { hizb: 17, surah: 7, ayah: 88 }, { hizb: 18, surah: 7, ayah: 171 },
  { hizb: 19, surah: 8, ayah: 41 }, { hizb: 20, surah: 9, ayah: 34 }, { hizb: 21, surah: 9, ayah: 93 },
  { hizb: 22, surah: 10, ayah: 26 }, { hizb: 23, surah: 11, ayah: 6 }, { hizb: 24, surah: 11, ayah: 84 },
  { hizb: 25, surah: 12, ayah: 53 }, { hizb: 26, surah: 13, ayah: 19 }, { hizb: 27, surah: 15, ayah: 1 },
  { hizb: 28, surah: 16, ayah: 51 }, { hizb: 29, surah: 17, ayah: 1 }, { hizb: 30, surah: 17, ayah: 99 },
  { hizb: 31, surah: 18, ayah: 75 }, { hizb: 32, surah: 20, ayah: 1 }, { hizb: 33, surah: 21, ayah: 1 },
  { hizb: 34, surah: 22, ayah: 1 }, { hizb: 35, surah: 23, ayah: 1 }, { hizb: 36, surah: 24, ayah: 21 },
  { hizb: 37, surah: 25, ayah: 21 }, { hizb: 38, surah: 26, ayah: 111 }, { hizb: 39, surah: 27, ayah: 56 },
  { hizb: 40, surah: 28, ayah: 51 }, { hizb: 41, surah: 29, ayah: 46 }, { hizb: 42, surah: 31, ayah: 22 },
  { hizb: 43, surah: 33, ayah: 31 }, { hizb: 44, surah: 34, ayah: 24 }, { hizb: 45, surah: 36, ayah: 28 },
  { hizb: 46, surah: 37, ayah: 145 }, { hizb: 47, surah: 39, ayah: 32 }, { hizb: 48, surah: 40, ayah: 41 },
  { hizb: 49, surah: 41, ayah: 47 }, { hizb: 50, surah: 43, ayah: 24 }, { hizb: 51, surah: 46, ayah: 1 },
  { hizb: 52, surah: 48, ayah: 18 }, { hizb: 53, surah: 51, ayah: 31 }, { hizb: 54, surah: 55, ayah: 1 },
  { hizb: 55, surah: 58, ayah: 1 }, { hizb: 56, surah: 62, ayah: 1 }, { hizb: 57, surah: 67, ayah: 1 },
  { hizb: 58, surah: 72, ayah: 1 }, { hizb: 59, surah: 78, ayah: 1 }, { hizb: 60, surah: 87, ayah: 1 },
];

/** Returns "مكية" or "مدنية" for a surah ID. */
export function getSurahRevelationLabel(surahId: number): string {
  return SURAH_REVELATION[surahId] === "medinan" ? "مدنية" : "مكية";
}

/** Returns the juz (1–30) where the surah's first ayah falls. */
export function getSurahJuz(surahId: number): number {
  return SURAH_JUZ[surahId] ?? 1;
}

/** Returns the hizb (1–60) that a given (surah, ayah) falls in, from real
 *  Mushaf boundary data — not a page-proportion estimate. */
export function getHizbForAyah(surahId: number, ayah: number): number {
  let result = 1;
  for (const b of HIZB_START) {
    if (b.surah < surahId || (b.surah === surahId && b.ayah <= ayah)) {
      result = b.hizb;
    } else {
      break;
    }
  }
  return result;
}

/** Returns the juz (1–30) that a given (surah, ayah) falls in — every juz
 *  is exactly 2 hizbs, so this reuses the same real boundary data. More
 *  precise than getSurahJuz() (surah-level) for ayahs inside a surah that
 *  spans a juz boundary. */
export function getJuzForAyah(surahId: number, ayah: number): number {
  return Math.ceil(getHizbForAyah(surahId, ayah) / 2);
}

/** Converts Western digits to Arabic-Indic (Eastern Arabic) numerals. */
export function toArabicNumeral(n: number): string {
  const map = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(Math.max(0, Math.floor(n))).replace(/\d/g, (d) => map[Number(d)] ?? d);
}

/**
 * Strip Arabic diacritics (tashkeel) from a string when the user has
 * enabled `prefs.stripDiacritics`. Covers:
 *   - U+0610–U+061A  Qur'anic annotation signs
 *   - U+064B–U+065F  standard tashkeel (fathah, kasrah, dammah, shadda, sukun, etc.)
 *   - U+0670        superscript alef
 *   - U+06D6–U+06ED  additional marks (sajdah, etc.)
 * Pass `strip=false` to get the input back unchanged.
 * Letters such as ٱ (U+0671 alef wasla) are intentionally kept because
 * they carry pronunciation info that doesn't decompose into tashkeel alone.
 */
export function maybeStripDiacritics(text: string, strip: boolean): string {
  if (!strip) return text;
  return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
}
