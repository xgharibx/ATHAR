// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parseDirectAyahQuery } from "@/data/quranDirectSearch";

const data = [
  { id: 1, name: "الفاتحة" },
  { id: 2, name: "البقرة" },
  { id: 18, name: "الكهف" },
  { id: 36, name: "يس" },
  { id: 55, name: "الرحمن" },
  { id: 112, name: "الإخلاص" },
];

describe("parseDirectAyahQuery — Arabic numerals + Latin numerals", () => {
  it("matches 2:255 (surah 2 ayah 255)", () => {
    expect(parseDirectAyahQuery("2:255", data)).toEqual({ surahId: 2, ayahIndex: 255 });
  });
  it("matches 2/255 with slash", () => {
    expect(parseDirectAyahQuery("2/255", data)).toEqual({ surahId: 2, ayahIndex: 255 });
  });
  it("matches 2.255 with dot (B6)", () => {
    expect(parseDirectAyahQuery("2.255", data)).toEqual({ surahId: 2, ayahIndex: 255 });
  });
  it("matches Arabic digits ٢:٢٥٥", () => {
    expect(parseDirectAyahQuery("٢:٢٥٥", data)).toEqual({ surahId: 2, ayahIndex: 255 });
  });
  it("matches Arabic-Indic dot form ٢.٢٥٥ (B6)", () => {
    expect(parseDirectAyahQuery("٢.٢٥٥", data)).toEqual({ surahId: 2, ayahIndex: 255 });
  });
  it("matches البقرة:255 with Arabic name + Latin digits", () => {
    expect(parseDirectAyahQuery("البقرة:255", data)).toEqual({ surahId: 2, ayahIndex: 255 });
  });
  it("matches البقرة:٢٥٥", () => {
    expect(parseDirectAyahQuery("البقرة:٢٥٥", data)).toEqual({ surahId: 2, ayahIndex: 255 });
  });
  it("matches البقرة 255 with space (B6) — Latin digits", () => {
    expect(parseDirectAyahQuery("البقرة 255", data)).toEqual({ surahId: 2, ayahIndex: 255 });
  });
  it("matches البقرة ٢٥٥ with space + Arabic-Indic digits (B6)", () => {
    expect(parseDirectAyahQuery("البقرة ٢٥٥", data)).toEqual({ surahId: 2, ayahIndex: 255 });
  });
  it("matches triple form البقرة:٢٥٥:٣ → surah 2 / ayah 255 (word dropped)", () => {
    expect(parseDirectAyahQuery("البقرة:٢٥٥:٣", data)).toEqual({ surahId: 2, ayahIndex: 255 });
  });
  it("matches triple form 2:255:3 (mixed for word mode)", () => {
    expect(parseDirectAyahQuery("2:255:3", data)).toEqual({ surahId: 2, ayahIndex: 255 });
  });
  it("matches الكهف ١٨ (with space)", () => {
    expect(parseDirectAyahQuery("الكهف ١٨", data)).toEqual({ surahId: 18, ayahIndex: 18 });
  });
  it("matches الإخلاص with fuzzy prefix", () => {
    expect(parseDirectAyahQuery("الإخلاص", data)).toEqual({ surahId: 112, ayahIndex: null });
  });
  it("matches just surah number 55", () => {
    expect(parseDirectAyahQuery("55", data)).toEqual({ surahId: 55, ayahIndex: null });
  });
  it("returns null for free-text queries", () => {
    expect(parseDirectAyahQuery("رحمة", data)).toBeNull();
    expect(parseDirectAyahQuery("ما فضل", data)).toBeNull();
  });
  it("returns null for out-of-range numbers", () => {
    expect(parseDirectAyahQuery("200:1", data)).toBeNull();
    expect(parseDirectAyahQuery("0:1", data)).toBeNull();
  });
});
