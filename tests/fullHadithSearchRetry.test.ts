// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("full Hadith search retries a book it could not download", () => {
  it("does not pin an empty result after a failed download", async () => {
    let failed = false;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("text/nawawi.json") && !failed) {
        failed = true;
        throw new TypeError("Failed to fetch");
      }
      if (url.includes("text/nawawi.json")) {
        return { ok: true, json: async () => ({ key: "nawawi", v: 2, rows: [[18, "اتق الله حيثما كنت", "hasan"]] }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }));

    const { searchHadithText } = await import("@/lib/fullHadithSearch");

    const first = await searchHadithText("اتق", { books: ["nawawi"] });
    expect(first.results).toEqual([]);
    expect(first.missing).toEqual(["nawawi"]);
    const second = await searchHadithText("اتق", { books: ["nawawi"] });
    expect(second.results).toEqual([{ bookKey: "nawawi", n: 18, snippet: "اتق الله حيثما كنت", grade: "hasan", exact: true }]);
    expect(second.total).toBe(1);
  });
});
