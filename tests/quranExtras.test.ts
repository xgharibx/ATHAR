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

import { getTafsirForAyah, loadQuranExtras } from "@/data/quranExtras";

describe("Quran extras bundled tafsir", () => {
  beforeEach(() => {
    idbGetExtras.mockClear();
    idbSetExtras.mockClear();
    vi.unstubAllGlobals();
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

    expect(idbGetExtras).toHaveBeenCalledWith("noor_quran_extras_v4");
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
});
