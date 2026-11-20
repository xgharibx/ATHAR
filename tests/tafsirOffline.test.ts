import { afterEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  isNative: false,
  download: vi.fn(),
  savedCount: vi.fn(),
  readDownloaded: vi.fn(),
  removeDownloads: vi.fn(),
  addListener: vi.fn(async () => ({ remove: async () => {} })),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.isNative, getPlatform: () => (native.isNative ? "android" : "web") },
  registerPlugin: () => native,
}));

import {
  parseSavedTafsirSurah,
  readSavedTafsirSurah,
  saveTafsirEdition,
  tafsirEditionUrls,
} from "@/lib/tafsirOffline";

const BASE = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@v1.2.2/tafsir";

afterEach(() => {
  native.isNative = false;
  vi.clearAllMocks();
});

describe("saved tafsir files", () => {
  it("reads a surah file into a 1-based list, ayahs it leaves out read as empty", () => {
    const text = JSON.stringify({ ayahs: [
      { surah: 1, ayah: 1, text: "بسم الله" },
      { surah: 1, ayah: 3, text: "الرحمن" },
    ] });
    const ayahs = parseSavedTafsirSurah(text, 1)!;
    expect(ayahs).toHaveLength(8);
    expect(ayahs[1]).toBe("بسم الله");
    expect(ayahs[2]).toBe("");
    expect(ayahs[3]).toBe("الرحمن");
  });

  it("refuses a file that is not this surah's", () => {
    expect(parseSavedTafsirSurah("not json", 1)).toBeNull();
    expect(parseSavedTafsirSurah(JSON.stringify([{ surah: 2, ayah: 1, text: "x" }]), 1)).toBeNull();
    expect(parseSavedTafsirSurah(JSON.stringify([{ surah: 1, ayah: 9, text: "x" }]), 1)).toBeNull();
    expect(parseSavedTafsirSurah(JSON.stringify([]), 1)).toBeNull();
  });

  it("asks the phone for the saved file only in the apps", async () => {
    expect(await readSavedTafsirSurah(BASE, "ar-tafsir-ibn-kathir", 1)).toBeNull();
    expect(native.readDownloaded).not.toHaveBeenCalled();
    native.isNative = true;
    native.readDownloaded.mockResolvedValueOnce({ text: JSON.stringify([{ surah: 1, ayah: 1, text: "تفسير" }]) });
    const ayahs = await readSavedTafsirSurah(BASE, "ar-tafsir-ibn-kathir", 1);
    expect(native.readDownloaded).toHaveBeenCalledWith({ url: `${BASE}/ar-tafsir-ibn-kathir/1.json` });
    expect(ayahs?.[1]).toBe("تفسير");
  });

  it("an older app build without the method falls back quietly", async () => {
    native.isNative = true;
    native.readDownloaded.mockRejectedValueOnce(new Error("not implemented"));
    expect(await readSavedTafsirSurah(BASE, "ar-tafsir-ibn-kathir", 2)).toBeNull();
  });
});

describe("saving an edition", () => {
  it("hands all 114 surahs to the native background downloader as a tafsir batch", async () => {
    native.isNative = true;
    native.download.mockResolvedValueOnce({ saved: 114, failed: 0, evicted: 0 });
    const result = await saveTafsirEdition({ base: BASE, slug: "ar-tafseer-al-saddi", label: "السعدي", onProgress: () => {}, loadSurah: vi.fn() });
    expect(result).toEqual({ saved: 114, total: 114 });
    const call = native.download.mock.calls[0]![0];
    expect(call.kind).toBe("tafsir");
    expect(call.title).toBe("تفسير السعدي");
    expect(call.urls).toEqual(tafsirEditionUrls(BASE, "ar-tafseer-al-saddi"));
    expect(call.urls[113]).toBe(`${BASE}/ar-tafseer-al-saddi/114.json`);
  });

  it("on the web loads each surah (into the browser's tafsir database) with progress", async () => {
    const loadSurah = vi.fn(async (surahId: number) => {
      if (surahId === 50) throw new Error("offline");
    });
    const progress: number[] = [];
    const result = await saveTafsirEdition({ base: BASE, slug: "ar-tafseer-al-saddi", label: "السعدي", onProgress: (done) => progress.push(done), loadSurah });
    expect(loadSurah).toHaveBeenCalledTimes(114);
    expect(result).toEqual({ saved: 113, total: 114 });
    expect(progress.at(-1)).toBe(114);
  });
});
