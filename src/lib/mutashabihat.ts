/**
 * Mutashabihat (متشابهات) — verses that closely resemble each other in wording,
 * a well-known memorization stumbling block. Data: Waqar144/Quran_Mutashabihat_Data
 * (free to use, GitHub-hosted, CDN via jsDelivr — https://github.com/Waqar144/Quran_Mutashabihat_Data).
 *
 * The raw dataset's top-level keys are JUZ numbers (1-30) — NOT surah numbers, despite
 * looking similar (verified empirically: key "1" spans src ayahs 9-142, key "30" spans
 * 5689-6163, matching juz boundaries, not the 7-ayah length of surah 1). The `ayah`
 * fields inside are absolute/global ayah numbers (1-6236 across the whole Quran)
 * regardless of which juz bucket they're filed under, so this module ignores the juz
 * grouping entirely and flattens everything into one global-ayah-number index.
 * Resolving a global number to a surah/ayah reference reuses the same cumulative-count
 * approach already used by src/pages/QuranPlans.tsx for khatma plan tracking.
 */

export interface AyahRef {
  surahId: number;
  ayahStart: number;
  ayahEnd: number;
}

interface RawRange {
  ayah: number | number[];
}

interface RawEntry {
  src: RawRange;
  muts: RawRange[];
  ctx?: number;
}

type RawData = Record<string, RawEntry[]>;

const DATA_URL = "https://cdn.jsdelivr.net/gh/Waqar144/Quran_Mutashabihat_Data@master/mutashabiha_data.json";

function toRange(ayah: number | number[]): [number, number] {
  if (Array.isArray(ayah)) return [ayah[0], ayah[ayah.length - 1]];
  return [ayah, ayah];
}

/** Flattened index: global ayah number -> every entry whose src range covers it. */
let _indexBySrcAyah: Map<number, RawEntry[]> | null = null;
let _loadingPromise: Promise<Map<number, RawEntry[]>> | null = null;

async function loadIndex(): Promise<Map<number, RawEntry[]>> {
  if (_indexBySrcAyah) return _indexBySrcAyah;
  if (!_loadingPromise) {
    _loadingPromise = fetch(DATA_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Mutashabihat fetch failed: ${r.status}`);
        return r.json() as Promise<RawData>;
      })
      .then((data) => {
        const index = new Map<number, RawEntry[]>();
        for (const entries of Object.values(data)) {
          for (const entry of entries) {
            const [start, end] = toRange(entry.src.ayah);
            for (let g = start; g <= end; g++) {
              const bucket = index.get(g);
              if (bucket) bucket.push(entry);
              else index.set(g, [entry]);
            }
          }
        }
        _indexBySrcAyah = index;
        return index;
      })
      .catch((err) => {
        _loadingPromise = null;
        throw err;
      });
  }
  return _loadingPromise;
}

/** Cumulative-count global-ayah → {surahId, ayahIndex}, same algorithm as QuranPlans.tsx. */
export function globalAyahToRef(
  quranDB: Array<{ id: number; ayahs?: unknown[] }>,
  globalN: number,
): { surahId: number; ayahIndex: number } | null {
  let cumulative = 0;
  for (const surah of quranDB) {
    const count = surah.ayahs?.length ?? 0;
    if (globalN <= cumulative + count) {
      return { surahId: surah.id, ayahIndex: globalN - cumulative };
    }
    cumulative += count;
  }
  return null;
}

/** Reverse of globalAyahToRef: {surahId, ayahIndex} → global ayah number (1-6236). */
export function refToGlobalAyah(
  quranDB: Array<{ id: number; ayahs?: unknown[] }>,
  surahId: number,
  ayahIndex: number,
): number | null {
  let cumulative = 0;
  for (const surah of quranDB) {
    if (surah.id === surahId) return cumulative + ayahIndex;
    cumulative += surah.ayahs?.length ?? 0;
  }
  return null;
}

export interface MutashabihMatch {
  ref: AyahRef;
  /** Set when the match is only meaningfully similar including a bit of trailing context. */
  showContext: boolean;
}

/**
 * Returns the known mutashabihat matches for a given ayah (or the ayah range it's
 * part of, e.g. src covering ayahs 53-54 also matches when asked about ayah 54).
 * Requires the already-loaded Quran DB (src/data/useQuranDB.ts) to resolve global
 * ayah numbers to/from surah/ayah references.
 */
export async function getMutashabihatForAyah(
  quranDB: Array<{ id: number; ayahs?: unknown[] }>,
  surahId: number,
  ayahIndex: number,
): Promise<MutashabihMatch[]> {
  const globalN = refToGlobalAyah(quranDB, surahId, ayahIndex);
  if (globalN == null) return [];

  const index = await loadIndex();
  const entries = index.get(globalN) ?? [];
  const matches: MutashabihMatch[] = [];

  for (const entry of entries) {
    for (const m of entry.muts) {
      const [gStart, gEnd] = toRange(m.ayah);
      const startRef = globalAyahToRef(quranDB, gStart);
      const endRef = globalAyahToRef(quranDB, gEnd);
      if (!startRef || !endRef) continue;
      matches.push({
        ref: { surahId: startRef.surahId, ayahStart: startRef.ayahIndex, ayahEnd: endRef.ayahIndex },
        showContext: !!entry.ctx,
      });
    }
  }

  return matches;
}
