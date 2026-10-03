export const HADITH_RUNTIME_CACHE_MAX_BYTES = 10 * 1024 * 1024;
export const CONTENT_PACK_RUNTIME_CACHE_MAX_BYTES = 10 * 1024 * 1024;

type CacheWillUpdateOptions = { response: Response };

async function isResponseWithinSize(
  response: Response,
  maxBytes: number,
  preserveResponse = false,
): Promise<boolean> {
  if (!Number.isFinite(maxBytes) || maxBytes <= 0 || response.status === 0) return false;

  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader === null ? Number.NaN : Number(contentLengthHeader);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return false;

  const bodyResponse = preserveResponse ? response.clone() : response;
  const reader = bodyResponse.body?.getReader();
  if (!reader) return true;

  let bytesRead = 0;
  try {
    while (bytesRead <= maxBytes) {
      const { done, value } = await reader.read();
      if (done) return true;
      bytesRead += value.byteLength;
    }
    // A cloned Fetch stream is teed; awaiting cancellation can remain pending
    // until the original response branch is consumed by the caller.
    void reader.cancel().catch(() => undefined);
    return false;
  } catch {
    void reader.cancel().catch(() => undefined);
    return false;
  } finally {
    reader.releaseLock();
  }
}

/** Deletes old cache entries above a byte budget while preserving smaller entries. */
export async function pruneOversizedCacheEntries(
  cache: Pick<Cache, "keys" | "match" | "delete">,
  maxBytes: number,
): Promise<number> {
  const requests = await cache.keys();
  let deletedCount = 0;

  for (const request of requests) {
    const response = await cache.match(request);
    if (!response || await isResponseWithinSize(response, maxBytes)) continue;
    if (await cache.delete(request)) deletedCount += 1;
  }

  return deletedCount;
}

/** Rejects oversized responses from CacheStorage while leaving the original response readable. */
export function createMaxResponseSizePlugin(maxBytes: number) {
  return {
    async cacheWillUpdate({ response }: CacheWillUpdateOptions): Promise<Response | null> {
      return await isResponseWithinSize(response, maxBytes, true) ? response : null;
    },
  };
}
