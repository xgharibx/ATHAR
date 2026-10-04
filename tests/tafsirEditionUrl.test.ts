// @vitest-environment node
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadTafsirSurah, TAFSIR_API_VERSION } from "@/lib/tafsirEditions";

describe("tafsir edition URL validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects an unknown edition before making a CDN request", async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => [{ ayah: 1, surah: 1, text: "unexpected tafsir response" }],
    }) as Response);
    vi.stubGlobal("fetch", mockFetch);

    await expect(loadTafsirSurah("../../unknown-edition", 1)).rejects.toThrow("Unknown tafsir edition");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("uses a pinned provider release and records declared ayah gaps", async () => {
    const rows = Array.from({ length: 7 }, (_, index) => ({
      ayah: index + 1,
      surah: 1,
      text: `Explanation ${index + 1}`,
    }));
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => ({
      ok: !String(input).endsWith("empty_ayahs.json"),
      status: String(input).endsWith("empty_ayahs.json") ? 404 : 200,
      json: async () => rows,
    }) as Response);
    vi.stubGlobal("fetch", mockFetch);

    await expect(loadTafsirSurah("ar-tafsir-al-wasit", 1)).resolves.toEqual([
      "", "Explanation 1", "Explanation 2", "Explanation 3", "Explanation 4",
      "Explanation 5", "Explanation 6", "Explanation 7",
    ]);

    expect(TAFSIR_API_VERSION).toBe("v1.2.2");
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls.map(([url]) => String(url)).sort()).toEqual([
      `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@${TAFSIR_API_VERSION}/tafsir/ar-tafsir-al-wasit/1/empty_ayahs.json`,
      `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@${TAFSIR_API_VERSION}/tafsir/ar-tafsir-al-wasit/1.json`,
    ].sort());

    const verify = new Dexie("noor-tafsir-cache-v1");
    verify.version(3).stores({ cache: "key,cachedAt" });
    await verify.open();
    await expect(verify.table("cache").get("ar-tafsir-al-wasit:1")).resolves.toMatchObject({
      emptyAyahs: [],
      sourceVersion: TAFSIR_API_VERSION,
    });
    verify.close();
  });

  it("aborts provider requests that exceed the deadline", async () => {
    const mockFetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    });
    vi.stubGlobal("fetch", mockFetch);
    const realSetTimeout = globalThis.setTimeout.bind(globalThis);
    vi.spyOn(globalThis, "setTimeout").mockImplementation((handler, timeout, ...args) =>
      realSetTimeout(handler, timeout === 15_000 ? 1 : timeout, ...args)
    );

    const pending = loadTafsirSurah("ar-tafsir-al-baghawi", 2);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("rejects an invalid surah before making a CDN request", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    await expect(loadTafsirSurah("ar-tafsir-al-wasit", 115)).rejects.toThrow("Invalid surah number");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
