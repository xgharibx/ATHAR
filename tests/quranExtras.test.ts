// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { idbGetExtras, idbSetExtras } = vi.hoisted(() => ({
  idbGetExtras: vi.fn(async () => ({
    version: 2,
    data: { englishSahih: null, tafsir: [] },
  })),
  idbSetExtras: vi.fn(async () => undefined),
}));

vi.mock("@/lib/quranIDB", () => ({ idbGetExtras, idbSetExtras }));

import { getTafsirForAyah, isQuranExtrasComplete, loadQuranExtras } from "@/data/quranExtras";
import { getSurahAyahCount, globalAyahNumber } from "@/data/quranSurahCounts";

function completeExtrasFixture() {
  const englishSahih: Record<string, [string, string]> = {};
  const tafsir: Array<{ surahId: number; ayahIndex: number; text: string }> = [];
  for (let surahId = 1; surahId <= 114; surahId += 1) {
    for (let ayahIndex = 1; ayahIndex <= getSurahAyahCount(surahId); ayahIndex += 1) {
      const globalAyah = globalAyahNumber(surahId, ayahIndex);
      englishSahih[String(globalAyah)] = ["", `Translation ${globalAyah}`];
      tafsir.push({ surahId, ayahIndex, text: `Tafsir passage ${globalAyah} has enough text.` });
    }
  }
  return { englishSahih, tafsir };
}

describe("Quran extras bundled tafsir", () => {
  beforeEach(() => {
    idbGetExtras.mockClear();
    idbSetExtras.mockClear();
    vi.unstubAllGlobals();
  });

  it("rejects a cached bundle with duplicate or missing ayah identities even when counts match", () => {
    const extras = completeExtrasFixture();
    delete extras.englishSahih["1"];
    extras.englishSahih.extra = ["", "Translation with no ayah identity"];
    extras.tafsir[extras.tafsir.length - 1] = { ...extras.tafsir[0] };

    expect(isQuranExtrasComplete(extras)).toBe(false);
  });

  it("rebuilds the index from the shipped Muyassar shape and skips the stale empty cache", async () => {
    const bundle = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/data/tafseer-muyassar.json"), "utf8"),
    ) as Record<string, string[]>;
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = url.endsWith("/data/tafseer-muyassar.json") ? bundle : {};
      return { ok: true, json: async () => json } as Response;
    });
    vi.stubGlobal("fetch", mockFetch);

    const extras = await loadQuranExtras();

    expect(idbGetExtras).toHaveBeenCalledWith("noor_quran_extras_v5");
    expect(getTafsirForAyah(extras, 1, 1)).toBe(bundle["1"][1]);
  });

  it("maps the shipped Saheeh surah arrays to their correct global ayah numbers", async () => {
    const translationBundle = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/data/quran-en-sahih.json"), "utf8"),
    ) as Record<string, string[]>;
    idbGetExtras.mockResolvedValue(null);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = url.endsWith("/data/quran-en-sahih.json") ? translationBundle : {};
      return { ok: true, json: async () => json } as Response;
    }));
    vi.resetModules();
    const { getEnglishText, loadQuranExtras } = await import("@/data/quranExtras");
    const extras = await loadQuranExtras();

    expect(getEnglishText(extras, 1)).toBe(translationBundle["1"]?.[0]);
    expect(getEnglishText(extras, 7)).toBe(translationBundle["1"]?.[6]);
    expect(getEnglishText(extras, 8)).toBe(translationBundle["2"]?.[0]);
    expect(getEnglishText(extras, 255)).toBe(translationBundle["2"]?.[247]);
    expect(getEnglishText(extras, 6236)).toBe(translationBundle["114"]?.[5]);
  });

  it("retries failed bundle downloads and never persists incomplete extras", async () => {
    idbGetExtras.mockResolvedValue(null);
    const translationBundle = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/data/quran-en-sahih.json"), "utf8"),
    ) as Record<string, string[]>;
    const tafsirBundle = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/data/tafseer-muyassar.json"), "utf8"),
    ) as Record<string, string[]>;
    const attempts = new Map<string, number>();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const attempt = (attempts.get(url) ?? 0) + 1;
      attempts.set(url, attempt);
      if (attempt === 1) return { ok: false, status: 503, json: async () => ({}) } as Response;
      const json = url.endsWith("/data/quran-en-sahih.json") ? translationBundle : tafsirBundle;
      return { ok: true, json: async () => json } as Response;
    }));

    vi.resetModules();
    const { getEnglishText, getTafsirForAyah, loadQuranExtras } = await import("@/data/quranExtras");

    const partial = await loadQuranExtras();
    expect(partial.englishSahih).toBeNull();
    expect(partial.tafsir).toBeNull();
    expect(idbSetExtras).not.toHaveBeenCalled();

    const recovered = await loadQuranExtras();
    expect(getEnglishText(recovered, 1)).toBe(translationBundle["1"]?.[0]);
    expect(getTafsirForAyah(recovered, 1, 1)).toBe(tafsirBundle["1"]?.[1]);
    expect(attempts.size).toBe(2);
    expect([...attempts.values()]).toEqual([2, 2]);
    expect(idbSetExtras).toHaveBeenCalledWith("noor_quran_extras_v5", expect.objectContaining({
      version: 5,
      data: expect.objectContaining({ englishSahih: expect.any(Object), tafsir: expect.any(Array) }),
    }));
  });
});
