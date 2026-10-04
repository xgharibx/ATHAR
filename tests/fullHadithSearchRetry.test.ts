// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { idbSetSearchIndex } from "@/lib/hadithIDB";

const DAY_MS = 24 * 60 * 60 * 1000;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("full Hadith search retries an unavailable index", () => {
  it("does not pin an empty result after a failed download", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 0, 1));
    await idbSetSearchIndex([]);
    clock.mockReturnValue(Date.UTC(2026, 0, 1) + 31 * DAY_MS);
    vi.stubGlobal("fetch", vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [["nawawi", 1, "اتق الله حيثما كنت", "حسن"]],
      }));

    const { searchFullHadithCorpus } = await import("@/lib/fullHadithSearch");

    await expect(searchFullHadithCorpus("اتق")).resolves.toEqual([]);
    await expect(searchFullHadithCorpus("اتق")).resolves.toEqual([{
      bookKey: "nawawi",
      n: 1,
      snippet: "اتق الله حيثما كنت",
      grade: "حسن",
    }]);
  });
});
