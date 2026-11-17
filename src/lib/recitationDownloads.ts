/**
 * Saving recitation verses for listening offline.
 *
 * In the Android and iOS apps the verses are saved as files by the native
 * recitation player (the web view's caches are wiped each time the app opens,
 * so a download saved there was lost). On the web they go into the service
 * worker's audio cache, which the web player reads while offline.
 */
import { downloadNativeRecitations, hasNativeRecitation } from "@/lib/nativeRecitation";
import { cacheAudioUrlsWithinBudget, MUSHAF_AUDIO_CACHE_NAME } from "@/lib/offlineAudioCache";

export function everyAyahUrl(reciter: string, surahId: number, ayah: number): string {
  const surah = String(surahId).padStart(3, "0");
  const verse = String(ayah).padStart(3, "0");
  return `https://everyayah.com/data/${reciter}/${surah}${verse}.mp3`;
}

export function canSaveRecitationsOffline(): boolean {
  return hasNativeRecitation() || (typeof window !== "undefined" && "caches" in window);
}

/** Save verses for offline listening; `evicted` counts older verses removed to make room. */
export async function saveRecitationsOffline(
  urls: string[],
  onProgress: (done: number, total: number) => void,
): Promise<{ saved: number; evicted: number }> {
  const native = await downloadNativeRecitations(urls, onProgress);
  if (native) return { saved: native.saved, evicted: native.evicted };
  if (typeof window === "undefined" || !("caches" in window)) throw new Error("Offline storage is unavailable");
  const cache = await caches.open(MUSHAF_AUDIO_CACHE_NAME);
  const { saved, evicted } = await cacheAudioUrlsWithinBudget(cache, urls, { onProgress });
  return { saved, evicted };
}
