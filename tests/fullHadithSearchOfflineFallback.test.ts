// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { idbSetSearchIndex } from "@/lib/hadithIDB";
import type { FullSearchIndexEntry } from "@/lib/hadithIDB";

const DAY_MS = 24 * 60 * 60 * 1000;
const cachedAt = Date.UTC(2026, 0, 1);
const staleIndex: FullSearchIndexEntry[] = [["nawawi", 1, "اتق الله حيثما كنت", "حسن"]];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("expired full Hadith search index fallback", () => {
  it("searches the saved index when refreshing it fails offline", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(cachedAt);
    await idbSetSearchIndex(staleIndex);
    clock.mockReturnValue(cachedAt + 31 * DAY_MS);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { searchFullHadithCorpus } = await import("@/lib/fullHadithSearch");

    await expect(searchFullHadithCorpus("اتق")).resolves.toEqual([{
      bookKey: "nawawi",
      n: 1,
      snippet: "اتق الله حيثما كنت",
      grade: "حسن",
    }]);
  });
});
