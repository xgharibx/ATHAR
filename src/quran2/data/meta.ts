/**
 * «القرآن الكريم» — the Quran's structure, from Tanzil's metadata (ver 1.0,
 * CC BY 3.0), bundled as public/data/quran2/tanzil-meta.json.
 */

export type Q2SurahMeta = {
  start: number;
  ayahs: number;
  /** Position in the order of revelation. */
  order: number;
  rukus: number;
  name: string;
  tname: string;
  ename: string;
  type: "meccan" | "medinan";
};

export type Q2Ref = [surah: number, ayah: number];

export type Q2Meta = {
  notice: string;
  surahs: Q2SurahMeta[];
  juz: Q2Ref[];
  hizbQuarters: Q2Ref[];
  manzils: Q2Ref[];
  rukus: Q2Ref[];
  /** Where each of the 604 pages of the Madani mushaf starts. */
  pages: Q2Ref[];
  sajdas: Array<[number, number, "obligatory" | "recommended"]>;
};

let metaPromise: Promise<Q2Meta> | null = null;

export function loadQuran2Meta(): Promise<Q2Meta> {
  if (!metaPromise) {
    metaPromise = fetch(`${import.meta.env.BASE_URL}data/quran2/tanzil-meta.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Quran metadata: HTTP ${res.status}`);
        return res.json() as Promise<Q2Meta>;
      })
      .catch((error) => {
        metaPromise = null;
        throw error;
      });
  }
  return metaPromise;
}

/** A single number for an ayah's place in the mushaf: 0 … 6235. */
export function ayahIndex(meta: Q2Meta, s: number, a: number): number {
  return meta.surahs[s - 1]!.start + a - 1;
}

export function refFromIndex(meta: Q2Meta, index: number): Q2Ref {
  let lo = 0;
  let hi = meta.surahs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (meta.surahs[mid]!.start <= index) lo = mid;
    else hi = mid - 1;
  }
  return [lo + 1, index - meta.surahs[lo]!.start + 1];
}

/** Which division (1-based) of a list of starts the ayah falls in. */
function divisionOf(meta: Q2Meta, starts: Q2Ref[], s: number, a: number): number {
  const target = ayahIndex(meta, s, a);
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const [ms, ma] = starts[mid]!;
    if (ayahIndex(meta, ms, ma) <= target) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

export const pageOf = (meta: Q2Meta, s: number, a: number) => divisionOf(meta, meta.pages, s, a);
export const juzOf = (meta: Q2Meta, s: number, a: number) => divisionOf(meta, meta.juz, s, a);
export const hizbQuarterOf = (meta: Q2Meta, s: number, a: number) => divisionOf(meta, meta.hizbQuarters, s, a);

/** The ayahs of a division, as [first, last] mushaf indexes (inclusive). */
function divisionRange(meta: Q2Meta, starts: Q2Ref[], n: number): [number, number] {
  const [s, a] = starts[n - 1]!;
  const first = ayahIndex(meta, s, a);
  const next = starts[n];
  const last = next ? ayahIndex(meta, next[0], next[1]) - 1 : 6235;
  return [first, last];
}

export const pageRange = (meta: Q2Meta, page: number) => divisionRange(meta, meta.pages, page);
export const juzRange = (meta: Q2Meta, juz: number) => divisionRange(meta, meta.juz, juz);

export function sajdaAt(meta: Q2Meta, s: number, a: number): "obligatory" | "recommended" | null {
  const hit = meta.sajdas.find(([ss, aa]) => ss === s && aa === a);
  return hit ? hit[2] : null;
}

/** The surah's pages, first and last. */
export function surahPages(meta: Q2Meta, s: number): [number, number] {
  return [pageOf(meta, s, 1), pageOf(meta, s, meta.surahs[s - 1]!.ayahs)];
}
