export const HADITH_RUNTIME_CACHE_MAX_BYTES = 10 * 1024 * 1024;
export const CONTENT_PACK_RUNTIME_CACHE_MAX_BYTES = 10 * 1024 * 1024;

export type CacheWillUpdateOptions = { response: Response };
export type SizedCacheEntry = { request: Request; bytes: number };
export type CacheBudgetInspection = {
  entries: SizedCacheEntry[];
  totalBytes: number;
  deletedCount: number;
};

type ReadableCache = Pick<Cache, "keys" | "match" | "delete">;

/** Measures a response clone so cache inspection never consumes the caller's body. */
export async function measureResponseBytes(response: Response, maxBytes: number): Promise<number | null> {
  if (!Number.isFinite(maxBytes) || maxBytes <= 0 || response.status === 0 || response.type === "opaque") return null;

  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader === null ? Number.NaN : Number(contentLengthHeader);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return null;

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    reader = response.clone().body?.getReader();
    if (!reader) return 0;

    let bytesRead = 0;
    while (bytesRead <= maxBytes) {
      const { done, value } = await reader.read();
      if (done) return bytesRead;
      bytesRead += value.byteLength;
    }
    // A cloned Fetch stream is teed; awaiting cancellation can remain pending
    // until the original response branch is consumed by the caller.
    void reader.cancel().catch(() => undefined);
    return null;
  } catch {
    if (reader) void reader.cancel().catch(() => undefined);
    return null;
  } finally {
    reader?.releaseLock();
  }
}

/** Deletes old cache entries above a per-response byte budget while preserving smaller entries. */
export async function pruneOversizedCacheEntries(
  cache: ReadableCache,
  maxBytes: number,
): Promise<number> {
  const requests = await cache.keys();
  let deletedCount = 0;

  for (const request of requests) {
    const response = await cache.match(request);
    if (response && await measureResponseBytes(response, maxBytes) !== null) continue;
    if (await cache.delete(request)) deletedCount += 1;
  }

  return deletedCount;
}

/** Inspects entries oldest-first and removes responses that cannot be measured or exceed the per-entry cap. */
export async function inspectCacheByteBudget(
  cache: ReadableCache,
  maxEntryBytes: number,
): Promise<CacheBudgetInspection> {
  const entries: SizedCacheEntry[] = [];
  let totalBytes = 0;
  let deletedCount = 0;

  for (const request of await cache.keys()) {
    const response = await cache.match(request);
    const bytes = response ? await measureResponseBytes(response, maxEntryBytes) : null;
    if (bytes === null) {
      if (await cache.delete(request)) deletedCount += 1;
      continue;
    }
    entries.push({ request, bytes });
    totalBytes += bytes;
  }

  return { entries, totalBytes, deletedCount };
}

/** Removes oldest cache entries until the measured total fits the aggregate byte ceiling. */
export async function pruneCacheToByteBudget(
  cache: ReadableCache,
  maxBytes: number,
  maxEntryBytes: number,
): Promise<{ deletedCount: number; totalBytes: number; entries: SizedCacheEntry[] }> {
  const inspection = await inspectCacheByteBudget(cache, maxEntryBytes);
  let totalBytes = inspection.totalBytes;
  let deletedCount = inspection.deletedCount;

  while (totalBytes > maxBytes && inspection.entries.length > 0) {
    const oldest = inspection.entries[0]!;
    if (!await cache.delete(oldest.request)) break;
    inspection.entries.shift();
    totalBytes -= oldest.bytes;
    deletedCount += 1;
  }

  return { deletedCount, totalBytes, entries: inspection.entries };
}

/** Rejects oversized responses from CacheStorage while leaving the original response readable. */
export function createMaxResponseSizePlugin(maxBytes: number) {
  return {
    async cacheWillUpdate({ response }: CacheWillUpdateOptions): Promise<Response | null> {
      return await measureResponseBytes(response, maxBytes) !== null ? response : null;
    },
  };
}
