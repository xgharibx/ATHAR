/**
 * Offline Tafseer Al-Muyassar loader.
 * Loads the bundled /data/tafseer-muyassar.json once per session and caches in module memory.
 * The file is pre-cached by the PWA service worker, so it works fully offline after first load.
 *
 * Data shape: { "1": ["", "text1", "text2", ...], "2": [...], ... }
 *   Index 0 is unused (ayahs are 1-based).
 */

type TafseerByAyah = string[];
type TafseerBySurah = Record<string, TafseerByAyah>;

let _cache: TafseerBySurah | null = null;
let _loadingPromise: Promise<TafseerBySurah> | null = null;

/**
 * Loads the complete Muyassar tafseer from the bundled JSON file.
 * Returns a module-level singleton; subsequent calls return the same promise/value.
 */
export async function loadMuyassarCache(): Promise<TafseerBySurah> {
  if (_cache) return _cache;
  if (!_loadingPromise) {
    _loadingPromise = fetch("/data/tafseer-muyassar.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<TafseerBySurah>;
      })
      .then((data) => {
        _cache = data;
        return data;
      })
      .catch(() => {
        // Reset so next call retries
        _loadingPromise = null;
        return {} as TafseerBySurah;
      });
  }
  return _loadingPromise;
}

/**
 * Synchronously returns cached ayahs for a surah (empty array if not yet loaded).
 */
export function getMuyassarAyahsSync(surahId: number): TafseerByAyah {
  return _cache?.[String(surahId)] ?? [];
}
