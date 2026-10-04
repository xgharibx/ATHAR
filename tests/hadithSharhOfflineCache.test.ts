// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSharhHadith, fetchSharhList, fetchSharhRoots } from "@/lib/hadithSharhAPI";

const ROOTS_CACHE_KEY = "noor_sharh_v1:roots";
const DETAIL_CACHE_KEY = "noor_sharh_v1:h:123";
const staleRoots = [{ id: "1", title: "العقيدة", hadeeths_count: "1", parent_id: null }];
const validHadith = {
  id: "123",
  title: "عنوان الحديث",
  hadeeth: "نص الحديث",
  attribution: "رواه البخاري",
  grade: "صحيح",
  explanation: "شرح الحديث",
  hints: ["فائدة"],
  words_meanings: [{ word: "الحديث", meaning: "الخبر" }],
  reference: "صحيح البخاري",
};

beforeEach(() => {
  localStorage.removeItem(ROOTS_CACHE_KEY);
  localStorage.removeItem(DETAIL_CACHE_KEY);
});

afterEach(() => {
  localStorage.removeItem(ROOTS_CACHE_KEY);
  localStorage.removeItem(DETAIL_CACHE_KEY);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Hadith sharh offline cache", () => {
  it("serves an expired category cache when the provider is unreachable", async () => {
    localStorage.setItem(ROOTS_CACHE_KEY, JSON.stringify({
      at: Date.now() - 8 * 24 * 60 * 60 * 1000,
      data: staleRoots,
    }));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(fetchSharhRoots()).resolves.toEqual(staleRoots);
  });

  it("keeps valid stale categories when the provider returns a malformed success payload", async () => {
    const cached = JSON.stringify({
      at: Date.now() - 8 * 24 * 60 * 60 * 1000,
      data: staleRoots,
    });
    localStorage.setItem(ROOTS_CACHE_KEY, cached);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "malformed" }],
    }));

    await expect(fetchSharhRoots()).resolves.toEqual(staleRoots);
    expect(localStorage.getItem(ROOTS_CACHE_KEY)).toBe(cached);
  });

  it("refreshes instead of serving malformed fresh category cache data", async () => {
    localStorage.setItem(ROOTS_CACHE_KEY, JSON.stringify({ at: Date.now(), data: [{ id: "broken" }] }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => staleRoots,
    }));

    await expect(fetchSharhRoots()).resolves.toEqual(staleRoots);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("rejects malformed hadith-list items instead of returning unrenderable rows", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "broken" }], meta: { last_page: 1 } }),
    }));

    await expect(fetchSharhList("1", 1)).rejects.toThrow(/invalid hadeethenc response/i);
  });

  it("falls back to the validated API record when the bundled index is malformed", async () => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => ({
      ok: true,
      json: async () => String(url).includes("sharh-bundled.json") ? null : validHadith,
    })));

    const { fetchSharhHadith: fetchHadith } = await import("@/lib/hadithSharhAPI");
    await expect(fetchHadith("123")).resolves.toEqual(validHadith);
  });

  it("rejects a hadith detail whose ID does not match the requested record", async () => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => ({
      ok: true,
      json: async () => String(url).includes("sharh-bundled.json") ? {} : { ...validHadith, id: "456" },
    })));

    const { fetchSharhHadith: fetchHadith } = await import("@/lib/hadithSharhAPI");
    await expect(fetchHadith("123")).rejects.toThrow(/invalid hadeethenc response/i);
  });

  it("serves the stale category cache when the provider request stalls", async () => {
    vi.useFakeTimers();
    localStorage.setItem(ROOTS_CACHE_KEY, JSON.stringify({
      at: Date.now() - 8 * 24 * 60 * 60 * 1000,
      data: staleRoots,
    }));
    let markFetchStarted!: () => void;
    const fetchStarted = new Promise<void>((resolve) => { markFetchStarted = resolve; });
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
      requestSignal = init?.signal ?? undefined;
      markFetchStarted();
      return new Promise<Response>((_resolve, reject) => {
        requestSignal?.addEventListener("abort", () => {
          reject(new DOMException("The request was aborted", "AbortError"));
        }, { once: true });
      });
    }));

    const request = fetchSharhRoots();
    await fetchStarted;
    await vi.advanceTimersByTimeAsync(15_000);

    expect(requestSignal?.aborted).toBe(true);
    await expect(request).resolves.toEqual(staleRoots);
  });
});
