import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const proxy = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/lib/authClient", () => ({
  getSupabase: () => ({ functions: { invoke: proxy.invoke } }),
}));

function chapterOnePayload(translationId = 22) {
  return {
    translations: [
      { verse_key: "1:1", text: `Translation ${translationId}:1:1` },
      { verse_key: "1:2", text: `Translation ${translationId}:1:2` },
      { verse_key: "1:3", text: `Translation ${translationId}:1:3` },
      { verse_key: "1:4", text: `Translation ${translationId}:1:4` },
      { verse_key: "1:5", text: `Translation ${translationId}:1:5` },
      { verse_key: "1:6", text: `Translation ${translationId}:1:6` },
      { verse_key: "1:7", text: `Translation ${translationId}:1:7` },
    ],
    meta: { translation_name: "Synthetic translation", author_name: "Synthetic author", filters: { chapter_number: 1 } },
  };
}

beforeEach(() => {
  vi.resetModules();
  proxy.invoke.mockReset();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Quran Foundation translation proxy client", () => {
  it("loads a selected ayah through the allowlisted server function", async () => {
    proxy.invoke.mockResolvedValue({ data: chapterOnePayload(), error: null });
    const { getTranslationForAyah } = await import("@/lib/quranTranslations");

    await expect(getTranslationForAyah("yusuf_ali", 1, 2)).resolves.toBe("Translation 22:1:2");
    expect(proxy.invoke).toHaveBeenCalledWith("quran-translations", {
      body: { translationId: 22, chapterNumber: 1 },
    });
  });

  it("loads one surah at a time and indexes its ayahs by local verse number", async () => {
    proxy.invoke.mockResolvedValue({ data: chapterOnePayload(), error: null });
    const { loadTranslationForSurahs } = await import("@/lib/quranTranslations");

    const result = await loadTranslationForSurahs("yusuf_ali", [1]);

    expect(result[1]).toEqual([
      "",
      "Translation 22:1:1",
      "Translation 22:1:2",
      "Translation 22:1:3",
      "Translation 22:1:4",
      "Translation 22:1:5",
      "Translation 22:1:6",
      "Translation 22:1:7",
    ]);
    expect(proxy.invoke).toHaveBeenCalledTimes(1);
  });

  it("reuses the validated chapter in memory and refuses out-of-range ayahs", async () => {
    proxy.invoke.mockResolvedValue({ data: chapterOnePayload(), error: null });
    const { getTranslationForAyah } = await import("@/lib/quranTranslations");

    await expect(getTranslationForAyah("yusuf_ali", 1, 1)).resolves.toBe("Translation 22:1:1");
    await expect(getTranslationForAyah("yusuf_ali", 1, 7)).resolves.toBe("Translation 22:1:7");
    await expect(getTranslationForAyah("yusuf_ali", 1, 8)).resolves.toBeNull();
    expect(proxy.invoke).toHaveBeenCalledTimes(1);
  });

  it("expires remote text from memory at the one-week limit", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    proxy.invoke.mockResolvedValue({ data: chapterOnePayload(), error: null });
    const { getTranslationForAyah } = await import("@/lib/quranTranslations");
    await expect(getTranslationForAyah("yusuf_ali", 1, 1)).resolves.toBe("Translation 22:1:1");

    vi.setSystemTime(new Date("2026-01-08T00:00:00.001Z"));
    proxy.invoke.mockResolvedValue({ data: null, error: { message: "offline" } });

    await expect(getTranslationForAyah("yusuf_ali", 1, 1)).resolves.toBeNull();
    expect(proxy.invoke).toHaveBeenCalledTimes(2);
  });

  it("does not silently substitute the bundled translation when the selected source fails", async () => {
    proxy.invoke.mockResolvedValue({ data: null, error: { message: "upstream unavailable" } });
    const { getTranslation, loadTranslationForSurahs } = await import("@/lib/quranTranslations");
    const { registerSaheehExtras } = await import("@/lib/quranTranslations");
    registerSaheehExtras({ englishSahih: { "1": ["1:1", "Bundled Saheeh"] }, tafsir: null });

    await expect(getTranslation("yusuf_ali", 1)).resolves.toBeNull();
    await expect(loadTranslationForSurahs("yusuf_ali", [1])).rejects.toThrow("upstream unavailable");
  });

  it("rejects an incomplete chapter instead of caching a translation with silent gaps", async () => {
    proxy.invoke.mockResolvedValue({ data: { translations: [{ verse_key: "1:1", text: "Only one verse" }] }, error: null });
    const { loadTranslationForSurahs } = await import("@/lib/quranTranslations");

    await expect(loadTranslationForSurahs("jalandhry", [1])).rejects.toThrow("incomplete translation chapter");
  });
});
