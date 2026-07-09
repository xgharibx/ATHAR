import { describe, it, expect } from "vitest";
import { globalAyahToRef, refToGlobalAyah } from "@/lib/mutashabihat";

// A small synthetic Quran DB mirroring the real shape (surah id + ayahs array),
// sized like the first three surahs (7, 286, 200 ayahs) to exercise
// first-ayah/last-ayah/surah-boundary edge cases without loading the full 6236-ayah file.
const FIXTURE = [
  { id: 1, ayahs: Array.from({ length: 7 }, () => "") },
  { id: 2, ayahs: Array.from({ length: 286 }, () => "") },
  { id: 3, ayahs: Array.from({ length: 200 }, () => "") },
];

describe("globalAyahToRef / refToGlobalAyah", () => {
  it("resolves the very first ayah of the Quran", () => {
    expect(globalAyahToRef(FIXTURE, 1)).toEqual({ surahId: 1, ayahIndex: 1 });
  });

  it("resolves the last ayah of the first surah", () => {
    expect(globalAyahToRef(FIXTURE, 7)).toEqual({ surahId: 1, ayahIndex: 7 });
  });

  it("resolves the first ayah right after a surah boundary", () => {
    expect(globalAyahToRef(FIXTURE, 8)).toEqual({ surahId: 2, ayahIndex: 1 });
  });

  it("resolves a known real reference: global 9 is Al-Baqarah ayah 2", () => {
    expect(globalAyahToRef(FIXTURE, 9)).toEqual({ surahId: 2, ayahIndex: 2 });
  });

  it("resolves the last ayah of the second surah and first of the third", () => {
    expect(globalAyahToRef(FIXTURE, 7 + 286)).toEqual({ surahId: 2, ayahIndex: 286 });
    expect(globalAyahToRef(FIXTURE, 7 + 286 + 1)).toEqual({ surahId: 3, ayahIndex: 1 });
  });

  it("returns null past the end of the fixture", () => {
    expect(globalAyahToRef(FIXTURE, 7 + 286 + 200 + 1)).toBeNull();
  });

  it("round-trips ref -> global -> ref for every surah boundary in the fixture", () => {
    for (const { surahId, ayahIndex } of [
      { surahId: 1, ayahIndex: 1 },
      { surahId: 1, ayahIndex: 7 },
      { surahId: 2, ayahIndex: 1 },
      { surahId: 2, ayahIndex: 2 },
      { surahId: 2, ayahIndex: 286 },
      { surahId: 3, ayahIndex: 1 },
      { surahId: 3, ayahIndex: 200 },
    ]) {
      const g = refToGlobalAyah(FIXTURE, surahId, ayahIndex);
      expect(g).not.toBeNull();
      expect(globalAyahToRef(FIXTURE, g!)).toEqual({ surahId, ayahIndex });
    }
  });

  it("refToGlobalAyah returns null for a surah not in the DB", () => {
    expect(refToGlobalAyah(FIXTURE, 999, 1)).toBeNull();
  });
});
