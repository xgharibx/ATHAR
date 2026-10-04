import { describe, expect, it } from "vitest";
import { getTafsirEditionSlug, parseTafsirApiResponse } from "@/lib/tafsirEditions";

describe("tafsir API response normalization", () => {
  it("accepts the array response used by most editions", () => {
    expect(parseTafsirApiResponse([
      { ayah: 1, surah: 1, text: "تفسير الآية الأولى" },
      { ayah: 2, surah: 1, text: "تفسير الآية الثانية" },
    ], 1)).toEqual([
      { ayah: 1, text: "تفسير الآية الأولى", surah: 1 },
      { ayah: 2, text: "تفسير الآية الثانية", surah: 1 },
    ]);
  });

  it("accepts Tanwir al-Miqbas' ayahs envelope", () => {
    expect(parseTafsirApiResponse({
      ayahs: [{ ayah: 1, surah: 1, text: "تفسير تنوير المقباس" }],
    }, 1)).toEqual([{ ayah: 1, text: "تفسير تنوير المقباس", surah: 1 }]);
  });

  it("rejects malformed or cross-surah entries", () => {
    expect(() => parseTafsirApiResponse({ data: [] }, 1)).toThrow("Invalid tafsir response");
    expect(() => parseTafsirApiResponse({ ayahs: [{ ayah: 1, surah: 2, text: "نص" }] }, 1))
      .toThrow("Invalid tafsir response");
    expect(() => parseTafsirApiResponse([{ ayah: 286, surah: 1, text: "آية خارج سورة الفاتحة" }], 1))
      .toThrow("Invalid tafsir response");
  });
});

describe("tafsir edition deep links", () => {
  it("allows only a known source slug from the URL", () => {
    expect(getTafsirEditionSlug("ar-tafseer-tanwir-al-miqbas")).toBe("ar-tafseer-tanwir-al-miqbas");
    expect(getTafsirEditionSlug("unknown-edition")).toBeNull();
    expect(getTafsirEditionSlug(null)).toBeNull();
  });
});
