import { describe, expect, it } from "vitest";
import {
  getTafsirEditionSlug,
  parseTafsirApiResponse,
  parseTafsirEmptyAyahs,
} from "@/lib/tafsirEditions";

const fatiha = Array.from({ length: 7 }, (_, index) => ({
  ayah: index + 1,
  surah: 1,
  text: `تفسير الآية ${index + 1}`,
}));

describe("tafsir API response normalization", () => {
  it("accepts the complete array response used by most editions", () => {
    expect(parseTafsirApiResponse(fatiha, 1)).toEqual(fatiha);
  });

  it("accepts Tanwir al-Miqbas' complete ayahs envelope", () => {
    expect(parseTafsirApiResponse({ ayahs: fatiha }, 1)).toEqual(fatiha);
  });

  it("rejects malformed, cross-surah, duplicate, empty, and incomplete entries", () => {
    expect(() => parseTafsirApiResponse({ data: [] }, 1)).toThrow("Invalid tafsir response");
    expect(() => parseTafsirApiResponse([{ ...fatiha[0], surah: 2 }, ...fatiha.slice(1)], 1))
      .toThrow("Invalid tafsir response");
    expect(() => parseTafsirApiResponse([{ ...fatiha[0], text: null }, ...fatiha.slice(1)], 1))
      .toThrow("Invalid tafsir response");
    expect(() => parseTafsirApiResponse([{ ...fatiha[0], text: "   " }, ...fatiha.slice(1)], 1))
      .toThrow("Invalid tafsir response");
    expect(() => parseTafsirApiResponse(fatiha.slice(0, 6), 1)).toThrow("Invalid tafsir response");
    expect(() => parseTafsirApiResponse([fatiha[0], ...fatiha.slice(1), fatiha[0]], 1))
      .toThrow("Invalid tafsir response");
  });

  it("accepts only declared empty ayahs when validating a sparse edition", () => {
    const rows = Array.from({ length: 286 }, (_, index) => index + 1)
      .filter((ayah) => ayah !== 83 && ayah !== 84)
      .map((ayah) => ({ ayah, surah: 2, text: `شرح ${ayah}` }));

    expect(parseTafsirApiResponse(rows, 2, [83, 84])).toHaveLength(284);
    expect(() => parseTafsirApiResponse(rows, 2)).toThrow("Invalid tafsir response");
    expect(() => parseTafsirApiResponse(rows, 2, [83])).toThrow("Invalid tafsir response");
  });

  it("normalizes the provider's empty-ayah metadata and rejects invalid declarations", () => {
    expect(parseTafsirEmptyAyahs([
      { surah: 2, ayah: 83 },
      { surah: 2, ayah: 84 },
    ], 2)).toEqual([83, 84]);
    expect(() => parseTafsirEmptyAyahs([{ surah: 1, ayah: 83 }], 2)).toThrow("Invalid tafsir response");
    expect(() => parseTafsirEmptyAyahs([{ surah: 2, ayah: 287 }], 2)).toThrow("Invalid tafsir response");
    expect(() => parseTafsirEmptyAyahs([{ surah: 2, ayah: 83 }, { surah: 2, ayah: 83 }], 2))
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
