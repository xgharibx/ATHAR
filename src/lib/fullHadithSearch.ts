/**
 * Full-corpus hadith search — the ONE search implementation every hadith
 * search surface in the app uses (Library, the /hadith book gallery),
 * searching across all 36,472 hadiths in the 9 bundled books, not just a
 * per-page subset. Loads a compact pre-built index (bookKey, n, snippet,
 * grade) lazily on first search, then caches it in IndexedDB so later
 * sessions don't re-download it — same lazy-then-offline pattern as the
 * book packs themselves.
 */
import { publicDataUrl } from "@/data/publicAssetUrl";
import { normalizeArabicSearch } from "@/lib/arabic";
import { idbGetSearchIndexEntry, idbSetSearchIndex, type FullSearchIndexEntry } from "@/lib/hadithIDB";

export interface FullHadithSearchResult {
  bookKey: string;
  n: number;
  snippet: string;
  grade: string;
}

let cache: FullSearchIndexEntry[] | null = null;
let loading: Promise<FullSearchIndexEntry[]> | null = null;

async function loadIndex(): Promise<FullSearchIndexEntry[]> {
  if (cache) return cache;
  if (!loading) {
    loading = (async () => {
      const cached = await idbGetSearchIndexEntry();
      if (cached?.isFresh) {
        cache = cached.data;
        return cached.data;
      }
      const stale = cached?.data.length ? cached.data : null;
      if (stale && typeof navigator !== "undefined" && navigator.onLine === false) {
        cache = stale;
        return stale;
      }

      try {
        const res = await fetch(publicDataUrl("data/hadith/search-index.json"));
        if (!res.ok) throw new Error(`Hadith search index request failed (${res.status}).`);
        const data: FullSearchIndexEntry[] = await res.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error("Hadith search index response was empty.");
        cache = data;
        void idbSetSearchIndex(data);
        return data;
      } catch (error) {
        if (stale) {
          cache = stale;
          return stale;
        }
        throw error;
      }
    })().catch(() => []).finally(() => {
      loading = null;
    });
  }
  return loading;
}

/** Kick off the index download/cache-read in the background, without blocking on a search. */
export function prewarmFullHadithSearch(): void {
  void loadIndex();
}

export async function searchFullHadithCorpus(query: string, limit = 40): Promise<FullHadithSearchResult[]> {
  const term = normalizeArabicSearch(query.trim());
  if (term.length < 2) return [];
  const index = await loadIndex();
  const out: FullHadithSearchResult[] = [];
  for (const [bookKey, n, snippet, grade] of index) {
    if (normalizeArabicSearch(snippet).includes(term)) {
      out.push({ bookKey, n, snippet, grade });
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function isFullHadithSearchReady(): boolean {
  return cache !== null;
}
