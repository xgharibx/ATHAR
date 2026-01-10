import { QuranDBSchema, type QuranDB } from "./quranTypes";

const REMOTE_QURAN_JSON = "https://xgharibx.github.io/ImamAhmed/data/quran.json";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
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
    return QuranDBSchema.parse(json);
  } catch {
    const json = await fetchJson(REMOTE_QURAN_JSON);
    return QuranDBSchema.parse(json);
  }
}
