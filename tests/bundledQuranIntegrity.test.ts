// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { QuranFileSchema, QuranPageMapSchema } from "@/data/quranTypes";

describe("bundled Quran offline assets", () => {
  it("ships a valid page map covering every verse without a network fallback", () => {
    const quran = QuranFileSchema.parse(JSON.parse(readFileSync(resolve("public/data/quran.json"), "utf8")));
    const pages = QuranPageMapSchema.parse(JSON.parse(readFileSync(resolve("public/data/quran_page_map.json"), "utf8")));
    expect(quran.surahs).toHaveLength(114);
    expect(quran.surahs.reduce((total, surah) => total + surah.ayahs.length, 0)).toBe(6236);
    expect(pages.totalPages).toBe(604);
    expect(Object.keys(pages.map)).toHaveLength(6236);
    expect(pages.map["1:1"]).toBe(1);
    expect(pages.map["114:6"]).toBe(604);
    const usedPages = new Set<number>();
    for (const surah of quran.surahs) {
      for (let i = 1; i <= surah.ayahs.length; i++) {
        const page = pages.map[`${surah.id}:${i}`];
        expect(Number.isInteger(page), `${surah.id}:${i} has no page`).toBe(true);
        expect(page).toBeGreaterThanOrEqual(1);
        expect(page).toBeLessThanOrEqual(604);
        usedPages.add(page);
      }
    }
    expect(usedPages.size).toBe(604);
  });
});
