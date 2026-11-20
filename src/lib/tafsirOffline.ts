/**
 * «التفسير دون إنترنت» — saving a whole tafsir edition on the phone.
 *
 * Only «الميسر» ships with the app; the other editions are read one surah at
 * a time from the tafsir CDN and kept in the web view's database, which the
 * phone may clear and which only holds the surahs already opened. Here a
 * reader saves an edition whole:
 *
 *   - In the apps, by the native background downloader the recitations use
 *     (Android WorkManager, an iOS background URL session): the download
 *     carries on with the app closed and the files go to the app's own
 *     storage, apart from the recitations and their space budget. The tafsir
 *     loader reads those files first (tafsirEditions.ts).
 *   - On the web, each surah is fetched into the same database the reader
 *     already uses.
 */
import {
  downloadNativeRecitations,
  hasNativeRecitation,
  nativeReadDownloaded,
  nativeRemoveDownloads,
  nativeSavedCount,
} from "@/lib/nativeRecitation";
import { getSurahAyahCount } from "@/data/quranSurahCounts";

export const SURAH_COUNT = 114;

export function tafsirSurahUrl(base: string, slug: string, surahId: number): string {
  return `${base}/${slug}/${surahId}.json`;
}

export function tafsirEditionUrls(base: string, slug: string): string[] {
  return Array.from({ length: SURAH_COUNT }, (_, index) => tafsirSurahUrl(base, slug, index + 1));
}

/**
 * A saved surah file, as a 1-based array of ayah texts. The empty-ayah list is
 * not downloaded with it (most editions have none, and a missing file would
 * count as a failed download): an ayah the file does not cover is an ayah the
 * edition leaves without commentary. Null for anything that is not a valid
 * file for this surah.
 */
export function parseSavedTafsirSurah(text: string, surahId: number): string[] | null {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return null;
  }
  const entries = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { ayahs?: unknown }).ayahs)
      ? (payload as { ayahs: unknown[] }).ayahs
      : null;
  if (!entries || entries.length === 0) return null;
  const count = getSurahAyahCount(surahId);
  const ayahs = Array.from({ length: count + 1 }, () => "");
  let found = 0;
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") return null;
    const { ayah, surah, text: body } = entry as { ayah?: unknown; surah?: unknown; text?: unknown };
    if (!Number.isInteger(ayah) || (ayah as number) < 1 || (ayah as number) > count) return null;
    if (surah !== undefined && surah !== surahId) return null;
    if (typeof body !== "string") return null;
    if (body.trim() && !ayahs[ayah as number]) found += 1;
    ayahs[ayah as number] = body;
  }
  return found > 0 ? ayahs : null;
}

/** The saved copy of one surah, if this phone has it. */
export async function readSavedTafsirSurah(base: string, slug: string, surahId: number): Promise<string[] | null> {
  if (!hasNativeRecitation()) return null;
  const text = await nativeReadDownloaded(tafsirSurahUrl(base, slug, surahId));
  return text ? parseSavedTafsirSurah(text, surahId) : null;
}

export type TafsirSaveProgress = (done: number, total: number) => void;

/**
 * How many surahs of an edition are saved, out of 114. Null when this app
 * build cannot say (an older app); the web counts its database instead.
 */
export async function savedTafsirSurahs(
  base: string,
  slug: string,
  webCount: () => Promise<number>,
): Promise<number | null> {
  if (hasNativeRecitation()) return nativeSavedCount(tafsirEditionUrls(base, slug));
  return webCount();
}

/** Save an edition; resolves with how many surahs are saved. */
export async function saveTafsirEdition(options: {
  base: string;
  slug: string;
  label: string;
  onProgress: TafsirSaveProgress;
  /** The web path: load (and so store) one surah. */
  loadSurah: (surahId: number) => Promise<unknown>;
}): Promise<{ saved: number; total: number }> {
  const { base, slug, label, onProgress, loadSurah } = options;
  const urls = tafsirEditionUrls(base, slug);
  if (hasNativeRecitation()) {
    const result = await downloadNativeRecitations(urls, onProgress, `تفسير ${label}`, "tafsir");
    if (result) return { saved: result.saved, total: urls.length };
  }
  // The web, or an app build without the native downloader: a few at a time.
  let next = 1;
  let done = 0;
  let saved = 0;
  const worker = async () => {
    while (next <= SURAH_COUNT) {
      const surahId = next++;
      try {
        await loadSurah(surahId);
        saved += 1;
      } catch {
        // Counted as missing; saving again picks it up.
      }
      done += 1;
      onProgress(done, SURAH_COUNT);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return { saved, total: SURAH_COUNT };
}

export async function removeSavedTafsirEdition(base: string, slug: string, removeWeb: () => Promise<void>): Promise<void> {
  if (hasNativeRecitation()) await nativeRemoveDownloads(tafsirEditionUrls(base, slug));
  await removeWeb();
}
