import { QuranFileSchema, QuranPageMapSchema, type QuranDB, type QuranPageMap } from "./quranTypes";
import {
  idbGetQuran,
  idbSetQuran,
  idbGetPageMap,
  idbSetPageMap,
  idbGetPageIndex,
  idbSetPageIndex,
} from "@/lib/quranIDB";
import { publicDataUrl } from "./publicAssetUrl";

const REMOTE_QURAN_JSON = "https://xgharibx.github.io/ImamAhmed/data/quran.json";
const REMOTE_QURAN_PAGE_MAP_JSON = "https://ahmedelfashny.com/data/quran_page_map.json";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
  return await res.json();
}

/**
 * Loads Quran dataset.
 *
 * Cache hierarchy:
 * 1. IndexedDB (Dexie) — instant, parsed data, survives page refreshes
 * 2. public/data/quran.json — bundled in the web build and Capacitor APK
 * 3. Remote CDN — last-resort network fallback
 */
export async function loadQuranDB(): Promise<QuranDB> {
  // T8: Try IDB cache first
  const cached = await idbGetQuran();
  if (cached) return cached;

  const localUrl = publicDataUrl("data/quran.json");

  let result: QuranDB;
  try {
    const json = await fetchJson(localUrl);
    result = QuranFileSchema.parse(json).surahs;
  } catch {
    const json = await fetchJson(REMOTE_QURAN_JSON);
    result = QuranFileSchema.parse(json).surahs;
  }

  // Persist to IDB for next load (fire-and-forget)
  void idbSetQuran(result);
  return result;
}

export async function loadQuranPageMap(): Promise<QuranPageMap> {
  // Try IDB cache first (same 30-day TTL as Quran DB)
  const cached = await idbGetPageMap();
  if (cached) return cached;

  const localUrl = publicDataUrl("data/quran_page_map.json");

  let result: QuranPageMap;
  try {
    const json = await fetchJson(localUrl);
    result = QuranPageMapSchema.parse(json);
  } catch {
    const json = await fetchJson(REMOTE_QURAN_PAGE_MAP_JSON);
    result = QuranPageMapSchema.parse(json);
  }

  // Persist to IDB for next load (fire-and-forget)
  void idbSetPageMap(result);
  return result;
}

/**
 * Cached, IDB-backed fetch of the pre-built page index. The caller passes in
 * the *fresh* quranDB + pageMap so we can rebuild the index on cache miss and
 * persist the result. The returned `entries` are [page, items] tuples ready
 * to be reassembled into a Map<number, PageItem[]>.
 */
export async function loadQuranPageIndex(): Promise<{
  entries: Array<[number, unknown[]]>;
  fromCache: boolean;
}> {
  // 1. IDB cache
  const cached = await idbGetPageIndex();
  if (cached && cached.entries.length > 0) {
    return { entries: cached.entries, fromCache: true };
  }
  // 2. Build from quranDB + pageMap (caller is expected to load these first).
  const quran = await loadQuranDB();
  const pm = await loadQuranPageMap();
  // Re-import buildPageIndex dynamically to keep quranLoad pure (avoids a
  // circular dep with the React pages folder where the builder lives).
  const { buildPageIndexForCache } = await import("./pageIndexBuilder");
  const idx = buildPageIndexForCache(quran, pm.map);
  const entries = Array.from(idx.entries());
  // Fire-and-forget persist
  void idbSetPageIndex(entries);
  return { entries, fromCache: false };
}
