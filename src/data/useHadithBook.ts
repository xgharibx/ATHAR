/**
 * useHadithBook — Phase 2
 * React Query hooks for loading hadith packs on demand.
 * Load order: IDB cache → JSON fetch → IDB write
 */
import { useQuery } from "@tanstack/react-query";
import { idbGetHadithPack, idbSetHadithPack } from "@/lib/hadithIDB";
import { HADITH_BOOKS_STATIC, type HadithBookMeta, type HadithItem, type HadithPack } from "@/data/hadithTypes";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

/** Load the books index.json. Falls back to static metadata if fetch fails. */
export async function loadHadithIndex(): Promise<HadithBookMeta[]> {
  try {
    const res = await fetch(`${BASE}/data/hadith/index.json`);
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
    const res = await fetch(`${BASE}/data/hadith/${bookKey}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pack = (await res.json()) as HadithPack;

    // 3. Write to IDB for future offline use
    void idbSetHadithPack(pack);

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

/** Get hadiths for a section from an already-loaded pack */
export function getSectionHadiths(pack: HadithPack, sectionId: number): HadithItem[] {
  return pack.hadiths.filter((h) => h.s === sectionId);
}

/** Get a single hadith by number */
export function getHadithByNumber(pack: HadithPack, n: number): HadithItem | undefined {
  return pack.hadiths.find((h) => h.n === n);
}
