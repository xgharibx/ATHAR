/**
 * T8: IndexedDB cache for Quran dataset via Dexie.js
 *
 * Persists the parsed QuranDB so subsequent app loads skip the
 * large JSON network fetch + parse step entirely.
 */
import Dexie, { type Table } from "dexie";
import type { QuranDB } from "@/data/quranTypes";

interface QuranCache {
  key: string;  // primary key — always "quran"
  data: QuranDB;
  cachedAt: number; // unix ms
}

class NoorQuranDexie extends Dexie {
  quranCache!: Table<QuranCache, string>;

  constructor() {
    super("noor-quran-cache-v1");
    this.version(1).stores({
      quranCache: "key",
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
    if (Date.now() - row.cachedAt > MAX_AGE_MS) return null;
    return row.data;
  } catch {
    return null;
  }
}

export async function idbSetQuran(data: QuranDB): Promise<void> {
  try {
    await getDB().quranCache.put({ key: CACHE_KEY, data, cachedAt: Date.now() });
  } catch {
    // IDB write failure is non-fatal — app still works from memory
  }
}
