import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { assignChapters, shortChapterTitle } from "@/data/hadithChapters";
import { HADITH, BOOK, countAr } from "@/lib/arabicCount";
import type { HadithItem, HadithSection } from "@/data/hadithTypes";

const table = JSON.parse(readFileSync("public/data/hadith/sections.json", "utf8")) as Record<string, { id: number; t: string; f: number; l: number }[]>;

describe("hadith chapters", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("names every chapter of the seven books in Arabic", () => {
    const expected: Record<string, number> = { bukhari: 97, muslim: 57, abudawud: 43, tirmidhi: 49, nasai: 51, ibnmajah: 38, malik: 61 };
    for (const [key, n] of Object.entries(expected)) {
      expect(table[key]).toHaveLength(n);
      for (const c of table[key]!) {
        expect(c.t).toMatch(/[ء-ي]/);
        expect(c.t).not.toMatch(/[A-Za-z]/);
        expect(c.t).not.toContain("عن رسول الله");
      }
    }
    expect(table.bukhari![0]!.t).toBe("كتاب بدء الوحي");
    expect(table.bukhari![1]!.t).toBe("كتاب الإيمان");
  });

  it("gives each hadith the chapter whose range it falls in", () => {
    const chapters: HadithSection[] = [
      { id: 1, title: "كتاب بدء الوحي", first: 1, last: 7 },
      { id: 2, title: "كتاب الإيمان", first: 8, last: 58 },
    ];
    const hadiths = [1, 7, 8, 58.2, 60].map((n) => ({ n, a: n, s: 1, t: "x", g: [] })) as HadithItem[];
    expect(assignChapters(hadiths, chapters).map((h) => h.s)).toEqual([1, 1, 2, 2, 2]);
  });

  it("shortens titles for tight places", () => {
    expect(shortChapterTitle("كتاب الإيمان")).toBe("الإيمان");
    expect(shortChapterTitle("أبواب الوتر")).toBe("الوتر");
  });

  it("counts hadiths and books the way Arabic says it", () => {
    expect(countAr(1, HADITH)).toBe("حديث واحد");
    expect(countAr(2, HADITH)).toBe("حديثان");
    expect(countAr(7, HADITH)).toBe("٧ أحاديث");
    expect(countAr(42, HADITH)).toBe("٤٢ حديثًا");
    expect(countAr(100, HADITH)).toBe("١٠٠ حديث");
    expect(countAr(7589, HADITH)).toBe("٧٬٥٨٩ حديثًا");
    expect(countAr(97, BOOK)).toBe("٩٧ كتابًا");
  });
});
