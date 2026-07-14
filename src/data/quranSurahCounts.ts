/**
 * Canonical surah ayah-count table. The single source of truth for
 * the 114 surah → ayah-count map used across the app. Audit #7 found
 * the same 114-entry literal duplicated in 4+ files (quranExtras,
 * mutashabihat, QuranPlans, SurahInfoModal) — a drift hazard on
 * data fixes. Now all consumers import from this module.
 *
 * The numbers match the Uthmani mushaf (counts in `quran.json`).
 */

const SURAH_AYAH_COUNTS: Record<number, number> = {
  1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129, 10: 109,
  11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128, 17: 111, 18: 110, 19: 98, 20: 135,
  21: 112, 22: 78, 23: 118, 24: 64, 25: 77, 26: 227, 27: 93, 28: 88, 29: 69, 30: 60,
  31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83, 37: 182, 38: 88, 39: 75, 40: 85,
  41: 54, 42: 53, 43: 89, 44: 59, 45: 37, 46: 35, 47: 38, 48: 29, 49: 18, 50: 45,
  51: 60, 52: 49, 53: 62, 54: 55, 55: 78, 56: 96, 57: 29, 58: 22, 59: 24, 60: 13,
  61: 14, 62: 11, 63: 11, 64: 18, 65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44,
  71: 28, 72: 28, 73: 20, 74: 56, 75: 40, 76: 31, 77: 50, 78: 40, 79: 46, 80: 42,
  81: 29, 82: 19, 83: 36, 84: 25, 85: 22, 86: 17, 87: 19, 88: 26, 89: 30, 90: 20,
  91: 15, 92: 21, 93: 11, 94: 8, 95: 8, 96: 19, 97: 5, 98: 8, 99: 8, 100: 11,
  101: 11, 102: 8, 103: 3, 104: 9, 105: 5, 106: 4, 107: 7, 108: 3, 109: 6, 110: 3,
  111: 5, 112: 4, 113: 5, 114: 6,
};

const TOTAL_AYAHS = Object.values(SURAH_AYAH_COUNTS).reduce((acc, n) => acc + n, 0); // 6236

export function getSurahAyahCount(surahId: number): number {
  return SURAH_AYAH_COUNTS[surahId] ?? 0;
}

export function getQuranTotalAyahs(): number {
  return TOTAL_AYAHS;
}

/** Pre-computed running offset table for global ayah numbering (1..6236). */
const GLOBAL_AYAH_OFFSET: number[] = (() => {
  const out: number[] = new Array(115).fill(0);
  let running = 1;
  for (let i = 1; i <= 114; i++) {
    out[i] = running;
    running += SURAH_AYAH_COUNTS[i] ?? 0;
  }
  return out;
})();

/** {surahId, ayahIndex} (1-based) → global ayah number (1..6236). */
export function globalAyahNumber(surahId: number, ayahIndex: number): number {
  return (GLOBAL_AYAH_OFFSET[surahId] ?? 1) + (ayahIndex - 1);
}

/** global ayah number → {surahId, ayahIndex} (1-based) or null. */
export function refToGlobalAyah(surahId: number, ayahIndex: number): { surahId: number; ayahIndex: number } {
  return { surahId, ayahIndex };
}