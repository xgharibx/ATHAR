/**
 * Hadith IndexedDB — Phase 2
 * Caches full hadith packs in Dexie IDB so subsequent loads are instant
 * and the books work fully offline after first open.
 */
import Dexie, { type Table } from "dexie";
import type { HadithPack } from "@/data/hadithTypes";

interface HadithPackCache {
  key: string;      // bookKey, primary key
  data: HadithPack;
  cachedAt: number; // unix ms
}

class HadithDexie extends Dexie {
  packs!: Table<HadithPackCache, string>;

  constructor() {
    super("athar-hadith-v1");
    this.version(1).stores({
      packs: "key",
    });
  }
}

let _db: HadithDexie | null = null;
function getDB(): HadithDexie {
  if (!_db) _db = new HadithDexie();
  return _db;
}

// Cache packs for 30 days (they change only when we re-import)
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function idbGetHadithPack(bookKey: string): Promise<HadithPack | null> {
  try {
    const row = await getDB().packs.get(bookKey);
    if (!row) return null;
    if (Date.now() - row.cachedAt > MAX_AGE_MS) return null;
    return row.data;
  } catch {
    return null;
  }
}

export async function idbSetHadithPack(pack: HadithPack): Promise<void> {
  try {
    await getDB().packs.put({ key: pack.key, data: pack, cachedAt: Date.now() });
  } catch {
    // IDB write failure is non-fatal — pack stays in memory
  }
}

export async function idbClearHadithPacks(): Promise<void> {
  try {
    await getDB().packs.clear();
  } catch { /* ignore */ }
}
