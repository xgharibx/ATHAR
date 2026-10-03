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

    expect(idbGetExtras).toHaveBeenCalledWith("noor_quran_extras_v3");
    expect(getTafsirForAyah(extras, 1, 1)).toBe(bundle["1"][1]);
  });
});
