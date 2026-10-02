// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSharhRoots } from "@/lib/hadithSharhAPI";

const ROOTS_CACHE_KEY = "noor_sharh_v1:roots";
const staleRoots = [{ id: "1", title: "العقيدة", hadeeths_count: "1", parent_id: null }];

beforeEach(() => {
  localStorage.removeItem(ROOTS_CACHE_KEY);
});

afterEach(() => {
  localStorage.removeItem(ROOTS_CACHE_KEY);
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
});
