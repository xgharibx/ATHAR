// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const { idbGetHadithPackEntry, idbSetHadithPack, idbGetHadithPart, idbSetHadithPart } = vi.hoisted(() => ({
  idbGetHadithPackEntry: vi.fn(),
  idbSetHadithPack: vi.fn(),
  idbGetHadithPart: vi.fn(),
  idbSetHadithPart: vi.fn(),
}));

vi.mock("@/lib/hadithIDB", () => ({ idbGetHadithPackEntry, idbSetHadithPack, idbGetHadithPart, idbSetHadithPart }));

import { loadHadithChapter, loadHadithIndex, loadHadithPack, loadHadithPackWithProgress } from "@/data/useHadithBook";
import { HADITH_BOOKS_STATIC } from "@/data/hadithTypes";

const meta = {
  key: "nawawi",
  title: "الأربعون النووية",
  titleEn: "Forty Hadith Nawawi",
  color: "#84cc16",
  order: 8,
  grade: "sahih",
  description: "أحاديث نبوية",
  count: 2,
  sections: [],
};
const items = [
  { n: 1, a: 1, s: 1, ti: "إنما الأعمال بالنيات", t: "حديث نبوي", g: [], r: "1" },
  { n: 2, a: 2, s: 1, ti: "حديث جبريل", t: "حديث ثان", g: [], r: "2" },
];
const toc = { ...meta, rows: [[1, 1], [2, 1]] };
const chapter = { key: "nawawi", s: 1, hadiths: items };
/** The whole book as the loader assembles it from its parts. */
const validPack = { ...meta, hadiths: items };

function serve(files: Record<string, unknown>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const hit = Object.entries(files).find(([path]) => url.endsWith(path));
    if (!hit) return { ok: false, status: 404, json: async () => ({}) };
    if (hit[1] instanceof Error) throw hit[1];
    return { ok: true, headers: new Headers(), json: async () => hit[1] };
  });
}

describe("Hadith book loading", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    idbGetHadithPackEntry.mockResolvedValue(null);
    idbSetHadithPack.mockResolvedValue(undefined);
    idbGetHadithPart.mockResolvedValue(null);
    idbSetHadithPart.mockResolvedValue(undefined);
  });

  it("rejects a failed download instead of returning a cacheable null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(loadHadithPack("nawawi")).rejects.toThrow("Failed to fetch");
  });

  it("assembles the book from its table of contents and chapters, and keeps it once complete", async () => {
    vi.stubGlobal("fetch", serve({ "books/nawawi.json": toc, "books/nawawi/1.json": chapter }));
    await expect(loadHadithPack("nawawi")).resolves.toMatchObject({ key: "nawawi", count: 2, hadiths: [{ n: 1 }, { n: 2 }] });
    expect(idbSetHadithPack).toHaveBeenCalledWith(validPack);
  });

  it("lets the progress query show its error state, accept a retry, and report chapters", async () => {
    vi.stubGlobal("fetch", serve({ "books/nawawi.json": toc, "books/nawawi/1.json": new TypeError("Failed to fetch") }));
    await expect(loadHadithPackWithProgress("nawawi", vi.fn(), vi.fn())).rejects.toThrow("Failed to fetch");
    vi.stubGlobal("fetch", serve({ "books/nawawi.json": toc, "books/nawawi/1.json": chapter }));
    const onProgress = vi.fn();
    const setIsFromCache = vi.fn();
    await expect(loadHadithPackWithProgress("nawawi", onProgress, setIsFromCache)).resolves.toMatchObject({ hadiths: [{ n: 1, t: "حديث نبوي" }, { n: 2 }] });
    expect(setIsFromCache).toHaveBeenCalledWith(false);
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it("rejects malformed chapters and never keeps them", async () => {
    vi.stubGlobal("fetch", serve({ "books/nawawi.json": toc, "books/nawawi/1.json": { ...chapter, hadiths: [{ n: "1", s: 1, t: 23, g: null }] } }));
    await expect(loadHadithPack("nawawi")).rejects.toThrow();
    expect(idbSetHadithPack).not.toHaveBeenCalled();
  });

  it("uses a valid cached book if a refresh returns malformed data", async () => {
    idbGetHadithPackEntry.mockResolvedValue({ data: validPack, isFresh: false });
    vi.stubGlobal("fetch", serve({ "books/nawawi.json": { ...toc, key: "bukhari" } }));
    await expect(loadHadithPack("nawawi")).resolves.toMatchObject({ hadiths: [{ n: 1, r: "1" }, { n: 2 }] });
    expect(idbSetHadithPack).not.toHaveBeenCalled();
  });

  it("ignores malformed cached rows and loads a fresh valid book", async () => {
    idbGetHadithPackEntry.mockResolvedValue({ data: { key: "nawawi", hadiths: [] }, isFresh: true });
    vi.stubGlobal("fetch", serve({ "books/nawawi.json": toc, "books/nawawi/1.json": chapter }));
    await expect(loadHadithPack("nawawi")).resolves.toMatchObject({ hadiths: [{ n: 1 }, { n: 2 }] });
    expect(idbSetHadithPack).toHaveBeenCalledWith(validPack);
  });

  it("loads one chapter alone, from the kept book when there is one", async () => {
    vi.stubGlobal("fetch", serve({ "books/nawawi/1.json": chapter }));
    await expect(loadHadithChapter("nawawi", 1)).resolves.toEqual(items);
    expect(idbSetHadithPart).toHaveBeenCalledWith("ch:nawawi:1", chapter);

    idbGetHadithPackEntry.mockResolvedValue({ data: validPack, isFresh: true });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(loadHadithChapter("nawawi", 1)).resolves.toEqual(items);
  });

  it("falls back to built-in book metadata if the downloaded index is malformed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ key: "bukhari", title: null }] }));
    await expect(loadHadithIndex()).resolves.toEqual(HADITH_BOOKS_STATIC);
  });
});
