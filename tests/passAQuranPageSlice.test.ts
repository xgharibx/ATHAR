// @vitest-environment node
/**
 * Pass A — virtual pagination helper for the inline Quran.tsx surah detail.
 *
 * The detail view splits a surah's ayah list into pages of `quranPageSize`
 * each; this helper is the pure function the UI calls, so its correctness
 * matters more than the React wrapping around it. The suite pins the
 * invariants we rely on for accessibility / "previous / next" semantics.
 */
import { describe, expect, it } from "vitest";
import { getSurahPageSlice } from "@/pages/Quran";

describe("getSurahPageSlice (Pass A surah virtual pagination)", () => {
  it("returns the first page when pageIndex is 0", () => {
    const ayahs = ["a1", "a2", "a3", "a4", "a5"];
    const r = getSurahPageSlice(ayahs, 2, 0);
    expect(r.items).toEqual(["a1", "a2"]);
    expect(r.totalPages).toBe(3);
    expect(r.pageIndex).toBe(0);
  });

  it("returns the last page with the (possibly) short tail", () => {
    const ayahs = ["a1", "a2", "a3", "a4", "a5"];
    const r = getSurahPageSlice(ayahs, 2, 2);
    expect(r.items).toEqual(["a5"]);
    expect(r.totalPages).toBe(3);
    expect(r.pageIndex).toBe(2);
  });

  it("clamps pageIndex to [0, totalPages-1]", () => {
    const ayahs = ["a1", "a2", "a3", "a4"];
    expect(getSurahPageSlice(ayahs, 2, -1).pageIndex).toBe(0);
    // 4 items / 2 per page = 2 pages, so index clamps to 1
    expect(getSurahPageSlice(ayahs, 2, 99).pageIndex).toBe(1);
    expect(getSurahPageSlice(ayahs, 2, 99).items).toEqual(["a3", "a4"]);
  });

  it("returns an empty result for an empty ayah list", () => {
    const r = getSurahPageSlice([], 10, 0);
    expect(r.items).toEqual([]);
    expect(r.totalPages).toBe(0);
    expect(r.pageIndex).toBe(0);
  });

  it("returns at least 1 total page when ayahs is non-empty even if pageSize is huge", () => {
    const r = getSurahPageSlice(["a1", "a2"], 1000, 0);
    expect(r.items).toEqual(["a1", "a2"]);
    expect(r.totalPages).toBe(1);
  });

  it("returns an empty result when pageSize is zero or negative (defensive)", () => {
    expect(getSurahPageSlice(["a1", "a2"], 0, 0).items).toEqual([]);
    expect(getSurahPageSlice(["a1", "a2"], -5, 0).items).toEqual([]);
  });

  it("uses pageSize=10 by default for the Quran pref default of 12", () => {
    // Mirrors the user spec: 10 ayahs per virtual page.
    const ayahs = Array.from({ length: 25 }, (_, i) => `a${i + 1}`);
    const r = getSurahPageSlice(ayahs, 10, 0);
    expect(r.items).toHaveLength(10);
    expect(r.totalPages).toBe(3);
    const r2 = getSurahPageSlice(ayahs, 10, 2);
    expect(r2.items).toHaveLength(5); // 21..25
  });

  it("Al-Fatihah with default pageSize=12 fits on a single page", () => {
    const ayahs = ["a1", "a2", "a3", "a4", "a5", "a6", "a7"];
    const r = getSurahPageSlice(ayahs, 12, 0);
    expect(r.totalPages).toBe(1);
    expect(r.items).toEqual(ayahs);
  });

  it("Al-Baqarah (286 ayahs) with pageSize=10 yields 29 virtual pages", () => {
    const ayahs = Array.from({ length: 286 }, (_, i) => `a${i + 1}`);
    const r = getSurahPageSlice(ayahs, 10, 28);
    expect(r.totalPages).toBe(29);
    expect(r.items).toHaveLength(6); // 281..286
    expect(r.items[0]).toBe("a281");
  });
});