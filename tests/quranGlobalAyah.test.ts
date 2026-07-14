// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { globalAyahNumber } from "@/data/quranExtras";

describe("globalAyahNumber", () => {
  it("returns 1 for surah 1 ayah 1", () => {
    expect(globalAyahNumber(1, 1)).toBe(1);
  });
  it("returns 7 for surah 1 last ayah", () => {
    expect(globalAyahNumber(1, 7)).toBe(7);
  });
  it("returns 8 for surah 2 ayah 1", () => {
    expect(globalAyahNumber(2, 1)).toBe(8);
  });
  it("returns 255+7=262 for surah 2 ayah 255 (آية الكرسي)", () => {
    expect(globalAyahNumber(2, 255)).toBe(262);
  });
  it("returns last ayah of Quran: surah 114 ayah 6 = 6236", () => {
    expect(globalAyahNumber(114, 6)).toBe(6236);
  });
});