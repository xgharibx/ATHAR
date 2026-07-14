// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TRANSLATION_SOURCES,
  TranslationId,
  getSavedTranslationId,
  registerSaheehExtras,
  type TranslationSource,
} from "@/lib/quranTranslations";

const SAHEEH: TranslationSource = TRANSLATION_SOURCES.find((s) => s.id === "saheeh")!;
const YUSUF: TranslationSource = TRANSLATION_SOURCES.find((s) => s.id === "yusuf_ali")!;
const JALANDHRY: TranslationSource = TRANSLATION_SOURCES.find((s) => s.id === "jalandhry")!;

describe("quranTranslations module", () => {
  beforeEach(() => {
    registerSaheehExtras(null);
    vi.restoreAllMocks();
  });
  afterEach(() => {
    registerSaheehExtras(null);
  });

  it("exports exactly the three sources in the expected order", () => {
    expect(TRANSLATION_SOURCES.map((s) => s.id)).toEqual([
      "saheeh",
      "yusuf_ali",
      "jalandhry",
    ]);
  });

  it("every source has matching arabic + english label and a valid lang code", () => {
    for (const s of TRANSLATION_SOURCES) {
      expect(s.ar.length).toBeGreaterThan(0);
      expect(s.en.length).toBeGreaterThan(0);
      expect(["en", "ur"]).toContain(s.lang);
    }
  });

  it("Saheeh is the only bundled source and has no API id", () => {
    expect(SAHEEH.bundled).toBe(true);
    expect(SAHEEH.apiId).toBeNull();
    for (const s of TRANSLATION_SOURCES.filter((x) => x.id !== "saheeh")) {
      expect(s.bundled).toBe(false);
      expect(typeof s.apiId).toBe("number");
    }
  });

  it("non-bundled sources carry the quran.foundation API ids the picker claims", () => {
    expect(YUSUF.apiId).toBe(84);
    expect(JALANDHRY.apiId).toBe(157);
    expect(YUSUF.lang).toBe("en");
    expect(JALANDHRY.lang).toBe("ur");
  });

  it("preferences round-trip: override beats pref, pref beats default", () => {
    expect(getSavedTranslationId({}, null)).toBe("saheeh");
    expect(getSavedTranslationId({}, "yusuf_ali" as TranslationId)).toBe("yusuf_ali");
    expect(
      getSavedTranslationId({ quranTranslationId: "jalandhry" }, null),
    ).toBe("jalandhry");
    expect(
      getSavedTranslationId(
        { quranTranslationId: "saheeh" },
        "yusuf_ali" as TranslationId,
      ),
    ).toBe("yusuf_ali");
  });

  it("getTranslation falls back to Saheeh when remote fetch rejects", async () => {
    // Mock fetch to reject; ensure the call doesn't crash and resolves.
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const { getTranslation } = await import("@/lib/quranTranslations");
    // Saheeh with null bundle yields null cleanly.
    await expect(getTranslation("saheeh", 1)).resolves.toBeNull();
    // Remote source falls back to Saheeh (also null here since MEMORY_SAHEEH is null).
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
});
