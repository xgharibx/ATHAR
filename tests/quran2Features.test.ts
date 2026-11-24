import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTanzil } from "@/quran2/data/text";
import type { Q2Meta } from "@/quran2/data/meta";
import { intervalDays, preview, recall, retrievability, review } from "@/quran2/hifz/fsrs";
import { buildPlan, memoryMap, newPagesToday, nextNewPages, type HifzRecord } from "@/quran2/hifz/plan";
import { buildSearchIndex, findWord, perSurah, searchText } from "@/quran2/data/search";
import { computeStats, countLetters } from "@/quran2/data/stats";
import { pageAyahs, pageLabel } from "@/quran2/data/pages";

const text = parseTanzil(readFileSync("public/data/quran2/tanzil-uthmani.txt", "utf8"));
const meta = JSON.parse(readFileSync("public/data/quran2/tanzil-meta.json", "utf8")) as Q2Meta;
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 1, 8);

describe("FSRS memory model", () => {
  it("defines stability as the time until recall falls to 90 %", () => {
    expect(recall(10, 0)).toBe(1);
    expect(recall(10, 10)).toBeCloseTo(0.9, 5);
    expect(recall(10, 30)).toBeLessThan(0.9);
    expect(intervalDays(10)).toBe(10);
  });

  it("starts a page by its first grade, and grows the gap after each good revision", () => {
    const first = review(null, 3, T0);
    expect(first.reps).toBe(1);
    expect(first.due).toBeGreaterThan(T0);
    const second = review(first, 3, first.due);
    const third = review(second, 3, second.due);
    expect(second.s).toBeGreaterThan(first.s);
    expect(third.s).toBeGreaterThan(second.s);
    expect(third.due - third.last).toBeGreaterThan(second.due - second.last);
  });

  it("brings a forgotten page back the next day and counts the lapse", () => {
    const card = review(review(null, 3, T0), 3, T0 + 3 * DAY);
    const lapsed = review(card, 1, card.due);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.due - lapsed.last).toBe(DAY);
    expect(lapsed.s).toBeLessThan(card.s);
  });

  it("orders the grades: forgetting < hard < good < easy", () => {
    const card = review(null, 3, T0);
    const p = preview(card, card.due);
    expect(p[1]).toBeLessThanOrEqual(p[2]);
    expect(p[2]).toBeLessThanOrEqual(p[3]);
    expect(p[3]).toBeLessThan(p[4]);
    expect(retrievability(card, card.due)).toBeCloseTo(0.9, 1);
  });
});

describe("The daily hifz plan", () => {
  const rec = (learnedAt: number, due: number, s = 5): HifzRecord => ({ s, d: 5, last: learnedAt, due, reps: 1, lapses: 0, learnedAt });

  it("takes new pages from the end of the mushaf or its start", () => {
    expect(nextNewPages({}, "end", 2)).toEqual([604, 603]);
    expect(nextNewPages({ 604: {} }, "end", 1)).toEqual([603]);
    expect(nextNewPages({ 1: {} }, "start", 2)).toEqual([2, 3]);
  });

  it("gives half a page a day as a page every other day", () => {
    expect(newPagesToday(1, 0, false)).toBe(1);
    expect(newPagesToday(2, 1, false)).toBe(1);
    expect(newPagesToday(0.5, 0, true)).toBe(0);
    expect(newPagesToday(0.5, 0, false)).toBe(1);
  });

  it("revises the latest pages every day and the older ones when due, weakest first", () => {
    const now = T0 + 40 * DAY;
    const hifz: Record<number, HifzRecord> = {
      604: rec(T0, now - DAY, 3), // old, due, weaker
      603: rec(T0 + DAY, now - DAY, 20), // old, due, stronger
      602: rec(T0 + 2 * DAY, now + 9 * DAY), // old, not due
      601: rec(now - 2 * DAY, now + DAY), // recent: near review
    };
    const plan = buildPlan({ hifz, now, newCount: 1, direction: "end", nearCount: 1, learnedToday: [] });
    expect(plan.near).toEqual([601]);
    expect(plan.far).toEqual([604, 603]);
    expect(plan.newPages).toEqual([600]);
    const map = memoryMap(hifz, now);
    expect(map).toHaveLength(604);
    expect(map[0]).toBeNull();
    expect(map[603]).toBeGreaterThan(0);
  });
});

describe("Search", () => {
  const index = buildSearchIndex(text);

  it("finds Uthmani words typed in everyday spelling", () => {
    expect(findWord(index, "الصلاة").length).toBeGreaterThan(50);
    expect(findWord(index, "العالمين").length).toBeGreaterThan(50);
    const rahman = findWord(index, "الرحمن");
    expect(rahman.some((r) => r.s === 1 && r.a === 1 && r.w === 3)).toBe(true);
  });

  it("puts ayahs where the words come side by side first", () => {
    const hits = searchText(index, "رب العالمين");
    expect(hits.length).toBeGreaterThan(30);
    expect(hits[0]!.phrase).toBe(true);
    expect(hits.some((h) => h.s === 1 && h.a === 2)).toBe(true);
    expect(perSurah(hits).length).toBe(114);
  });
});

describe("The Quran in numbers", () => {
  const stats = computeStats(text, meta);

  it("counts surahs, ayahs and words, with the Corpus word division", () => {
    expect(stats.surahs).toBe(114);
    expect(stats.ayahs).toBe(6236);
    expect(stats.words).toBe(77429);
    expect(stats.meccan.surahs + stats.medinan.surahs).toBe(114);
    expect(stats.meccan.surahs).toBe(86);
  });

  it("finds the longest ayah (the debt ayah) and the longest and shortest surahs", () => {
    expect([stats.longestAyah.s, stats.longestAyah.a]).toEqual([2, 282]);
    expect(stats.longestSurah.s).toBe(2);
    expect(stats.shortestSurah.s).toBe(108);
    expect(stats.oneWordAyahs.some(({ s, a }) => s === 55 && a === 64)).toBe(true); // مُدْهَآمَّتَانِ
  });

  it("counts only the letters written, not the marks", () => {
    expect(countLetters("بِسْمِ")).toBe(3);
    expect(countLetters("ٱلرَّحْمَـٰنِ")).toBe(6);
    expect(stats.letters).toBeGreaterThan(300_000);
    expect(stats.letterFrequency[0]![0]).toBe("ا");
  });
});

describe("Pages", () => {
  it("knows what each page holds", () => {
    expect(pageAyahs(text, meta, 1).map((x) => x.ayah.a)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(pageLabel(text, meta, 2)).toBe("البقرة ١–٥");
    const last = pageAyahs(text, meta, 604);
    expect(last[0]!.ayah.s).toBe(112);
    expect(last[last.length - 1]!.ayah.s).toBe(114);
  });
});
