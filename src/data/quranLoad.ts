import { QuranFileSchema, QuranPageMapSchema, type QuranDB, type QuranPageMap } from "./quranTypes";

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
 * Primary: `public/data/quran.json` (offline-friendly / same-origin)
 * Fallback: remote dataset from ImamAhmed site.
 */
export async function loadQuranDB(): Promise<QuranDB> {
  const localUrl = `${import.meta.env.BASE_URL}data/quran.json`;

  try {
    const json = await fetchJson(localUrl);
    return QuranFileSchema.parse(json).surahs;
  } catch {
    const json = await fetchJson(REMOTE_QURAN_JSON);
    return QuranFileSchema.parse(json).surahs;
  }
}

export async function loadQuranPageMap(): Promise<QuranPageMap> {
  const localUrl = `${import.meta.env.BASE_URL}data/quran_page_map.json`;

  try {
    const json = await fetchJson(localUrl);
    return QuranPageMapSchema.parse(json);
  } catch {
    const json = await fetchJson(REMOTE_QURAN_PAGE_MAP_JSON);
    return QuranPageMapSchema.parse(json);
  }
}
