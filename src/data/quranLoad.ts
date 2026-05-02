import { QuranFileSchema, QuranPageMapSchema, type QuranDB, type QuranPageMap } from "./quranTypes";
import { idbGetQuran, idbSetQuran } from "@/lib/quranIDB";
import { publicDataUrl } from "./publicAssetUrl";

const REMOTE_QURAN_JSON = "https://xgharibx.github.io/ImamAhmed/data/quran.json";
const REMOTE_QURAN_PAGE_MAP_JSON = "https://ahmedelfashny.com/data/quran_page_map.json";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
  return await res.json();
}

/**
 * Loads Quran dataset.
 *
 * Cache hierarchy:
 * 1. IndexedDB (Dexie) — instant, parsed data, survives page refreshes
 * 2. public/data/quran.json — offline-friendly / same-origin, served by SW
 * 3. Remote CDN — last-resort network fallback
 */
export async function loadQuranDB(): Promise<QuranDB> {
  // T8: Try IDB cache first
  const cached = await idbGetQuran();
  if (cached) return cached;

  const localUrl = publicDataUrl("data/quran.json");

  let result: QuranDB;
  try {
    const json = await fetchJson(localUrl);
    result = QuranFileSchema.parse(json).surahs;
  } catch {
    const json = await fetchJson(REMOTE_QURAN_JSON);
    result = QuranFileSchema.parse(json).surahs;
  }

  // Persist to IDB for next load (fire-and-forget)
  void idbSetQuran(result);
  return result;
}

export async function loadQuranPageMap(): Promise<QuranPageMap> {
  const localUrl = publicDataUrl("data/quran_page_map.json");

  try {
    const json = await fetchJson(localUrl);
    return QuranPageMapSchema.parse(json);
  } catch {
    const json = await fetchJson(REMOTE_QURAN_PAGE_MAP_JSON);
    return QuranPageMapSchema.parse(json);
  }
}
