import { describe, expect, it } from "vitest";
import { getFirstAyahOfJuz, getHizbProgress, getJuzProgress, surahContainsJuz } from "@/lib/quranJuz";

describe("Quran juz filtering and progress", () => {
  it("includes surahs in every juz they cross, not only their starting juz", () => {
    expect(surahContainsJuz(2, 286, 1)).toBe(true);
    expect(surahContainsJuz(2, 286, 2)).toBe(true);
    expect(surahContainsJuz(2, 286, 3)).toBe(true);
    expect(surahContainsJuz(2, 286, 4)).toBe(false);
  });

  it("assigns ayahs and read progress to their actual juz boundaries", () => {
    const progress = getJuzProgress(
      [{ id: 2, ayahs: Array.from({ length: 286 }) }],
      { "2": 151 },
    );

    // Al-Baqarah's first 141 ayahs are in Juz 1; ayahs 142–252 are
    // in Juz 2; ayahs 253–286 are in Juz 3.
    expect(progress[1]).toBe(100);
    expect(progress[2]).toBe(9);
    expect(progress[3]).toBe(0);
  });

  it("opens a surah at the first ayah of the selected juz", () => {
    expect(getFirstAyahOfJuz(2, 286, 2)).toBe(142);
    expect(getFirstAyahOfJuz(2, 286, 3)).toBe(253);
    expect(getFirstAyahOfJuz(2, 286, 4)).toBeNull();
  });

  it("tracks the two visible completion markers by hizb", () => {
    const progress = getHizbProgress(
      [{ id: 2, ayahs: Array.from({ length: 286 }) }],
      { "2": 74 },
    );

    expect(progress[1]).toBe(100);
    expect(progress[2]).toBe(0);
    expect(progress[3]).toBe(0);
  });
});
