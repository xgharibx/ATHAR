import { inspectCacheByteBudget, measureResponseBytes, pruneCacheToByteBudget } from "./offlineCacheBudget";

export const MUSHAF_AUDIO_CACHE_NAME = "mushaf-audio-v1";
export const MUSHAF_AUDIO_CACHE_MAX_BYTES = 100 * 1024 * 1024;
// Leaves margin for long recitations such as Al-Baqarah 2:282 (~2.3 MiB).
export const MUSHAF_AUDIO_MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

type AudioCache = Pick<Cache, "keys" | "match" | "put" | "delete">;
type AudioCacheProgress = (done: number, total: number) => void;
type AudioCacheFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type AudioCacheOptions = {
  maxBytes?: number;
  maxEntryBytes?: number;
  fetcher?: AudioCacheFetch;
  onProgress?: AudioCacheProgress;
};

/** Downloads explicit offline selections into CacheStorage without exceeding app-owned byte limits. */
export async function cacheAudioUrlsWithinBudget(
  cache: AudioCache,
  urls: string[],
  options: AudioCacheOptions = {},
): Promise<{ saved: number; oversized: number; failed: number; evicted: number }> {
  const maxBytes = options.maxBytes ?? MUSHAF_AUDIO_CACHE_MAX_BYTES;
  const maxEntryBytes = options.maxEntryBytes ?? MUSHAF_AUDIO_MAX_RESPONSE_BYTES;
  const fetchAudio = options.fetcher ?? fetch;
  if (!Number.isFinite(maxBytes) || maxBytes <= 0 || !Number.isFinite(maxEntryBytes) || maxEntryBytes <= 0) {
    throw new RangeError("Audio cache byte budgets must be positive finite numbers.");
  }

  const inspection = await inspectCacheByteBudget(cache, maxEntryBytes);
  const entries = inspection.entries;
  let usedBytes = inspection.totalBytes;
  const savedUrls = new Set(entries.map(({ request }) => request.url));
  let saved = 0;
  let oversized = 0;
  let failed = 0;
  let evicted = inspection.deletedCount;

  while (usedBytes > maxBytes && entries.length > 0) {
    const oldest = entries[0]!;
    if (!await cache.delete(oldest.request)) break;
    entries.shift();
    savedUrls.delete(oldest.request.url);
    usedBytes -= oldest.bytes;
    evicted += 1;
  }

  for (const [index, url] of urls.entries()) {
    const key = new URL(url).href;
    if (savedUrls.has(key)) {
      saved += 1;
      options.onProgress?.(index + 1, urls.length);
      continue;
    }

    try {
      const response = await fetchAudio(url, { mode: "cors", cache: "no-store" });
      if (!response.ok) {
        failed += 1;
      } else {
        const bytes = await measureResponseBytes(response, maxEntryBytes);
        if (bytes === null || bytes > maxBytes) {
          oversized += 1;
        } else {
          while (usedBytes + bytes > maxBytes && entries.length > 0) {
            const oldest = entries[0]!;
            if (!await cache.delete(oldest.request)) break;
            entries.shift();
            savedUrls.delete(oldest.request.url);
            usedBytes -= oldest.bytes;
            evicted += 1;
          }

          if (usedBytes + bytes > maxBytes) {
            oversized += 1;
          } else {
            const request = new Request(key, { mode: "cors" });
            await cache.put(request, response);
            entries.push({ request, bytes });
            savedUrls.add(key);
            usedBytes += bytes;
            saved += 1;
          }
        }
      }
    } catch {
      failed += 1;
    }
    options.onProgress?.(index + 1, urls.length);
  }

  const finalCache = await pruneCacheToByteBudget(cache, maxBytes, maxEntryBytes);
  const finalUrls = new Set(finalCache.entries.map(({ request }) => request.url));
  saved = urls.filter((url) => finalUrls.has(new URL(url).href)).length;
  evicted += finalCache.deletedCount;

  return { saved, oversized, failed, evicted };
}
