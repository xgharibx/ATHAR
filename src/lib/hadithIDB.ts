/**
 * Hadith IndexedDB — Phase 2 + Phase 11A
 * v1: Caches full hadith packs for offline use.
 * v2: Per-hadith user state (bookmarks, progress, notes, memoCards) moved here
 *     from localStorage to prevent 5 MB quota overflows with 36k hadiths.
 */
import Dexie, { type Table } from "dexie";
import type { HadithMemoCard, HadithPack } from "@/data/hadithTypes";

interface HadithPackCache {
  key: string;      // bookKey, primary key
  data: HadithPack;
  cachedAt: number; // unix ms
}

// --- Phase 11A: per-hadith user state tables ----------------------------
interface HadithBookmarkRow { key: string; val: 1 }        // key = "bookKey:n"
interface HadithProgressRow { bookKey: string; n: number } // last-read hadith n per book
interface HadithNoteRow     { key: string; text: string; updatedAt: number }
interface HadithMemoCardRow { key: string; card: HadithMemoCard; updatedAt: number }

class HadithDexie extends Dexie {
  packs!: Table<HadithPackCache, string>;
  bookmarks!: Table<HadithBookmarkRow, string>;
  progress!:  Table<HadithProgressRow, string>;
  notes!:     Table<HadithNoteRow,     string>;
  memoCards!: Table<HadithMemoCardRow, string>;

  constructor() {
    super("athar-hadith-v1");
    this.version(1).stores({ packs: "key" });
    this.version(2).stores({
      packs:     "key",
      bookmarks: "key",
      progress:  "bookKey",
      notes:     "key",
      memoCards: "key",
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

// ── Phase 11A: per-hadith user state ─────────────────────────────────────────

// Bookmarks
export async function idbSetHadithBookmark(key: string, on: boolean): Promise<void> {
  try {
    if (on) { await getDB().bookmarks.put({ key, val: 1 }); }
    else     { await getDB().bookmarks.delete(key); }
  } catch { /* non-fatal */ }
}

export async function idbGetAllHadithBookmarks(): Promise<Record<string, boolean>> {
  try {
    const rows = await getDB().bookmarks.toArray();
    return Object.fromEntries(rows.map((r) => [r.key, true]));
  } catch { return {}; }
}

// Reading progress (last viewed hadith n per bookKey)
export async function idbSetHadithProgress(bookKey: string, n: number): Promise<void> {
  try { await getDB().progress.put({ bookKey, n }); }
  catch { /* non-fatal */ }
}

export async function idbGetAllHadithProgress(): Promise<Record<string, number>> {
  try {
    const rows = await getDB().progress.toArray();
    return Object.fromEntries(rows.map((r) => [r.bookKey, r.n]));
  } catch { return {}; }
}

// Notes
export async function idbSetHadithNote(key: string, text: string): Promise<void> {
  try { await getDB().notes.put({ key, text, updatedAt: Date.now() }); }
  catch { /* non-fatal */ }
}

export async function idbDeleteHadithNote(key: string): Promise<void> {
  try { await getDB().notes.delete(key); }
  catch { /* non-fatal */ }
}

export async function idbGetAllHadithNotes(): Promise<Record<string, string>> {
  try {
    const rows = await getDB().notes.toArray();
    return Object.fromEntries(rows.map((r) => [r.key, r.text]));
  } catch { return {}; }
}

// Memo cards (SRS)
export async function idbSetHadithMemoCard(key: string, card: HadithMemoCard): Promise<void> {
  try { await getDB().memoCards.put({ key, card, updatedAt: Date.now() }); }
  catch { /* non-fatal */ }
}

export async function idbGetAllHadithMemoCards(): Promise<Record<string, HadithMemoCard>> {
  try {
    const rows = await getDB().memoCards.toArray();
    return Object.fromEntries(rows.map((r) => [r.key, r.card]));
  } catch { return {}; }
}

// One-time migration: write localStorage data (from noorStore v24) into IDB
export async function migrateHadithStateToIDB(data: {
  bookmarks: Record<string, boolean>;
  progress:  Record<string, number>;
  notes:     Record<string, string>;
  memoCards: Record<string, HadithMemoCard>;
}): Promise<void> {
  try {
    const db = getDB();
    await Promise.all([
      db.bookmarks.bulkPut(
        Object.keys(data.bookmarks).filter((k) => data.bookmarks[k]).map((k) => ({ key: k, val: 1 as const }))
      ),
      db.progress.bulkPut(
        Object.entries(data.progress).map(([bookKey, n]) => ({ bookKey, n }))
      ),
      db.notes.bulkPut(
        Object.entries(data.notes).map(([key, text]) => ({ key, text, updatedAt: Date.now() }))
      ),
      db.memoCards.bulkPut(
        Object.entries(data.memoCards).map(([key, card]) => ({ key, card, updatedAt: Date.now() }))
      ),
    ]);
  } catch { /* non-fatal: data still in localStorage until next migration attempt */ }
}
