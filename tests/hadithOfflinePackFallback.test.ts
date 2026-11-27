// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HadithPack } from "@/data/hadithTypes";
import { idbClearHadithPacks, idbGetHadithPackEntry, idbSetHadithPack } from "@/lib/hadithIDB";

const DAY_MS = 24 * 60 * 60 * 1000;
const cachedAt = Date.UTC(2026, 0, 1);
const stalePack: HadithPack = {
  key: "nawawi",
  title: "الأربعون النووية",
  titleEn: "Forty Hadith Nawawi",
  color: "#84cc16",
  order: 8,
  grade: "sahih",
  description: "مختارات من الأحاديث النبوية",
  count: 1,
  sections: [{ id: 1, title: "Faith", first: 1, last: 1 }],
  hadiths: [{ n: 1, a: 1, s: 1, ti: "عنوان", t: "حديث محفوظ دون اتصال", g: ["sahih"] }],
};
/** The refreshed book as served in parts: its table of contents and its one chapter. */
function servedAsParts(pack: HadithPack) {
  const { hadiths, ...meta } = pack;
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("books/nawawi.json")) return { ok: true, json: async () => ({ ...meta, rows: hadiths.map((h) => [h.n, h.s]) }) };
    if (url.endsWith("books/nawawi/1.json")) return { ok: true, json: async () => ({ key: "nawawi", s: 1, hadiths }) };
    return { ok: false, status: 404, json: async () => ({}) };
  });
}

/** What the loader returns: the same pack, each entry with its printed-number ref (see hadithNumbers.ts). */
const loaded = (pack: HadithPack) => ({ ...pack, hadiths: pack.hadiths.map((h) => ({ ...h, r: String(h.a) })) });

beforeEach(async () => {
  await idbClearHadithPacks();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("expired Hadith book cache fallback", () => {
  it("serves the expired book when refresh fails and retains its row", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(cachedAt);
    await idbSetHadithPack(stalePack);
    clock.mockReturnValue(cachedAt + 31 * DAY_MS);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { loadHadithPack } = await import("@/data/useHadithBook");

    await expect(loadHadithPack("nawawi")).resolves.toEqual(loaded(stalePack));
    await expect(idbGetHadithPackEntry("nawawi")).resolves.toEqual({
      data: stalePack,
      isFresh: false,
    });
  });

  it("replaces the expired row after a successful refresh", async () => {
    const refreshedPack = { ...stalePack, hadiths: [{ ...stalePack.hadiths[0]!, t: "نص محدّث" }] };
    const clock = vi.spyOn(Date, "now").mockReturnValue(cachedAt);
    await idbSetHadithPack(stalePack);
    clock.mockReturnValue(cachedAt + 31 * DAY_MS);
    vi.stubGlobal("fetch", servedAsParts(refreshedPack));

    const { loadHadithPack } = await import("@/data/useHadithBook");

    await expect(loadHadithPack("nawawi")).resolves.toEqual(loaded(refreshedPack));
    await vi.waitFor(async () => expect(await idbGetHadithPackEntry("nawawi")).toMatchObject({
      data: refreshedPack,
      isFresh: true,
    }));
  });
});
