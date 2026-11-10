import { getHizbForAyah, getJuzForAyah } from "@/lib/quranMeta";

type SurahAyahs = { id: number; ayahs: readonly unknown[] };

/** True when any ayah in the surah belongs to the requested juz. */
export function surahContainsJuz(surahId: number, ayahCount: number, juz: number): boolean {
  return getFirstAyahOfJuz(surahId, ayahCount, juz) !== null;
}

/** Returns the first ayah in this surah that belongs to the requested juz. */
export function getFirstAyahOfJuz(surahId: number, ayahCount: number, juz: number): number | null {
  if (!Number.isInteger(ayahCount) || ayahCount < 1 || !Number.isInteger(juz) || juz < 1 || juz > 30) {
    return null;
  }

  let low = 1;
  let high = ayahCount + 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (getJuzForAyah(surahId, mid) >= juz) high = mid;
    else low = mid + 1;
  }

  return low <= ayahCount && getJuzForAyah(surahId, low) === juz ? low : null;
}

function getBoundaryProgress(
  surahs: readonly SurahAyahs[],
  readingHistory: Readonly<Record<string, number>>,
  getBoundary: (surahId: number, ayah: number) => number,
): Record<number, number> {
  const totals: Record<number, { read: number; total: number }> = {};

  for (const surah of surahs) {
    const maxRead = Math.min(
      surah.ayahs.length,
      Math.max(0, Math.floor(readingHistory[String(surah.id)] ?? 0)),
    );
    for (let ayah = 1; ayah <= surah.ayahs.length; ayah += 1) {
      const boundary = getBoundary(surah.id, ayah);
      const tally = (totals[boundary] ??= { read: 0, total: 0 });
      tally.total += 1;
      if (ayah <= maxRead) tally.read += 1;
    }
  }

  return Object.fromEntries(
    Object.entries(totals).map(([juz, { read, total }]) => [
      Number(juz),
      total > 0 ? Math.min(100, Math.round((read / total) * 100)) : 0,
    ]),
  );
}

/** Calculates each juz's read percentage from its own ayahs, not surah starts. */
export function getJuzProgress(
  surahs: readonly SurahAyahs[],
  readingHistory: Readonly<Record<string, number>>,
): Record<number, number> {
  return getBoundaryProgress(surahs, readingHistory, getJuzForAyah);
}

/** Calculates completed-hizb marker percentages from the same ayah history. */
export function getHizbProgress(
  surahs: readonly SurahAyahs[],
  readingHistory: Readonly<Record<string, number>>,
): Record<number, number> {
  return getBoundaryProgress(surahs, readingHistory, getHizbForAyah);
}
