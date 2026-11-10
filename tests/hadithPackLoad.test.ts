// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const { idbGetHadithPackEntry, idbSetHadithPack } = vi.hoisted(() => ({
  idbGetHadithPackEntry: vi.fn(),
  idbSetHadithPack: vi.fn(),
}));

vi.mock("@/lib/hadithIDB", () => ({ idbGetHadithPackEntry, idbSetHadithPack }));

import { loadHadithIndex, loadHadithPack, loadHadithPackWithProgress } from "@/data/useHadithBook";
import { HADITH_BOOKS_STATIC } from "@/data/hadithTypes";

const validPack = {
  key: "nawawi",
  title: "الأربعون النووية",
  titleEn: "Forty Hadith Nawawi",
  color: "#84cc16",
  order: 8,
  grade: "sahih",
  description: "أحاديث نبوية",
  count: 1,
  sections: [{ id: 1, title: "Faith", first: 1, last: 1 }],
  hadiths: [{ n: 1, a: 1, s: 1, t: "حديث نبوي", g: [] }],
};

describe("Hadith pack loading errors", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    idbGetHadithPackEntry.mockResolvedValue(null);
    idbSetHadithPack.mockResolvedValue(undefined);
  });

  it("rejects a failed download instead of returning a cacheable null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(loadHadithPack("nawawi")).rejects.toThrow("Failed to fetch");
  });

  it("lets the progress query show its error state and accept a retry", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => validPack,
      }));

    await expect(loadHadithPackWithProgress("nawawi", vi.fn(), vi.fn()))
      .rejects.toThrow("Failed to fetch");
    await expect(loadHadithPackWithProgress("nawawi", vi.fn(), vi.fn()))
      .resolves.toMatchObject({ hadiths: [{ n: 1, t: "حديث نبوي" }] });
  });

  it("reassembles streamed UTF-8 chunks before parsing a Hadith pack", async () => {
    const pack = validPack;
    const bytes = new TextEncoder().encode(JSON.stringify(pack));
    const arabicOffset = new TextEncoder().encode(JSON.stringify({ hadiths: [{ n: 1, s: 1, t: "" }] })).length;
    const splitAt = arabicOffset + 1;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.subarray(0, splitAt));
        controller.enqueue(bytes.subarray(splitAt));
        controller.close();
      },
    });
    const onProgress = vi.fn();
    const setIsFromCache = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Length": String(bytes.length) }),
      body,
    }));

    await expect(loadHadithPackWithProgress("nawawi", onProgress, setIsFromCache)).resolves.toEqual(pack);

    expect(setIsFromCache).toHaveBeenCalledWith(false);
    expect(onProgress).toHaveBeenLastCalledWith(100);
    expect(idbSetHadithPack).toHaveBeenCalledWith(pack);
  });

  it("rejects malformed network packs and never stores them", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => ({ ...validPack, hadiths: [{ n: "1", s: 1, t: 23, g: null }] }),
    }));

    await expect(loadHadithPack("nawawi")).rejects.toThrow();
    expect(idbSetHadithPack).not.toHaveBeenCalled();
  });

  it("uses a valid cache if a refresh returns malformed data", async () => {
    idbGetHadithPackEntry.mockResolvedValue({ data: validPack, isFresh: false });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => ({ ...validPack, key: "bukhari" }),
    }));

    await expect(loadHadithPack("nawawi")).resolves.toEqual(validPack);
    expect(idbSetHadithPack).not.toHaveBeenCalled();
  });

  it("ignores malformed cached rows and loads a fresh valid pack", async () => {
    idbGetHadithPackEntry.mockResolvedValue({ data: { key: "nawawi", hadiths: [] }, isFresh: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => validPack,
    }));

    await expect(loadHadithPack("nawawi")).resolves.toEqual(validPack);
    expect(idbSetHadithPack).toHaveBeenCalledWith(validPack);
  });

  it("falls back to built-in book metadata if the downloaded index is malformed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ key: "bukhari", title: null }],
    }));

    await expect(loadHadithIndex()).resolves.toEqual(HADITH_BOOKS_STATIC);
  });
});
