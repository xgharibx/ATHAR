export const HADITH_RUNTIME_CACHE_MAX_BYTES = 10 * 1024 * 1024;

type CacheWillUpdateOptions = { response: Response };

/** Rejects oversized responses from CacheStorage while leaving the original response readable. */
export function createMaxResponseSizePlugin(maxBytes: number) {
  return {
    async cacheWillUpdate({ response }: CacheWillUpdateOptions): Promise<Response | null> {
      if (!Number.isFinite(maxBytes) || maxBytes <= 0 || response.status === 0) return null;

      const contentLengthHeader = response.headers.get("content-length");
      const contentLength = contentLengthHeader === null ? Number.NaN : Number(contentLengthHeader);
      if (Number.isFinite(contentLength) && contentLength > maxBytes) return null;

      try {
        return (await response.clone().blob()).size <= maxBytes ? response : null;
      } catch {
        // If the response body cannot be measured, don't persist an unbounded copy.
        return null;
      }
    },
  };
}
