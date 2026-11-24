import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JOINED, ayahText, parseTanzil } from "@/quran2/data/text";
import { juzOf, pageOf, pageRange, refFromIndex, ayahIndex, sajdaAt, surahPages, type Q2Meta } from "@/quran2/data/meta";
import { matchesWord, plainKey } from "@/quran2/data/arabic";
import { parseMorphology } from "@/quran2/data/morphology";
import { describeSegment } from "@/quran2/data/grammar";
import { locate, parseTimings, wordSpan } from "@/quran2/data/timings";
import { tafsirParagraphs } from "@/quran2/data/tafsir";

const raw = readFileSync("public/data/quran2/tanzil-uthmani.txt", "utf8");
const meta = JSON.parse(readFileSync("public/data/quran2/tanzil-meta.json", "utf8")) as Q2Meta;
const corpus = JSON.parse(readFileSync("tests/fixtures/quran2-corpus-word-counts.json", "utf8")) as { counts: Record<string, number[]> };
const text = parseTanzil(raw);

describe("Quran V2 text (Tanzil Uthmani 1.1)", () => {
  it("is the verified Tanzil file, with its copyright notice", () => {
    expect(raw).toContain("Tanzil Quran Text (Uthmani, Version 1.1)");
    expect(raw).toContain("CHANGING IT IS NOT ALLOWED");
    expect(text.notice).toContain("Tanzil Project");
  });

  it("has 114 surahs and 6236 ayahs, as many as the metadata says", () => {
    expect(text.surahs).toHaveLength(114);
    text.surahs.forEach((s, i) => expect(s.ayahs.length).toBe(meta.surahs[i]!.ayahs));
  });

  it("gives every surah but al-Fatiha and at-Tawba its basmala as a heading", () => {
    const withBasmala = text.surahs.filter((s) => s.basmala).map((s) => s.id);
    expect(withBasmala).toHaveLength(112);
    expect(withBasmala).not.toContain(1);
    expect(withBasmala).not.toContain(9);
    expect(text.surahs[0]!.ayahs[0]!.words).toHaveLength(4);
  });

  it("changes no letter: every line is rebuilt exactly from its words", () => {
    const lines = raw.split("\n").filter((l) => /^\d+\|\d+\|/.test(l));
    for (const line of lines) {
      const [s, a, original] = line.split("|") as [string, string, string];
      const surah = text.surahs[Number(s) - 1]!;
      const ayah = surah.ayahs[Number(a) - 1]!;
      const rebuilt = (Number(a) === 1 && surah.basmala ? `${surah.basmala} ` : "") + ayahText(ayah);
      expect(rebuilt).toBe(original.replace(/^﻿/, ""));
    }
  });

  it("numbers the words of every ayah as the Quranic Arabic Corpus does", () => {
    const mismatches: string[] = [];
    text.surahs.forEach((s) =>
      s.ayahs.forEach((ayah) => {
        if (ayah.words.length !== corpus.counts[String(s.id)]![ayah.a - 1]) mismatches.push(`${s.id}:${ayah.a}`);
      }),
    );
    expect(mismatches).toEqual([]);
  });

  it("keeps the four words Tanzil writes as two as one word", () => {
    expect(Object.keys(JOINED)).toHaveLength(4);
    expect(text.surahs[1]!.ayahs[180]!.words[2]!.text).toBe("بَعْدَ مَا");
    expect(text.surahs[36]!.ayahs[129]!.words[2]!.text).toBe("إِلْ يَاسِينَ");
  });

  it("keeps pause marks and the sajdah sign with the word before them", () => {
    const ayah = text.surahs[1]!.ayahs[1]!; // ذَٰلِكَ ٱلْكِتَـٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ
    expect(ayah.words.map((w) => w.after ?? "")).toEqual(["", "", "", "ۛ", "ۛ", "", ""]);
    const sajda = text.surahs[6]!.ayahs[205]!; // 7:206
    expect(sajda.words[sajda.words.length - 1]!.after).toContain("۩");
  });
});

describe("Quran V2 metadata (Tanzil 1.0)", () => {
  it("places ayahs on the 604 pages, 30 juz and 15 sajdas", () => {
    expect(pageOf(meta, 1, 1)).toBe(1);
    expect(pageOf(meta, 2, 1)).toBe(2);
    expect(pageOf(meta, 2, 6)).toBe(3);
    expect(pageOf(meta, 114, 6)).toBe(604);
    expect(juzOf(meta, 2, 141)).toBe(1);
    expect(juzOf(meta, 2, 142)).toBe(2);
    expect(juzOf(meta, 114, 1)).toBe(30);
    expect(pageRange(meta, 604)[1]).toBe(6235);
    expect(sajdaAt(meta, 96, 19)).toBe("obligatory");
    expect(sajdaAt(meta, 7, 206)).toBe("recommended");
    expect(surahPages(meta, 2)).toEqual([2, 49]);
  });

  it("converts between an ayah and its place in the mushaf", () => {
    for (const [s, a] of [[1, 1], [2, 255], [18, 110], [114, 6]] as const) {
      expect(refFromIndex(meta, ayahIndex(meta, s, a))).toEqual([s, a]);
    }
    expect(meta.surahs[95]!.order).toBe(1); // al-'Alaq was revealed first
  });
});

describe("Quran V2 Arabic matching", () => {
  it("finds Uthmani words by their everyday spelling", () => {
    expect(matchesWord("ٱلْعَـٰلَمِينَ", "العالمين")).toBe(true);
    expect(matchesWord("ذَٰلِكَ", "ذلك")).toBe(true);
    expect(matchesWord("ٱلصَّلَوٰةَ", "الصلاة")).toBe(true);
    expect(matchesWord("ٱلرَّحْمَـٰنِ", "الرحمن")).toBe(true);
    expect(matchesWord("ٱلْكِتَـٰبُ", "الكتاب")).toBe(true);
    expect(matchesWord("ٱلْكِتَـٰبُ", "الكاتب")).toBe(true); // same skeleton: a loose match, by design
    expect(matchesWord("رَيْبَ", "ربي")).toBe(false);
    expect(plainKey("إِيَّاكَ")).toBe("اياك");
  });
});

describe("Quran V2 morphology", () => {
  const sample = [
    "1:1:1:1\tبِ\tP\tP|PREF|LEM:ب",
    "1:1:1:2\tسْمِ\tN\tROOT:سمو|LEM:اسْم|M|GEN",
    "1:1:2:1\tٱللَّهِ\tN\tPN|ROOT:أله|LEM:اللَّه|GEN",
    "1:1:3:1\tٱل\tP\tDET|PREF|LEM:ال",
    "1:1:3:2\tرَّحْمَٰنِ\tN\tROOT:رحم|LEM:رَحْمٰن|MS|GEN|ADJ",
    "1:1:4:1\tٱل\tP\tDET|PREF|LEM:ال",
    "1:1:4:2\tرَّحِيمِ\tN\tROOT:رحم|LEM:رَحِيم|MS|GEN|ADJ",
  ].join("\n");
  const m = parseMorphology(sample);

  it("gives each word its segments, root and lemma", () => {
    expect(m.wordCount).toBe(4);
    expect(m.segments.get("1:1:1")).toHaveLength(2);
    expect(m.rootOf.get("1:1:3")).toBe("رحم");
    expect(m.lemmaOf.get("1:1:3")).toBe("رَحْمٰن");
    expect(m.lemmaOf.get("1:1:1")).toBe("اسْم"); // the stem's lemma, not the prefix's
    expect(m.roots.get("رحم")).toEqual(["1:1:3", "1:1:4"]);
    expect(m.lemmaRoot.get("رَحِيم")).toBe("رحم");
  });

  it("names the grammar in Arabic terms", () => {
    expect(describeSegment("N", ["PN", "GEN"])).toEqual({ role: "الكلمة", kind: "اسم علم", details: ["مجرور"] });
    expect(describeSegment("P", ["P", "PREF"]).kind).toBe("حرف جر");
    expect(describeSegment("P", ["P", "PREF"]).role).toBe("سابقة");
    const verb = describeSegment("V", ["IMPF", "VF:4", "3MP", "MOOD:IND"]);
    expect(verb.kind).toBe("فعل مضارع");
    expect(verb.details).toEqual(["مزيد على وزن أَفْعَلَ", "مرفوع", "غائب جمع مذكر"]);
    expect(describeSegment("N", ["ACC", "INDEF", "MS"]).details).toEqual(["منصوب", "نكرة", "مفرد مذكر"]);
  });
});

describe("Quran V2 word timings", () => {
  const timing = parseTimings({
    audio_url: "https://example.test/1.mp3",
    duration: 20000,
    verse_timings: [
      { verse_key: "1:1", timestamp_from: 0, timestamp_to: 6090, segments: [[1, 0, 580], [2, 580, 1409], [3, 1409, 2502], [4, 2502, 5840]] },
      { verse_key: "1:2", timestamp_from: 6090, timestamp_to: 11680, segments: [[1, 6025, 7025], [2], [2, 7025, 7885]] },
    ],
  });

  it("keeps only complete segments", () => {
    expect(timing.verses[1]!.words).toEqual([[1, 6025, 7025], [2, 7025, 7885]]);
  });

  it("finds the ayah and word being recited", () => {
    expect(locate(timing, 100)).toEqual({ a: 1, w: 1 });
    expect(locate(timing, 3000)).toEqual({ a: 1, w: 4 });
    expect(locate(timing, 7100)).toEqual({ a: 2, w: 2 });
    expect(locate(timing, 30000)).toBeNull();
    expect(wordSpan(timing, 1, 2)).toEqual([580, 1409]);
    expect(wordSpan(timing, 2, 9)).toBeNull();
  });
});

describe("Quran V2 tafsir text", () => {
  it("turns the API's HTML into paragraphs", () => {
    expect(tafsirParagraphs("<p>أولًا&nbsp;هنا</p><p>ثانيًا<br/>ثالثًا</p>")).toEqual(["أولًا هنا", "ثانيًا", "ثالثًا"]);
  });
});
