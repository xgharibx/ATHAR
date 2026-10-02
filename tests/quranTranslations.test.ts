// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TranslationId, TranslationSource } from "@/lib/quranTranslations";

let quranTranslations: typeof import("@/lib/quranTranslations");
let SAHEEH: TranslationSource;
let YUSUF: TranslationSource;
let JALANDHRY: TranslationSource;

describe("quranTranslations module", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.stubEnv("VITE_SUPABASE_URL", "https://synthetic.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "synthetic-anon-key");
    quranTranslations = await import("@/lib/quranTranslations");
    SAHEEH = quranTranslations.TRANSLATION_SOURCES.find((s) => s.id === "saheeh")!;
    YUSUF = quranTranslations.TRANSLATION_SOURCES.find((s) => s.id === "yusuf_ali")!;
    JALANDHRY = quranTranslations.TRANSLATION_SOURCES.find((s) => s.id === "jalandhry")!;
    quranTranslations.registerSaheehExtras(null);
  });
  afterEach(() => {
    quranTranslations.registerSaheehExtras(null);
    vi.unstubAllEnvs();
  });

  it("exports exactly the three sources in the expected order", () => {
    expect(quranTranslations.TRANSLATION_SOURCES.map((s) => s.id)).toEqual([
      "saheeh",
      "yusuf_ali",
      "jalandhry",
    ]);
  });

  it("every source has matching arabic + english label and a valid lang code", () => {
    for (const s of quranTranslations.TRANSLATION_SOURCES) {
      expect(s.ar.length).toBeGreaterThan(0);
      expect(s.en.length).toBeGreaterThan(0);
      expect(["en", "ur"]).toContain(s.lang);
    }
  });

  it("Saheeh is the only bundled source and has no API id", () => {
    expect(SAHEEH.bundled).toBe(true);
    expect(SAHEEH.apiId).toBeNull();
    for (const s of quranTranslations.TRANSLATION_SOURCES.filter((x) => x.id !== "saheeh")) {
      expect(s.bundled).toBe(false);
      expect(typeof s.apiId).toBe("number");
    }
  });

  it("non-bundled sources carry the quran.foundation API ids the picker claims", () => {
    expect(YUSUF.apiId).toBe(22);
    expect(JALANDHRY.apiId).toBe(234);
    expect(YUSUF.lang).toBe("en");
    expect(JALANDHRY.lang).toBe("ur");
  });

  it("preferences round-trip: override beats pref, pref beats default", () => {
    expect(quranTranslations.getSavedTranslationId({}, null)).toBe("saheeh");
    expect(quranTranslations.getSavedTranslationId({}, "yusuf_ali" as TranslationId)).toBe("yusuf_ali");
    expect(
      quranTranslations.getSavedTranslationId({ quranTranslationId: "jalandhry" }, null),
    ).toBe("jalandhry");
    expect(
      quranTranslations.getSavedTranslationId(
        { quranTranslationId: "saheeh" },
        "yusuf_ali" as TranslationId,
      ),
    ).toBe("yusuf_ali");
  });

  it("getTranslation returns null when the selected remote source is unavailable", async () => {
    // Mock the Supabase function transport to fail; ensure the call degrades cleanly.
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const { getTranslation } = await import("@/lib/quranTranslations");
    // Saheeh with null bundle yields null cleanly.
    await expect(getTranslation("saheeh", 1)).resolves.toBeNull();
    // A remote selection never masquerades as bundled Saheeh when it fails.
    await expect(getTranslation("yusuf_ali", 1)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("getTranslationForAyah routes through the global ayah helper", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("net"));
    vi.stubGlobal("fetch", fetchMock);
    const { getTranslationForAyah } = await import("@/lib/quranTranslations");
    // No Saheeh bundle registered, so both resolve to null without crashing.
    await expect(getTranslationForAyah("jalandhry", 1, 1)).resolves.toBeNull();
  });

  it("getTranslationSourceMeta returns static metadata for each source", () => {
    expect(quranTranslations.getTranslationSourceMeta("saheeh").bundled).toBe(true);
    expect(quranTranslations.getTranslationSourceMeta("yusuf_ali").apiId).toBe(22);
    expect(quranTranslations.getTranslationSourceMeta("jalandhry").apiId).toBe(234);
    expect(() => quranTranslations.getTranslationSourceMeta("nope" as TranslationId)).toThrow();
  });

  it("getTranslationApproxSizeKB matches the documented approximate sizes", () => {
    expect(quranTranslations.getTranslationApproxSizeKB("saheeh")).toBe(880);
    expect(quranTranslations.getTranslationApproxSizeKB("yusuf_ali")).toBe(900);
    expect(quranTranslations.getTranslationApproxSizeKB("jalandhry")).toBe(1200);
  });

  it("loads the bundled source offline and surfaces remote-source failures", async () => {
    // Stub fetch: succeed for the bundled JSON, reject the remote function transport.
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("quran-en-sahih.json")) {
        return new Response(JSON.stringify({}), { status: 200 });
      }
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", fetchMock);
    const { loadTranslationForSurahs } = await import("@/lib/quranTranslations");
    const bundled = await loadTranslationForSurahs("saheeh", [1, 2]);
    expect(bundled).toBeTypeOf("object");
    await expect(loadTranslationForSurahs("yusuf_ali", [1])).rejects.toThrow();
  });
});
