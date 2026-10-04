import { describe, expect, it } from "vitest";
import {
  CONTENT_PACK_RUNTIME_CACHE_MAX_BYTES,
  createMaxResponseSizePlugin,
  pruneCacheToByteBudget,
  pruneOversizedCacheEntries,
} from "@/lib/offlineCacheBudget";

describe("service-worker response cache budget", () => {
  it("rejects an oversized response from caching without consuming the caller's response", async () => {
    const response = new Response("12345", { headers: { "content-type": "application/json" } });
    const plugin = createMaxResponseSizePlugin(4);

    await expect(plugin.cacheWillUpdate({ response })).resolves.toBeNull();
    await expect(response.text()).resolves.toBe("12345");
  });

  it("admits a response within the byte budget", async () => {
    const response = new Response("1234", { headers: { "content-type": "application/json" } });
    const plugin = createMaxResponseSizePlugin(4);

    await expect(plugin.cacheWillUpdate({ response })).resolves.toBe(response);
  });

  it("uses Content-Length to reject a known oversized response before reading its body", async () => {
    const response = new Response("small", { headers: { "content-length": "500" } });
    const plugin = createMaxResponseSizePlugin(4);

    await expect(plugin.cacheWillUpdate({ response })).resolves.toBeNull();
    await expect(response.text()).resolves.toBe("small");
  });

  it("measures the body when Content-Length is within budget", async () => {
    const response = new Response("12345", { headers: { "content-length": "4" } });
    const plugin = createMaxResponseSizePlugin(4);

    await expect(plugin.cacheWillUpdate({ response })).resolves.toBeNull();
    await expect(response.text()).resolves.toBe("12345");
  });

  it("caps optional content packs at 10 MiB while leaving an oversized response readable", async () => {
    expect(CONTENT_PACK_RUNTIME_CACHE_MAX_BYTES).toBe(10 * 1024 * 1024);
    const response = new Response("still readable", {
      headers: { "content-length": String(CONTENT_PACK_RUNTIME_CACHE_MAX_BYTES + 1) },
    });
    const plugin = createMaxResponseSizePlugin(CONTENT_PACK_RUNTIME_CACHE_MAX_BYTES);

    await expect(plugin.cacheWillUpdate({ response })).resolves.toBeNull();
    await expect(response.text()).resolves.toBe("still readable");
  });

  it("removes previously cached responses above the content-pack budget and preserves smaller entries", async () => {
    const entries = new Map<string, Response>([
      ["https://athar.example/data/large.json", new Response("too large", {
        headers: { "content-length": String(CONTENT_PACK_RUNTIME_CACHE_MAX_BYTES + 1) },
      })],
      ["https://athar.example/data/small.json", new Response("small")],
    ]);
    const cache = {
      async keys() {
        return [...entries.keys()].map((url) => new Request(url));
      },
      async match(request: Request) {
        return entries.get(request.url)?.clone();
      },
      async delete(request: Request) {
        return entries.delete(request.url);
      },
    } as unknown as Cache;

    await expect(pruneOversizedCacheEntries(cache, CONTENT_PACK_RUNTIME_CACHE_MAX_BYTES)).resolves.toBe(1);
    expect([...entries.keys()]).toEqual(["https://athar.example/data/small.json"]);
  });

  it("measures cached responses without a Content-Length header", async () => {
    const entries = new Map<string, Response>([
      ["https://athar.example/data/unknown-size.json", new Response("12345")],
      ["https://athar.example/data/within-budget.json", new Response("1234")],
    ]);
    const cache = {
      async keys() {
        return [...entries.keys()].map((url) => new Request(url));
      },
      async match(request: Request) {
        return entries.get(request.url)?.clone();
      },
      async delete(request: Request) {
        return entries.delete(request.url);
      },
    } as unknown as Cache;

    await expect(pruneOversizedCacheEntries(cache, 4)).resolves.toBe(1);
    expect([...entries.keys()]).toEqual(["https://athar.example/data/within-budget.json"]);
  });

  it("removes oldest responses until the aggregate cache budget fits", async () => {
    const entries = new Map<string, Response>([
      ["https://audio.example/oldest.mp3", new Response("1234")],
      ["https://audio.example/next.mp3", new Response("567")],
      ["https://audio.example/newest.mp3", new Response("89")],
    ]);
    const cache = {
      async keys() { return [...entries.keys()].map((url) => new Request(url)); },
      async match(request: Request) { return entries.get(request.url)?.clone(); },
      async delete(request: Request) { return entries.delete(request.url); },
    } as unknown as Cache;

    const result = await pruneCacheToByteBudget(cache, 5, 8);

    expect(result).toMatchObject({ deletedCount: 1, totalBytes: 5 });
    expect([...entries.keys()]).toEqual([
      "https://audio.example/next.mp3",
      "https://audio.example/newest.mp3",
    ]);
  });
});
