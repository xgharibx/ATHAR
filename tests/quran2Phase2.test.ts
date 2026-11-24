import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTanzil } from "@/quran2/data/text";
import { buildSimilarIndex, similarTo } from "@/quran2/data/similar";
import { createReciteTracker, gradeFor } from "@/quran2/hifz/recite";
import { exportQuran2, adoptQuran2 } from "@/quran2/store";
import { useQ2Store } from "@/quran2/store";
import { tafsirParagraphs } from "@/quran2/data/tafsir";
import { buildDrill } from "@/quran2/hifz/similarDrill";
import { plainKey } from "@/quran2/data/arabic";

const text = parseTanzil(readFileSync("public/data/quran2/tanzil-uthmani.txt", "utf8"));
const words = (s: number, a: number) => text.surahs[s - 1]!.ayahs[a - 1]!.words.map((w) => w.text);

describe("Similar ayahs (computed from the text)", () => {
  const index = buildSimilarIndex(text);

  it("finds ayahs that are word for word the same", () => {
    const m = similarTo(index, 2, 5);
    expect(m[0]).toMatchObject({ s: 31, a: 5, identical: true });
    const shuara = similarTo(index, 26, 109).filter((x) => x.identical).map((x) => `${x.s}:${x.a}`);
    expect(shuara).toEqual(expect.arrayContaining(["26:127", "26:145", "26:164", "26:180"]));
  });

  it("finds ayahs that share a run of words and part ways after it", () => {
    const m = similarTo(index, 2, 255);
    expect(m.some((x) => x.s === 20 && x.a === 110 && x.length >= 7)).toBe(true);
    expect(m.every((x) => x.length >= 3)).toBe(true);
    expect(similarTo(index, 1, 1).some((x) => x.s === 27 && x.a === 30)).toBe(true); // the basmala in an-Naml
  });

  it("never lists an ayah as similar to itself", () => {
    for (const [s, a] of [[2, 5], [55, 13], [77, 15]] as const) {
      expect(similarTo(index, s, a).some((x) => x.s === s && x.a === a)).toBe(false);
    }
  });
});

describe("Following a recitation", () => {
  const fatiha2 = words(1, 2); // ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ

  it("follows everyday spelling through a growing transcript", () => {
    const t = createReciteTracker(fatiha2);
    t.hear("1:0", "الحمد", false);
    expect(t.position).toBe(0); // the last word of an unfinished segment waits
    t.hear("1:0", "الحمد لله رب", false);
    expect(t.position).toBe(2);
    t.hear("1:0", "الحمد لله رب العالمين", true);
    expect(t.summary()).toMatchObject({ said: 4, missed: 0, done: true, grade: 4 });
  });

  it("marks skipped words as missed and ignores noise", () => {
    const t = createReciteTracker(fatiha2);
    t.hear("s", "الحمد اه العالمين", true);
    expect(t.marks).toEqual(["ok", "missed", "missed", "ok"]);
    expect(t.summary().grade).toBe(1);
  });

  it("accepts a word Tanzil writes as two, said as two", () => {
    const ayah = words(8, 6); // … بَعْدَ مَا تَبَيَّنَ …
    const t = createReciteTracker(ayah);
    t.hear("s", "يجادلونك في الحق بعد ما تبين", true);
    expect(t.position).toBe(5);
    expect(t.marks.slice(0, 5)).toEqual(["ok", "ok", "ok", "ok", "ok"]);
  });

  it("suggests a grade from the share said", () => {
    expect(gradeFor(1)).toBe(4);
    expect(gradeFor(0.9)).toBe(3);
    expect(gradeFor(0.7)).toBe(2);
    expect(gradeFor(0.3)).toBe(1);
  });
});

describe("Backup of the section's progress", () => {
  it("exports and adopts the memorisation, validated", () => {
    const now = Date.now();
    useQ2Store.setState({ hifz: { 604: { s: 5, d: 5, last: now, due: now + 5e8, reps: 2, lapses: 0, learnedAt: now } }, lastRead: { s: 18, a: 10, at: now } });
    const blob = exportQuran2();
    useQ2Store.setState({ hifz: {}, lastRead: null });
    expect(adoptQuran2(blob)).toBe(true);
    expect(useQ2Store.getState().hifz[604]?.reps).toBe(2);
    expect(useQ2Store.getState().lastRead?.s).toBe(18);
    expect(adoptQuran2({ hifz: { 9999: {}, 3: { s: "x" } } })).toBe(false);
    expect(adoptQuran2(null)).toBe(false);
  });
});

describe("Translation text", () => {
  it("keeps the meaning and drops footnote numbers", () => {
    expect(tafsirParagraphs("Lord<sup foot_note=195933>1</sup> of the worlds -")).toEqual(["Lord of the worlds -"]);
  });
});

describe("Similar-ayah drills", () => {
  const index = buildSimilarIndex(text);
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  it("asks only questions whose answer is the ayah's own continuation", () => {
    const ayahs = text.surahs.flatMap((s) => s.ayahs.map((a) => ({ s: a.s, a: a.a })));
    const qs = buildDrill({ text, index, ayahs, count: 25, random });
    expect(qs.length).toBe(25);
    for (const q of qs) {
      const ayah = text.surahs[q.s - 1]!.ayahs[q.a - 1]!.words.map((w) => w.text).join(" ");
      expect(ayah).toContain(`${q.lead} ${q.options[q.answer]}`);
      expect(new Set(q.options.map(plainKey)).size).toBe(q.options.length);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
    }
  });
});
