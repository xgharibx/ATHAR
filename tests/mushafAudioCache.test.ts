import { describe, expect, it, vi } from "vitest";
import { cacheAudioUrlsWithinBudget, MUSHAF_AUDIO_MAX_RESPONSE_BYTES } from "@/lib/offlineAudioCache";

function makeCache(seed: Record<string, Response> = {}) {
  const entries = new Map(Object.entries(seed));
  const cache = {
    async keys() { return [...entries.keys()].map((url) => new Request(url)); },
    async match(request: Request | string) { return entries.get(typeof request === "string" ? request : request.url)?.clone(); },
    async put(request: Request | string, response: Response) { entries.set(typeof request === "string" ? request : request.url, response.clone()); },
    async delete(request: Request | string) { return entries.delete(typeof request === "string" ? request : request.url); },
  } as unknown as Cache;
  return { cache, entries };
}

describe("bounded Mushaf audio downloads", () => {

  it("keeps enough per-file room for long Quran recitations", () => {
    expect(MUSHAF_AUDIO_MAX_RESPONSE_BYTES).toBe(4 * 1024 * 1024);
  });

  it("evicts oldest saved audio before exceeding the aggregate byte budget", async () => {
    const first = "https://audio.example/first.mp3";
    const second = "https://audio.example/second.mp3";
    const next = "https://audio.example/next.mp3";
    const { cache, entries } = makeCache({
      [first]: new Response("123"),
      [second]: new Response("45"),
    });
    const fetcher = vi.fn(async () => new Response("6789"));

    const result = await cacheAudioUrlsWithinBudget(cache, [next], {
      maxBytes: 7,
      maxEntryBytes: 5,
      fetcher,
    });

    expect(result.saved).toBe(1);
    expect(result.evicted).toBe(1);
    expect(entries.has(first)).toBe(false);
    expect(entries.has(second)).toBe(true);
    expect(entries.has(next)).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(next, expect.objectContaining({ cache: "no-store", mode: "cors" }));
  });

  it("skips an individual response larger than the per-file budget", async () => {
    const url = "https://audio.example/oversized.mp3";
    const { cache, entries } = makeCache();

    const result = await cacheAudioUrlsWithinBudget(cache, [url], {
      maxBytes: 100,
      maxEntryBytes: 3,
      fetcher: async () => new Response("1234"),
    });

    expect(result.saved).toBe(0);
    expect(result.oversized).toBe(1);
    expect(entries.has(url)).toBe(false);
  });

  it("keeps an existing valid download without fetching it again", async () => {
    const url = "https://audio.example/saved.mp3";
    const { cache } = makeCache({ [url]: new Response("saved") });
    const fetcher = vi.fn();

    const result = await cacheAudioUrlsWithinBudget(cache, [url], { fetcher });

    expect(result.saved).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports only files that remain after a large selection is capped", async () => {
    const first = "https://audio.example/first.mp3";
    const second = "https://audio.example/second.mp3";
    const { cache, entries } = makeCache();
    const fetcher = vi.fn(async (input: RequestInfo | URL) =>
      String(input) === first ? new Response("1234") : new Response("567"),
    );

    const result = await cacheAudioUrlsWithinBudget(cache, [first, second], {
      maxBytes: 5,
      maxEntryBytes: 8,
      fetcher,
    });

    expect(result.saved).toBe(1);
    expect(entries.has(first)).toBe(false);
    expect(entries.has(second)).toBe(true);
  });
});
