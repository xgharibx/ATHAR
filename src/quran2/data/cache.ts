/**
 * «القرآن الكريم» — what is fetched once is kept on the device (IndexedDB), so the
 * section keeps working offline after first use.
 */
import Dexie, { type Table } from "dexie";

type Row = { key: string; value: unknown; at: number };

class Quran2DB extends Dexie {
  kv!: Table<Row, string>;
  constructor() {
    super("athar-quran2");
    this.version(1).stores({ kv: "key" });
  }
}

let db: Quran2DB | null = null;
function getDB(): Quran2DB | null {
  if (typeof indexedDB === "undefined") return null;
  if (!db) db = new Quran2DB();
  return db;
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  try {
    const row = await getDB()?.kv.get(key);
    return row?.value as T | undefined;
  } catch {
    return undefined;
  }
}

export async function cachePut(key: string, value: unknown): Promise<void> {
  try {
    await getDB()?.kv.put({ key, value, at: Date.now() });
  } catch {
    // A full or unavailable store only costs a refetch next time.
  }
}

/** Fetch through the device cache: the network once, the device after. */
export async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await load();
  await cachePut(key, value);
  return value;
}

export async function cachedKeys(prefix: string): Promise<string[]> {
  try {
    const keys = await getDB()?.kv.where("key").startsWith(prefix).primaryKeys();
    return (keys ?? []) as string[];
  } catch {
    return [];
  }
}

export async function cacheDelete(keys: string[]): Promise<void> {
  try {
    await getDB()?.kv.bulkDelete(keys);
  } catch {
    // Nothing to do.
  }
}
