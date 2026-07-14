/**
 * T8: IndexedDB cache for Quran dataset via Dexie.js
 *
 * Persists the parsed QuranDB so subsequent app loads skip the
 * large JSON network fetch + parse step entirely.
 */
import Dexie, { type Table } from "dexie";
import type { QuranDB, QuranPageMap } from "@/data/quranTypes";

interface QuranCache {
  key: string;  // primary key — always "quran"
  data: QuranDB;
  cachedAt: number; // unix ms
  pinnedAt?: number; // user-requested offline download; do not expire by TTL
}

interface PageMapCache {
  key: string; // primary key — always "page_map"
  data: QuranPageMap;
  cachedAt: number;
  pinnedAt?: number;
}

interface PageIndexCache {
  key: string; // primary key — always "page_index"
  // The page index is a Map<number, PageItem[]>, but Dexie/IDB can only
  // // round-trip plain JS values. We store entries as [page, items] pairs and
  // // let the caller reassemble. `schemaVersion` lets us invalidate older
  // // shapes if PageItem changes.
  entries: Array<[number, unknown[]]>;
  cachedAt: number;
  pinnedAt?: number;
  schemaVersion: number;
}

interface ExtrasCache {
  key: string;
  value: unknown;
  cachedAt: number;
}

export type QuranOfflineCacheMeta = {
  cachedAt: number;
  pinnedAt?: number;
  stale: boolean;
};

class NoorQuranDexie extends Dexie {
  quranCache!: Table<QuranCache, string>;
  pageMapCache!: Table<PageMapCache, string>;
  pageIndexCache!: Table<PageIndexCache, string>;
  extrasCache!: Table<ExtrasCache, string>;

  constructor() {
    super("noor-quran-cache-v1");
    this.version(1).stores({
      quranCache: "key",
    });
    this.version(2).stores({
      quranCache: "key",
      pageMapCache: "key",
    });
    this.version(3).stores({
      quranCache: "key",
      pageMapCache: "key",
      extrasCache: "key",
    });
    this.version(4).stores({
      quranCache: "key",
      pageMapCache: "key",
      pageIndexCache: "key",
      extrasCache: "key",
    });
  }
}

let _db: NoorQuranDexie | null = null;

function getDB(): NoorQuranDexie {
  if (!_db) _db = new NoorQuranDexie();
  return _db;
}

const CACHE_KEY = "quran";
// Refresh cached data after 30 days
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function idbGetQuran(): Promise<QuranDB | null> {
  try {
    const row = await getDB().quranCache.get(CACHE_KEY);
    if (!row) return null;
    if (!row.pinnedAt && Date.now() - row.cachedAt > MAX_AGE_MS) return null;
    return row.data;
  } catch {
    return null;
  }
}

export async function idbSetQuran(data: QuranDB, options?: { pinned?: boolean }): Promise<void> {
  try {
    const existing = await getDB().quranCache.get(CACHE_KEY).catch(() => undefined);
    const now = Date.now();
    await getDB().quranCache.put({
      key: CACHE_KEY,
      data,
      cachedAt: now,
      pinnedAt: options?.pinned ? now : existing?.pinnedAt,
    });
  } catch {
    // IDB write failure is non-fatal — app still works from memory
  }
}

export async function idbGetQuranMeta(): Promise<QuranOfflineCacheMeta | null> {
  try {
    const row = await getDB().quranCache.get(CACHE_KEY);
    if (!row) return null;
    return {
      cachedAt: row.cachedAt,
      pinnedAt: row.pinnedAt,
      stale: !row.pinnedAt && Date.now() - row.cachedAt > MAX_AGE_MS,
    };
  } catch {
    return null;
  }
}

export async function idbSetQuranPinned(pinned: boolean): Promise<void> {
  try {
    const row = await getDB().quranCache.get(CACHE_KEY);
    if (!row) return;
    await getDB().quranCache.put({ ...row, pinnedAt: pinned ? Date.now() : undefined });
  } catch {
    // ignore
  }
}

const PAGE_MAP_KEY = "page_map";

export async function idbGetPageMap(): Promise<QuranPageMap | null> {
  try {
    const row = await getDB().pageMapCache.get(PAGE_MAP_KEY);
    if (!row) return null;
    if (!row.pinnedAt && Date.now() - row.cachedAt > MAX_AGE_MS) return null;
    return row.data;
  } catch {
    return null;
  }
}

export async function idbSetPageMap(data: QuranPageMap, options?: { pinned?: boolean }): Promise<void> {
  try {
    const existing = await getDB().pageMapCache.get(PAGE_MAP_KEY).catch(() => undefined);
    const now = Date.now();
    await getDB().pageMapCache.put({
      key: PAGE_MAP_KEY,
      data,
      cachedAt: now,
      pinnedAt: options?.pinned ? now : existing?.pinnedAt,
    });
  } catch {
    // IDB write failure is non-fatal
  }
}

export async function idbGetPageMapMeta(): Promise<QuranOfflineCacheMeta | null> {
  try {
    const row = await getDB().pageMapCache.get(PAGE_MAP_KEY);
    if (!row) return null;
    return {
      cachedAt: row.cachedAt,
      pinnedAt: row.pinnedAt,
      stale: !row.pinnedAt && Date.now() - row.cachedAt > MAX_AGE_MS,
    };
  } catch {
    return null;
  }
}

export async function idbSetPageMapPinned(pinned: boolean): Promise<void> {
  try {
    const row = await getDB().pageMapCache.get(PAGE_MAP_KEY);
    if (!row) return;
    await getDB().pageMapCache.put({ ...row, pinnedAt: pinned ? Date.now() : undefined });
  } catch {
    // ignore
  }
}

/* ─── Page-index cache ──────────────────────────────────────────────────────
 * The page index (Map<page, PageItem[]>) is built by walking every ayah in
 * quranDB. For 6236 ayahs that's a big synchronous walk that blocks the main
 * thread on Mushaf's first mount. We persist the finished index in IDB and
 * rehydrate it on subsequent visits (30-day TTL, same as quran + page map).
 * Pinned entries never expire.
 *
 * The shape of `entries` is a [page, PageItem[]] tuple list (Maps don't
 * round-trip through IDB). `schemaVersion` is bumped if `PageItem` changes.
 */
const PAGE_INDEX_KEY = "page_index";
export const PAGE_INDEX_SCHEMA_VERSION = 1;

export async function idbGetPageIndex(): Promise<{ entries: Array<[number, unknown[]]> } | null> {
  try {
    const row = await getDB().pageIndexCache.get(PAGE_INDEX_KEY);
    if (!row) return null;
    if (row.schemaVersion !== PAGE_INDEX_SCHEMA_VERSION) return null;
    if (!row.pinnedAt && Date.now() - row.cachedAt > MAX_AGE_MS) return null;
    return { entries: row.entries };
  } catch {
    return null;
  }
}

export async function idbSetPageIndex(
  entries: Array<[number, unknown[]]>,
  options?: { pinned?: boolean },
): Promise<void> {
  try {
    const existing = await getDB().pageIndexCache.get(PAGE_INDEX_KEY).catch(() => undefined);
    const now = Date.now();
    await getDB().pageIndexCache.put({
      key: PAGE_INDEX_KEY,
      entries,
      cachedAt: now,
      pinnedAt: options?.pinned ? now : existing?.pinnedAt,
      schemaVersion: PAGE_INDEX_SCHEMA_VERSION,
    });
  } catch {
    /* best-effort */
  }
}

export async function idbGetPageIndexMeta(): Promise<QuranOfflineCacheMeta | null> {
  try {
    const row = await getDB().pageIndexCache.get(PAGE_INDEX_KEY);
    if (!row) return null;
    return {
      cachedAt: row.cachedAt,
      pinnedAt: row.pinnedAt,
      stale: !row.pinnedAt && Date.now() - row.cachedAt > MAX_AGE_MS,
    };
  } catch {
    return null;
  }
}

/* ─── Generic key/value cache for translation / tafsir bundles ─────── */

export async function idbGetExtras<T>(key: string): Promise<T | null> {
  try {
    const row = await getDB().extrasCache.get(key);
    return (row?.value as T) ?? null;
  } catch {
    return null;
  }
}

export async function idbSetExtras<T>(key: string, value: T): Promise<void> {
  try {
    await getDB().extrasCache.put({ key, value: value as unknown, cachedAt: Date.now() });
  } catch {
    /* best-effort */
  }
}
