// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { buildAyahIndex, searchAyah, invalidateAyahIndex } from "@/data/quranAyahIndex";
import type { QuranDB } from "@/data/quranTypes";

const mini: QuranDB = [
  {
    id: 1,
    name: "الفاتحة",
    englishName: "The Opening",
    revelation: "meccan",
    versesCount: 7,
    ayatCount: 7,
    pages: [1],
    ayahs: [
      "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      "الرَّحْمَٰنِ الرَّحِيمِ",
      "مَالِكِ يَوْمِ الدِّينِ",
      "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
      "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
      "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ",
    ],
  },
  {
    id: 2,
    name: "البقرة",
    englishName: "The Cow",
    revelation: "medinan",
    versesCount: 286,
    ayatCount: 286,
    pages: [2, 3],
    ayahs: [
      "الم",
      "ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ هُدًى لِّلْمُتَّقِينَ",
      "يَا أَيُّهَا النَّاسُ اعْبُدُوا رَبَّكُمُ الَّذِي خَلَقَكُمْ",
    ],
  },
];

describe("quranAyahIndex (audit #4 perf)", () => {
  beforeEach(() => invalidateAyahIndex());

  it("builds a token index on first call", () => {
    const idx = buildAyahIndex(mini);
    expect(idx.total).toBe(mini.reduce((acc, s) => acc + s.ayahs.length, 0));
    expect(idx.tokens.size).toBeGreaterThan(0);
  });

  it("finds single-token matches across surahs", () => {
    invalidateAyahIndex();
    const r = searchAyah(mini, "الرحمن");
    expect(r.totalFound).toBeGreaterThanOrEqual(2);
    expect(r.results.some((h) => h.surahId === 1)).toBe(true);
  });

  it("intersects multiple tokens", () => {
    invalidateAyahIndex();
    const r = searchAyah(mini, "الرحمن الرحيم");
    expect(r.totalFound).toBeGreaterThanOrEqual(1);
    // Original ayah text carries diacritics, so normalise before checking
    // that both tokens are present in the matched text.
    const norm = (s: string) => s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "").replace(/\u0640/g, "");
    expect(r.results.every((h) => norm(h.text).includes("الرحمن") && norm(h.text).includes("الرحيم"))).toBe(true);
  });

  it("respects the limit cap", () => {
    invalidateAyahIndex();
    const big: QuranDB = Array.from({ length: 5 }, (_, sid) => ({
      id: sid + 1, name: `s${sid + 1}`, revelation: "meccan", versesCount: 10, ayatCount: 10, pages: [sid + 1],
      ayahs: Array.from({ length: 10 }, (_, i) => `الرحمن الرحيم آية ${i + 1}`),
    }));
    const r = searchAyah(big, "الرحمن", 3);
    expect(r.results.length).toBe(3);
    expect(r.totalFound).toBe(50);
  });

  it("returns no results for an empty or too-short query", () => {
    invalidateAyahIndex();
    expect(searchAyah(mini, "").totalFound).toBe(0);
    expect(searchAyah(mini, "a").totalFound).toBe(0);
  });

  it("stops Arabic-only single chars via the stopword + minlen rules", () => {
    invalidateAyahIndex();
    // 'في' is a stopword — should be filtered out
    const r = searchAyah(mini, "في");
    expect(r.totalFound).toBe(0);
  });

  it("partial-token fallback for tokens that are substrings of indexed words", () => {
    invalidateAyahIndex();
    // 'كتب' should match 'الْكِتَابُ' via Arabic-root skeleton match
    // (alif/waaw/yaa are dropped from both before substring comparison).
    const r = searchAyah(mini, "كتب");
    expect(r.totalFound).toBeGreaterThan(0);
  });
});