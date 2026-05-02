/**
 * useHadithBook — Phase 2 + Phase 9
 * React Query hooks for loading hadith packs on demand.
 * Load order: IDB cache → JSON fetch → IDB write
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { idbGetHadithPack, idbSetHadithPack } from "@/lib/hadithIDB";
import { HADITH_BOOKS_STATIC, type HadithBookMeta, type HadithItem, type HadithPack } from "@/data/hadithTypes";
import { publicDataUrl } from "@/data/publicAssetUrl";

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

/** Load the books index.json. Falls back to static metadata if fetch fails. */
export async function loadHadithIndex(): Promise<HadithBookMeta[]> {
  try {
    const res = await fetch(publicDataUrl("data/hadith/index.json"));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HadithBookMeta[];
  } catch {
    return HADITH_BOOKS_STATIC;
  }
}

/** Load a full hadith pack for a given book key. Tries IDB first, then fetch. */
export async function loadHadithPack(bookKey: string): Promise<HadithPack | null> {
  // 1. Try IDB cache
  const cached = await idbGetHadithPack(bookKey);
  if (cached) return cached;

  // 2. Fetch from static files
  try {
    const res = await fetch(publicDataUrl(`data/hadith/${bookKey}.json`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pack = (await res.json()) as HadithPack;

    // 3. Write to IDB for future offline use
    void idbSetHadithPack(pack);

    return pack;
  } catch {
    return null;
  }
}

/**
 * Load a hadith pack with streaming progress.
 * Calls onProgress(0-100) as bytes arrive. Returns null on error.
 */
async function loadHadithPackWithProgress(
  bookKey: string,
  onProgress: (pct: number) => void,
  setIsFromCache: (v: boolean) => void,
): Promise<HadithPack | null> {
  // 1. Try IDB cache
  const cached = await idbGetHadithPack(bookKey);
  if (cached) {
    setIsFromCache(true);
    onProgress(100);
    return cached;
  }

  setIsFromCache(false);
  onProgress(0);

  // 2. Streaming fetch with progress tracking
  try {
    const res = await fetch(publicDataUrl(`data/hadith/${bookKey}.json`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentLength = res.headers.get("Content-Length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!res.body || total === 0) {
      // No streaming: direct parse
      const pack = (await res.json()) as HadithPack;
      void idbSetHadithPack(pack);
      onProgress(100);
      return pack;
    }

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onProgress(Math.min(Math.round((received / total) * 100), 95));
    }

    const blob = new Blob(chunks, { type: "application/json" });
    const text = await blob.text();
    const pack = JSON.parse(text) as HadithPack;

    void idbSetHadithPack(pack);
    onProgress(100);
    return pack;
  } catch {
    return null;
  }
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
    queryFn: () => (bookKey ? loadHadithPack(bookKey) : null),
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
        : null,
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
