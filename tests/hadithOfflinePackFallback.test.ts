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
  hadiths: [{ n: 1, a: 1, s: 1, t: "حديث محفوظ دون اتصال", g: ["sahih"] }],
};

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

    await expect(loadHadithPack("nawawi")).resolves.toEqual(stalePack);
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => refreshedPack,
    }));

    const { loadHadithPack } = await import("@/data/useHadithBook");

    await expect(loadHadithPack("nawawi")).resolves.toEqual(refreshedPack);
    await vi.waitFor(async () => expect(await idbGetHadithPackEntry("nawawi")).toMatchObject({
      data: refreshedPack,
      isFresh: true,
    }));
  });
});
