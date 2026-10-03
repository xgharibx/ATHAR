/**
 * Hadith IndexedDB — Phase 2 + Phase 11A
 * v1: Caches full hadith packs for offline use.
 * v2: Per-hadith user state (bookmarks, progress, notes, memoCards) moved here
 *     from localStorage to prevent 5 MB quota overflows with 36k hadiths.
 */
import Dexie, { type Table } from "dexie";
import type { HadithMemoCard, HadithPack } from "@/data/hadithTypes";
import { accountScopedDatabaseName, getAccountStorageOwner, type AccountStorageOwner } from "@/lib/accountStorageScope";

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

// Phase 12: full-corpus search index (all 36k hadiths, not just curated ones)
export type FullSearchIndexEntry = [bookKey: string, n: number, snippet: string, grade: string];
interface SearchIndexRow { key: "full"; data: FullSearchIndexEntry[]; cachedAt: number }

class HadithDexie extends Dexie {
  packs!: Table<HadithPackCache, string>;
  bookmarks!: Table<HadithBookmarkRow, string>;
  progress!:  Table<HadithProgressRow, string>;
  notes!:     Table<HadithNoteRow,     string>;
  memoCards!: Table<HadithMemoCardRow, string>;
  searchIndex!: Table<SearchIndexRow, string>;

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
    this.version(3).stores({
      packs:       "key",
      bookmarks:   "key",
      progress:    "bookKey",
      notes:       "key",
      memoCards:   "key",
      searchIndex: "key",
    });
  }
}

/** Account-owned reading state is stored separately from the shared public corpus cache. */
class HadithUserDexie extends Dexie {
  bookmarks!: Table<HadithBookmarkRow, string>;
  progress!: Table<HadithProgressRow, string>;
  notes!: Table<HadithNoteRow, string>;
  memoCards!: Table<HadithMemoCardRow, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      bookmarks: "key",
      progress: "bookKey",
      notes: "key",
      memoCards: "key",
    });
  }
}

let _db: HadithDexie | null = null;
const _userDbs = new Map<string, HadithUserDexie>();
function getDB(): HadithDexie {
  if (!_db) _db = new HadithDexie();
  return _db;
}

function getScopedUserDB(owner: AccountStorageOwner = getAccountStorageOwner()): HadithUserDexie {
  const name = accountScopedDatabaseName("athar-hadith-user-v1", owner);
  let db = _userDbs.get(name);
  if (!db) {
    db = new HadithUserDexie(name);
    _userDbs.set(name, db);
  }
  return db;
}

function getUserDB(owner: AccountStorageOwner = getAccountStorageOwner()): HadithDexie | HadithUserDexie {
  return owner === "local" ? getDB() : getScopedUserDB(owner);
}

/** Copy personal Hadith state without duplicating the shared packs/search cache. */
export async function copyHadithUserState(
  sourceOwner: AccountStorageOwner,
  targetOwner: AccountStorageOwner,
): Promise<void> {
  if (sourceOwner === targetOwner) return;
  const source = getUserDB(sourceOwner);
  const target = getUserDB(targetOwner);
  const [sourceBookmarks, sourceProgress, sourceNotes, sourceCards,
    targetBookmarks, targetProgress, targetNotes, targetCards] = await Promise.all([
    source.bookmarks.toArray(), source.progress.toArray(), source.notes.toArray(), source.memoCards.toArray(),
    target.bookmarks.toArray(), target.progress.toArray(), target.notes.toArray(), target.memoCards.toArray(),
  ]);

  const bookmarks = new Map(targetBookmarks.map((row) => [row.key, row]));
  for (const row of sourceBookmarks) bookmarks.set(row.key, row);
  const progress = new Map(targetProgress.map((row) => [row.bookKey, row]));
  for (const row of sourceProgress) {
    const previous = progress.get(row.bookKey);
    if (!previous || row.n > previous.n) progress.set(row.bookKey, row);
  }
  const notes = new Map(sourceNotes.map((row) => [row.key, row]));
  for (const row of targetNotes) notes.set(row.key, row);
  const cards = new Map(sourceCards.map((row) => [row.key, row]));
  for (const row of targetCards) {
    const previous = cards.get(row.key);
    if (!previous || row.updatedAt >= previous.updatedAt) cards.set(row.key, row);
  }

  await Promise.all([
    target.bookmarks.bulkPut([...bookmarks.values()]),
    target.progress.bulkPut([...progress.values()]),
    target.notes.bulkPut([...notes.values()]),
    target.memoCards.bulkPut([...cards.values()]),
  ]);
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
    if (on) { await getUserDB().bookmarks.put({ key, val: 1 }); }
    else     { await getUserDB().bookmarks.delete(key); }
  } catch { /* non-fatal */ }
}

export async function idbGetAllHadithBookmarks(): Promise<Record<string, boolean>> {
  try {
    const rows = await getUserDB().bookmarks.toArray();
    return Object.fromEntries(rows.map((r) => [r.key, true]));
  } catch { return {}; }
}

// Reading progress (last viewed hadith n per bookKey)
export async function idbSetHadithProgress(bookKey: string, n: number): Promise<void> {
  try { await getUserDB().progress.put({ bookKey, n }); }
  catch { /* non-fatal */ }
}

export async function idbGetAllHadithProgress(): Promise<Record<string, number>> {
  try {
    const rows = await getUserDB().progress.toArray();
    return Object.fromEntries(rows.map((r) => [r.bookKey, r.n]));
  } catch { return {}; }
}

// Notes
export async function idbSetHadithNote(key: string, text: string): Promise<void> {
  try { await getUserDB().notes.put({ key, text, updatedAt: Date.now() }); }
  catch { /* non-fatal */ }
}

export async function idbDeleteHadithNote(key: string): Promise<void> {
  try { await getUserDB().notes.delete(key); }
  catch { /* non-fatal */ }
}

export async function idbGetAllHadithNotes(): Promise<Record<string, string>> {
  try {
    const rows = await getUserDB().notes.toArray();
    return Object.fromEntries(rows.map((r) => [r.key, r.text]));
  } catch { return {}; }
}

// Memo cards (SRS)
export async function idbSetHadithMemoCard(key: string, card: HadithMemoCard): Promise<void> {
  try { await getUserDB().memoCards.put({ key, card, updatedAt: Date.now() }); }
  catch { /* non-fatal */ }
}

export async function idbGetAllHadithMemoCards(): Promise<Record<string, HadithMemoCard>> {
  try {
    const rows = await getUserDB().memoCards.toArray();
    return Object.fromEntries(rows.map((r) => [r.key, r.card]));
  } catch { return {}; }
}

/** Restore a snapshot, including deletions, before a backup reload or sync completes. */
export async function idbReplaceHadithState(data: {
  bookmarks: Record<string, boolean>;
  progress: Record<string, number>;
  notes: Record<string, string>;
  memoCards: Record<string, HadithMemoCard>;
}): Promise<void> {
  const replace = async (db: HadithDexie | HadithUserDexie) => {
    await Promise.all([db.bookmarks.clear(), db.progress.clear(), db.notes.clear(), db.memoCards.clear()]);
    await Promise.all([
      db.bookmarks.bulkPut(Object.keys(data.bookmarks).filter((key) => data.bookmarks[key]).map((key) => ({ key, val: 1 as const }))),
      db.progress.bulkPut(Object.entries(data.progress).map(([bookKey, n]) => ({ bookKey, n }))),
      db.notes.bulkPut(Object.entries(data.notes).map(([key, text]) => ({ key, text, updatedAt: Date.now() }))),
      db.memoCards.bulkPut(Object.entries(data.memoCards).map(([key, card]) => ({ key, card, updatedAt: Date.now() }))),
    ]);
  };

  if (getAccountStorageOwner() === "local") {
    const db = getDB();
    await db.transaction("rw", db.bookmarks, db.progress, db.notes, db.memoCards, () => replace(db));
  } else {
    const db = getScopedUserDB();
    await db.transaction("rw", db.bookmarks, db.progress, db.notes, db.memoCards, () => replace(db));
  }
}

// Full-corpus search index cache (kept 30 days, same as book packs)
export async function idbGetSearchIndex(): Promise<FullSearchIndexEntry[] | null> {
  try {
    const row = await getDB().searchIndex.get("full");
    if (!row) return null;
    if (Date.now() - row.cachedAt > MAX_AGE_MS) return null;
    return row.data;
  } catch {
    return null;
  }
}

export async function idbSetSearchIndex(data: FullSearchIndexEntry[]): Promise<void> {
  try {
    await getDB().searchIndex.put({ key: "full", data, cachedAt: Date.now() });
  } catch {
    // non-fatal — index stays in memory for this session only
  }
}

// One-time migration: write localStorage data (from noorStore v24) into IDB
export async function migrateHadithStateToIDB(data: {
  bookmarks: Record<string, boolean>;
  progress:  Record<string, number>;
  notes:     Record<string, string>;
  memoCards: Record<string, HadithMemoCard>;
}): Promise<void> {
  const writeTo = (db: HadithDexie | HadithUserDexie) => Promise.all([
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

  if (getAccountStorageOwner() === "local") {
    const db = getDB();
    await db.transaction("rw", db.bookmarks, db.progress, db.notes, db.memoCards, () => writeTo(db));
  } else {
    const db = getScopedUserDB();
    await db.transaction("rw", db.bookmarks, db.progress, db.notes, db.memoCards, () => writeTo(db));
  }
}
