/**
 * useHadithBook — Phase 2 + Phase 9
 * React Query hooks for loading hadith packs on demand.
 * Load order: IDB cache → JSON fetch → IDB write
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { idbDeleteHadithBook, idbGetHadithPackEntry, idbGetHadithPart, idbSetHadithPack, idbSetHadithPart } from "@/lib/hadithIDB";
import { tidyHadithMarkup } from "@/lib/hadithText";
import { HADITH_BOOKS_STATIC, type HadithBookMeta, type HadithItem, type HadithPack } from "@/data/hadithTypes";
import { parseHadithChapter, parseHadithIndex, parseHadithPack, parseHadithToc, type HadithBookToc } from "@/data/hadithSchemas";
import { publicDataUrl } from "@/data/publicAssetUrl";
import { withChapters } from "@/data/hadithChapters";
import { normalizeHadithPack } from "@/data/hadithNumbers";

/** Approximate uncompressed file size in MB for each book (Phase 9 - progress UI) */
export const HADITH_PACK_SIZES_MB: Record<string, number> = {
  bukhari: 9.0,
  muslim: 7.9,
  abudawud: 5.2,
  tirmidhi: 4.3,
  nasai: 5.5,
  ibnmajah: 4.8,
  malik: 2.0,
  nawawi: 0.3,
  qudsi: 0.2,
};

const FORTIES = new Set(["nawawi", "qudsi"]);
const CHAPTERED = new Set(["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]);
const WITH_RULINGS = new Set(["abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]);

/**
 * Copies cached by older versions are fetched again when online (and still
 * cleaned by normalizeHadithPack when offline): before 1.2.96 they held the
 * empty placeholders and no titles, before 1.2.97 no named rulings, and
 * before 1.2.98 no chapters of their own.
 */
function isCurrentBundle(pack: HadithPack): boolean {
  if (FORTIES.has(pack.key) && !pack.hadiths[0]?.ti) return false;
  if (CHAPTERED.has(pack.key) && pack.sections.length < 2) return false;
  if (WITH_RULINGS.has(pack.key) && !pack.hadiths.slice(0, 50).some((h) => h.gr?.length)) return false;
  return pack.hadiths.every((h) => h.t.trim());
}

function isKnownOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Load the books index.json. Falls back to static metadata if fetch fails. */
export async function loadHadithIndex(): Promise<HadithBookMeta[]> {
  try {
    const res = await fetch(publicDataUrl("data/hadith/index.json"));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseHadithIndex(await res.json());
  } catch {
    return HADITH_BOOKS_STATIC;
  }
}

/* ------------------------------------------------------------------ */
/* A book in parts: its table of contents and one file per chapter      */
/* (public/data/hadith/books/, written by tools/scripts/hadith-books.mjs) */
/* ------------------------------------------------------------------ */

/** A part from IndexedDB when fresh (or offline), else downloaded and kept. */
async function loadPart<T>(partKey: string, url: string, parse: (value: unknown) => T, keep = true): Promise<T> {
  const cached = await idbGetHadithPart<unknown>(partKey);
  let saved: T | null = null;
  if (cached) {
    try {
      saved = parse(cached.data);
    } catch {
      // A corrupt or older row: never served.
    }
  }
  if (saved && (cached?.isFresh || isKnownOffline())) return saved;
  try {
    const res = await fetch(publicDataUrl(url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: unknown = await res.json();
    const data = parse(raw);
    if (keep) void idbSetHadithPart(partKey, raw);
    return data;
  } catch (error) {
    if (saved) return saved;
    throw error;
  }
}

const tocs = new Map<string, Promise<HadithBookToc>>();

/** A book's table of contents: meta, chapters, and every hadith's number and chapter (20–140 KB). */
export function loadHadithToc(bookKey: string): Promise<HadithBookToc> {
  let pending = tocs.get(bookKey);
  if (!pending) {
    pending = loadPart(`toc:${bookKey}`, `data/hadith/books/${bookKey}.json`, (v) => parseHadithToc(v, bookKey));
    pending.catch(() => tocs.delete(bookKey));
    tocs.set(bookKey, pending);
  }
  return pending;
}

/** The chapter a hadith is in, from the table of contents. */
export function chapterOfHadith(toc: HadithBookToc, n: number): number | undefined {
  return toc.rows.find((row) => row[0] === n)?.[1];
}

const cleanItems = (items: HadithItem[]) => items.map((h) => (h.t.includes("<") ? { ...h, t: tidyHadithMarkup(h.t) } : h));

/**
 * One chapter's hadiths: from the whole book when it is already kept on the
 * phone, otherwise its own small file (at most ~0.8 MB, most far less).
 */
export async function loadHadithChapter(bookKey: string, chapter: number, keep = true): Promise<HadithItem[]> {
  const whole = await idbGetHadithPackEntry(bookKey);
  if (whole?.isFresh) {
    try {
      const pack = parseHadithPack(whole.data, bookKey);
      if (isCurrentBundle(pack)) {
        const items = pack.hadiths.filter((h) => h.s === chapter);
        if (items.length) return cleanItems(items);
      }
    } catch {
      // Fall through to the chapter's own file.
    }
  }
  return cleanItems(await loadPart(`ch:${bookKey}:${chapter}`, `data/hadith/books/${bookKey}/${chapter}.json`, (v) => parseHadithChapter(v, bookKey, chapter), keep));
}

/** The whole book from its parts, chapters downloaded side by side. */
async function assemblePack(bookKey: string, onChapter?: (done: number, total: number) => void): Promise<HadithPack> {
  const toc = await loadHadithToc(bookKey);
  const chapters = [...new Set(toc.rows.map((row) => row[1]))];
  let done = 0;
  const parts = await Promise.all(chapters.map(async (s) => {
    // Not kept one by one: the whole book is kept once it is complete.
    const items = await loadPart(`ch:${bookKey}:${s}`, `data/hadith/books/${bookKey}/${s}.json`, (v) => parseHadithChapter(v, bookKey, s), false);
    onChapter?.(++done, chapters.length);
    return items;
  }));
  const byNumber = new Map<number, HadithItem>();
  for (const items of parts) for (const h of items) byNumber.set(h.n, h);
  const hadiths = toc.rows.map(([n]) => byNumber.get(n)).filter((h): h is HadithItem => !!h);
  const { rows: _rows, ...meta } = toc;
  return parseHadithPack({ ...meta, count: hadiths.length, hadiths }, bookKey);
}

/**
 * Load a full hadith pack for a given book key, cleaned (see
 * normalizeHadithPack) and with its chapters. Tries IDB first, then the
 * book's parts.
 */
export async function loadHadithPack(bookKey: string): Promise<HadithPack> {
  return withChapters(normalizeHadithPack(await loadRawHadithPack(bookKey)));
}

async function loadRawHadithPack(bookKey: string, onChapter?: (done: number, total: number) => void, setIsFromCache?: (v: boolean) => void): Promise<HadithPack> {
  const cachedEntry = await idbGetHadithPackEntry(bookKey);
  let cached: HadithPack | null = null;
  if (cachedEntry) {
    try {
      cached = parseHadithPack(cachedEntry.data, bookKey);
    } catch {
      // Ignore corrupt or mismatched cache rows; never feed them to the reader.
    }
  }
  if (cached && ((cachedEntry?.isFresh && isCurrentBundle(cached)) || isKnownOffline())) {
    setIsFromCache?.(true);
    return cached;
  }
  setIsFromCache?.(false);
  try {
    const pack = await assemblePack(bookKey, onChapter);
    // Replace the cached row only after a complete, valid book.
    void idbSetHadithPack(pack).catch(() => undefined);
    return pack;
  } catch (error) {
    if (cached) {
      setIsFromCache?.(true);
      return cached;
    }
    throw error;
  }
}

/**
 * Load a whole book with progress (0–100 as its chapters arrive). Rejects on
 * error so the query can expose an error state and be retried.
 */
export async function loadHadithPackWithProgress(
  bookKey: string,
  onProgress: (pct: number) => void,
  setIsFromCache: (v: boolean) => void,
): Promise<HadithPack | null> {
  onProgress(0);
  try {
    const pack = await loadRawHadithPack(bookKey, (done, total) => onProgress(Math.min(99, Math.round((done / total) * 100))), setIsFromCache);
    onProgress(100);
    return withChapters(normalizeHadithPack(pack));
  } catch (error) {
    onProgress(0);
    throw error;
  }
}

/** Whether a whole book is kept on this device for reading offline. */
export async function isHadithBookKept(bookKey: string): Promise<boolean> {
  const entry = await idbGetHadithPackEntry(bookKey);
  if (!entry) return false;
  try {
    return isCurrentBundle(parseHadithPack(entry.data, bookKey));
  } catch {
    return false;
  }
}

/** Keep a whole book on this device (its chapters, then the book). */
export async function keepHadithBook(bookKey: string, onProgress: (pct: number) => void): Promise<void> {
  await loadHadithPackWithProgress(bookKey, onProgress, () => undefined);
}

/** Forget a kept book (it loads again from the network when opened). */
export async function forgetHadithBook(bookKey: string): Promise<void> {
  await idbDeleteHadithBook(bookKey);
}

/** Hook: a book's table of contents. */
export function useHadithToc(bookKey: string | undefined) {
  return useQuery({
    queryKey: ["hadith-toc", bookKey],
    queryFn: () => loadHadithToc(bookKey!),
    enabled: !!bookKey,
    staleTime: Infinity,
  });
}

/** Hook: one chapter's hadiths. */
export function useHadithChapter(bookKey: string | undefined, chapter: number | undefined) {
  return useQuery({
    queryKey: ["hadith-chapter", bookKey, chapter],
    queryFn: () => loadHadithChapter(bookKey!, chapter!),
    enabled: !!bookKey && chapter != null,
    staleTime: Infinity,
  });
}

/** Hook: load the list of available hadith books */
export function useHadithIndex() {
  return useQuery({
    queryKey: ["hadith-index"],
    queryFn: loadHadithIndex,
    staleTime: 24 * 60 * 60 * 1000, // 24h
  });
}

/** Hook: load a full book pack */
export function useHadithPack(bookKey: string | undefined) {
  return useQuery({
    queryKey: ["hadith-pack", bookKey],
    queryFn: () => {
      if (!bookKey) throw new Error("A Hadith book must be selected before loading it.");
      return loadHadithPack(bookKey);
    },
    enabled: !!bookKey,
    staleTime: Infinity,
  });
}

/**
 * Phase 9 — Hook: load a book pack with download progress tracking.
 * Returns `progress` (0-100) and `isFromCache` in addition to query state.
 */
export function useHadithPackProgress(bookKey: string | undefined) {
  const [progress, setProgress] = useState(0);
  const [isFromCache, setIsFromCache] = useState(false);

  // Reset when bookKey changes
  useEffect(() => {
    setProgress(0);
    setIsFromCache(false);
  }, [bookKey]);

  const query = useQuery({
    queryKey: ["hadith-pack", bookKey],
    queryFn: () =>
      bookKey
        ? loadHadithPackWithProgress(bookKey, setProgress, setIsFromCache)
        : Promise.reject(new Error("A Hadith book must be selected before loading it.")),
    enabled: !!bookKey,
    staleTime: Infinity,
  });

  return { ...query, progress, isFromCache };
}

/** Get hadiths for a section from an already-loaded pack */
export function getSectionHadiths(pack: HadithPack, sectionId: number): HadithItem[] {
  return pack.hadiths.filter((h) => h.s === sectionId);
}

/** Get a single hadith by number */
export function getHadithByNumber(pack: HadithPack, n: number): HadithItem | undefined {
  return pack.hadiths.find((h) => h.n === n);
}

/** One hadith by its book and number: the table of contents, then its chapter. */
export function useBookHadith(bookKey: string | undefined, n: number | undefined) {
  const toc = useHadithToc(bookKey);
  const chapter = toc.data && n != null ? chapterOfHadith(toc.data, n) : undefined;
  const items = useHadithChapter(bookKey, chapter);
  const hadith = n != null ? items.data?.find((h) => h.n === n) : undefined;
  return { hadith, isLoading: toc.isLoading || items.isLoading };
}

/** Several hadiths by "book:n" key, each from its own chapter file (never a whole book). */
export async function loadHadithsByKey(keys: string[]): Promise<Record<string, HadithItem>> {
  const out: Record<string, HadithItem> = {};
  const byChapter = new Map<string, { bookKey: string; chapter: number; ns: Set<number> }>();
  await Promise.all(
    [...new Set(keys.map((k) => k.split(":")[0]!))].map(async (bookKey) => {
      const toc = await loadHadithToc(bookKey).catch(() => null);
      if (!toc) return;
      for (const key of keys) {
        const [b, nStr] = key.split(":");
        if (b !== bookKey) continue;
        const chapter = chapterOfHadith(toc, Number(nStr));
        if (chapter == null) continue;
        const id = `${bookKey}:${chapter}`;
        const entry = byChapter.get(id) ?? { bookKey, chapter, ns: new Set<number>() };
        entry.ns.add(Number(nStr));
        byChapter.set(id, entry);
      }
    }),
  );
  await Promise.all(
    [...byChapter.values()].map(async ({ bookKey, chapter, ns }) => {
      const items = await loadHadithChapter(bookKey, chapter).catch(() => [] as HadithItem[]);
      for (const item of items) if (ns.has(item.n)) out[`${bookKey}:${item.n}`] = item;
    }),
  );
  return out;
}
