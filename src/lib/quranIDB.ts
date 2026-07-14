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
