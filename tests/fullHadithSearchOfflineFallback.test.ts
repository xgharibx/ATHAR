// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { idbSetHadithText } from "@/lib/hadithIDB";

const DAY_MS = 24 * 60 * 60 * 1000;
const cachedAt = Date.UTC(2026, 0, 1);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("expired Hadith search text fallback", () => {
  it("searches the saved text when refreshing it fails offline", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(cachedAt);
    await idbSetHadithText("nawawi", [[18, "اتق الله حيثما كنت", "hasan"]]);
    clock.mockReturnValue(cachedAt + 31 * DAY_MS);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { searchHadithText } = await import("@/lib/fullHadithSearch");

    const outcome = await searchHadithText("اتَّقِ اللَّهَ", { books: ["nawawi"] });
    expect(outcome.results).toEqual([{ bookKey: "nawawi", n: 18, snippet: "اتق الله حيثما كنت", grade: "hasan", exact: true }]);
    expect(outcome.missing).toEqual([]);
  });

  it("finds words anywhere in the text, exact phrases first, and counts every match", async () => {
    await idbSetHadithText("qudsi", [
      [1, "قال الله يا عبادي اني حرمت الظلم علي نفسي", "sahih"],
      [2, "الظلم ظلمات يوم القيامه ونفسي", "sahih"],
      [3, "حرمت الظلم", "sahih", "3/1"],
    ]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const { searchHadithText } = await import("@/lib/fullHadithSearch");

    const outcome = await searchHadithText("حرمت الظلم", { books: ["qudsi"] });
    expect(outcome.total).toBe(2);
    expect(outcome.byBook).toEqual({ qudsi: 2 });
    expect(outcome.results.map((r) => [r.n, r.exact])).toEqual([[1, true], [3, true]]);
    expect(outcome.results[1]!.ref).toBe("3/1");
    const loose = await searchHadithText("الظلم نفسي", { books: ["qudsi"] });
    expect(loose.results.map((r) => [r.n, r.exact])).toEqual([[1, false], [2, false]]);
  });
});
