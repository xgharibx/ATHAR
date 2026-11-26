import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { distance, opcodes } from "@/quran2/tajweed/levenshtein";
import { listen, recited, type AyahPieces, type Unit } from "@/quran2/tajweed/imam";
import { alignPiece } from "@/quran2/tajweed/analyse";

/**
 * Vectors from the Python reference (HisnLabs Tajweed v2's imam.py with
 * quran-transcript's phonetizer, python-Levenshtein): real recitations from
 * everyayah (two reciters) heard by the int8 model, and the same scripts with
 * mistakes put in by hand. tools/quran2/tajweed-vectors.py writes them.
 */
type Vector = {
  s: number;
  a: number;
  reciter: string;
  heard: string;
  probs: number[] | null;
  times: number[] | null;
  ref: {
    words: string[];
    phonemes: string;
    spans: Array<[number, number]>;
    index: number[];
    stops: number[];
    restarts: number[];
    ends: number[];
    units: Array<[number, number, string, number, number, number[], string, string]>;
  };
  listen: Array<{ word: string; index: number; stop: boolean; ok: boolean; notes: Array<{ rule: string; severity: string; pos: number | null; msg: string }>; madd: Array<[string, number]> }>;
};

const fixture = JSON.parse(readFileSync(new URL("./fixtures/quran2-tajweed/vectors.json", import.meta.url), "utf8")) as {
  pieces: Record<string, AyahPieces>;
  vectors: Vector[];
};

const unitRow = (u: Unit) => [u.s, u.e, u.kind, u.word, u.golden, [...u.allowed].sort((x, y) => x - y), u.rule, u.char];

describe("التسميع: the tajweed engine against its Python reference", () => {
  it("aligns as python-Levenshtein does", () => {
    expect(distance("كِتَاب", "كتاب")).toBe(2);
    expect(opcodes("ابتث", "اتث")).toEqual([["equal", 0, 1, 0, 1], ["delete", 1, 2, 1, 1], ["equal", 2, 4, 1, 3]]);
    // Ties: the common ends are set aside, then the path is traced back from the end.
    expect(opcodes("َڇۥُںڇنۦۦۦ", "َڇۥُامڇۦۦ")).toEqual([
      ["equal", 0, 4, 0, 4],
      ["insert", 4, 4, 4, 5],
      ["replace", 4, 5, 5, 6],
      ["equal", 5, 6, 6, 7],
      ["delete", 6, 8, 7, 7],
      ["equal", 8, 10, 7, 9],
    ]);
  });

  it(`finds where the reciter stopped and started again, as the reference does (${fixture.vectors.length} recitations)`, () => {
    for (const v of fixture.vectors) {
      const ayah = fixture.pieces[`${v.s}:${v.a}`]!;
      const ref = recited(ayah, v.heard);
      const where = `${v.s}:${v.a} ${v.reciter}`;
      expect(ref.phonemes, where).toBe(v.ref.phonemes);
      expect(ref.restarts, where).toEqual(v.ref.restarts);
      expect(ref.ends, where).toEqual(v.ref.ends);
      expect(ref.stops, where).toEqual(v.ref.stops);
      expect(ref.index, where).toEqual(v.ref.index);
      expect(ref.spans, where).toEqual(v.ref.spans);
      expect(ref.units.map(unitRow), where).toEqual(v.ref.units);
    }
  });

  it("gives the same remarks on every word", () => {
    let words = 0;
    for (const v of fixture.vectors) {
      const ayah = fixture.pieces[`${v.s}:${v.a}`]!;
      const ref = recited(ayah, v.heard);
      const got = listen(ref, v.heard, v.probs ? { probs: v.probs, minProb: 0.3, minProbJali: 0.7, times: v.times, tempo: [] } : {});
      const where = `${v.s}:${v.a} ${v.reciter}`;
      expect(got.length, where).toBe(v.listen.length);
      got.forEach((w, k) => {
        const want = v.listen[k]!;
        expect(
          { word: w.word, index: w.index, stop: w.stop, ok: w.ok, notes: w.notes.map((n) => ({ rule: n.rule, severity: n.severity, pos: n.pos, msg: n.msg })), madd: w.madd.map((m) => [m.rule, m.heard]) },
          `${where} word ${k}`,
        ).toEqual(want);
        words++;
      });
    }
    expect(words).toBeGreaterThan(1500);
  });
});

describe("التسميع: a whole recitation laid over its ayahs", () => {
  // Al-Ikhlas in the phonetic script, ayah by ayah.
  const A = "قُلهُوَللَااهُءَحَد", B = "للَااهُصصَمَد", C = "لَملَلِدڇوَلَميُۥۥلَدڇ", D = "وَلَميَكُللَهُۥۥكُفُوَنءَحَد";
const starts = [0, A.length, A.length + B.length, A.length + B.length + C.length];
  it("skips a whole ayah", () => {
  const exp = A + B + C + D;
  const r = alignPiece(exp, 0, A + B + D, starts);
  expect(r.b[(A + B + C).length]).toBe((A + B).length);
  expect(r.b[(A + B).length]).toBe((A + B).length);
  expect(r.to).toBe(exp.length);
});
  it("all said", () => {
  const exp = A + B + C + D;
  const r = alignPiece(exp, 0, exp, starts);
  expect(r.b).toEqual(Array.from({ length: exp.length + 1 }, (_, i) => i));
});
  it("stopped early", () => {
  const exp = A + B + C + D;
  const r = alignPiece(exp, 0, A + B, starts);
  expect(r.to).toBe((A + B).length);
});
  it("a mistake inside", () => {
  const exp = A + B + C + D;
  const h = A + B.replace("صص", "س") + C + D;
  const r = alignPiece(exp, 0, h, starts);
  expect(r.to).toBe(exp.length);
  expect(r.b[(A + B).length]).toBe((A + B).length - 1);
});
});
