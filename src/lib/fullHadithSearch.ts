/**
 * Hadith search over the WHOLE text of every hadith in the nine books
 * (36,064), not only its opening words. Each book's text, without harakat,
 * is one small file (public/data/hadith/text/{book}.json, written by
 * tools/scripts/hadith-bundle-v2.mjs), loaded on first search and kept in
 * IndexedDB, so search works offline afterwards. One engine for every
 * hadith search in the app.
 *
 * A hadith matches when it holds the exact phrase, or every word of the
 * query anywhere in it; exact phrases come first. Every match is counted,
 * per book too, so the page can say «١٥ نتيجة في ٤ كتب».
 */
import { publicDataUrl } from "@/data/publicAssetUrl";
import { idbGetHadithTextEntry, idbSetHadithText, type HadithTextRow } from "@/lib/hadithIDB";

export const SEARCH_BOOKS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik", "nawawi", "qudsi"] as const;

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/**
 * Text as the search reads it: no harakat or Quranic marks, one alef, ى as
 * ي, ة as ه, letters and digits only. Same as fold() in
 * tools/scripts/hadith-bundle-v2.mjs, which wrote the text files.
 */
export function foldHadithSearch(text: string): string {
  return text
    .replace(MARKS, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي0-9٠-٩]+/g, " ")
    .trim();
}

export interface FullHadithSearchResult {
  bookKey: string;
  n: number;
  /** The hadith's whole text, without harakat. */
  snippet: string;
  grade: string;
  /** Printed-number ref when it is not simply `n` («1144/2»). */
  ref?: string;
  /** True when the hadith holds the query as one phrase. */
  exact: boolean;
}

export type HadithSearchOutcome = {
  results: FullHadithSearchResult[];
  /** Every matching hadith, not only the ones returned. */
  total: number;
  byBook: Record<string, number>;
  /** Books that could not be loaded (offline before their first search). */
  missing: string[];
};

const loaded = new Map<string, HadithTextRow[]>();
const loading = new Map<string, Promise<HadithTextRow[] | null>>();

function isKnownOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function loadBookText(key: string): Promise<HadithTextRow[] | null> {
  const ready = loaded.get(key);
  if (ready) return Promise.resolve(ready);
  let pending = loading.get(key);
  if (!pending) {
    pending = (async () => {
      const cached = await idbGetHadithTextEntry(key);
      if (cached?.isFresh && cached.data.length) {
        loaded.set(key, cached.data);
        return cached.data;
      }
      const stale = cached?.data.length ? cached.data : null;
      if (stale && isKnownOffline()) {
        loaded.set(key, stale);
        return stale;
      }
      try {
        const res = await fetch(publicDataUrl(`data/hadith/text/${key}.json`));
        if (!res.ok) throw new Error(`Hadith text ${key}: HTTP ${res.status}`);
        const body = (await res.json()) as { key?: string; rows?: HadithTextRow[] };
        if (body?.key !== key || !Array.isArray(body.rows) || body.rows.length === 0) throw new Error(`Hadith text ${key} was empty.`);
        loaded.set(key, body.rows);
        void idbSetHadithText(key, body.rows);
        return body.rows;
      } catch {
        // A failed download is retried on the next search; a saved copy still serves.
        if (stale) {
          loaded.set(key, stale);
          return stale;
        }
        return null;
      }
    })().finally(() => loading.delete(key));
    loading.set(key, pending);
  }
  return pending;
}

/** Start loading every book's text in the background, one after another. */
export function prewarmFullHadithSearch(): void {
  void SEARCH_BOOKS.reduce<Promise<unknown>>((chain, key) => chain.then(() => loadBookText(key)), Promise.resolve());
}

/** All nine books are loaded, so a search answers at once. */
export function isFullHadithSearchReady(): boolean {
  return SEARCH_BOOKS.every((key) => loaded.has(key));
}

export async function searchHadithText(
  query: string,
  options: { limit?: number; books?: readonly string[]; onProgress?: (done: number, total: number) => void } = {},
): Promise<HadithSearchOutcome> {
  const limit = options.limit ?? 50;
  const phrase = foldHadithSearch(query);
  const outcome: HadithSearchOutcome = { results: [], total: 0, byBook: {}, missing: [] };
  if (phrase.length < 2) return outcome;
  const words = phrase.split(" ").filter(Boolean);
  const keys = options.books?.length ? SEARCH_BOOKS.filter((key) => options.books!.includes(key)) : [...SEARCH_BOOKS];
  const exact: FullHadithSearchResult[] = [];
  const loose: FullHadithSearchResult[] = [];
  let done = 0;
  for (const key of keys) {
    const rows = await loadBookText(key);
    options.onProgress?.(++done, keys.length);
    if (!rows) {
      outcome.missing.push(key);
      continue;
    }
    for (const row of rows) {
      const text = row[1];
      const isExact = text.includes(phrase);
      if (!isExact && (words.length < 2 || !words.every((word) => text.includes(word)))) continue;
      outcome.total++;
      outcome.byBook[key] = (outcome.byBook[key] ?? 0) + 1;
      const bucket = isExact ? exact : loose;
      if (bucket.length < limit) {
        bucket.push({ bookKey: key, n: row[0], snippet: text, grade: row[2], ...(row[3] ? { ref: row[3] } : {}), exact: isExact });
      }
    }
  }
  outcome.results = [...exact, ...loose].slice(0, limit);
  return outcome;
}

/** The first matches only, for callers that need no counts. */
export async function searchFullHadithCorpus(query: string, limit = 40): Promise<FullHadithSearchResult[]> {
  return (await searchHadithText(query, { limit })).results;
}
