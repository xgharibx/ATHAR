import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { distance, opcodes } from "@/quran2/tajweed/levenshtein";
import { expected, listen, recited, soundGroups, type AyahPieces, type Tafkheem, type Unit } from "@/quran2/tajweed/imam";
import { alignPiece } from "@/quran2/tajweed/analyse";
import { followStep, planFollow, wordAt } from "@/quran2/tajweed/follow";

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

describe("التسميع: the engine following the words live", () => {
  // Al-Ikhlas in the phonetic script, ayah by ayah.
  const A = "قُلهُوَللَااهُءَحَد", B = "للَااهُصصَمَد", C = "لَملَلِدڇوَلَميُۥۥلَدڇ", D = "وَلَميَكُللَهُۥۥكُفُوَنءَحَد";
  const all = A + B + C + D;

  it("finds the last seconds heard where they are", () => {
    // From the middle of the second ayah to the middle of the third.
    const heard = all.slice(A.length + 4, A.length + B.length + 9);
    const r = followStep(all, A.length, heard)!;
    expect(r.to).toBe(A.length + B.length + 9);
    expect(r.cost).toBe(0);
  });

  it("is not thrown by a few sounds heard wrongly", () => {
    const heard = (A + B).replace("صص", "س").slice(6);
    const r = followStep(all, 4, heard)!;
    expect(r.to).toBe((A + B).length);
    expect(r.cost).toBeLessThan(0.2);
  });

  it("keeps up when an ayah is left out", () => {
    const heard = B.slice(3) + D.slice(0, 14);
    const r = followStep(all, A.length + 3, heard)!;
    expect(r.to).toBe(A.length + B.length + C.length + 14);
  });

  it("says nothing of a breath, or of what is not in the passage", () => {
    expect(followStep(all, 0, "قُل")).toBeNull();
    expect(followStep(all, 0, "بِسمِللَااهِررَحمَاانِررَحِۦۦم")).toBeNull();
  });

  it("knows the word a place in the script falls in", () => {
    const words = [
      { key: "112:1:1", start: 0, end: 3 },
      { key: "112:1:2", start: 3, end: 7 },
      { key: "112:1:3", start: 7, end: 12 },
    ];
    expect(wordAt(words, 0)).toBe(0);
    expect(wordAt(words, 3)).toBe(0);
    expect(wordAt(words, 4)).toBe(1);
    expect(wordAt(words, 12)).toBe(2);
  });

  it("lays the passage's words over its script", () => {
    const ayah = fixture.pieces["112:1"]!;
    const plan = planFollow([{ s: 112, a: 1, pieces: ayah }]);
    expect(plan.words.map((w) => w.key)).toEqual(ayah.t.map((_, k) => `112:1:${k + 1}`));
    expect(plan.words[0]!.start).toBe(0);
    expect(plan.words.at(-1)!.end).toBe(plan.all.length);
  });
});

describe("التسميع: the stretch heard", () => {
  const A = "قُلهُوَللَااهُءَحَد", B = "للَااهُصصَمَد", C = "لَملَلِدڇوَلَميُۥۥلَدڇ", D = "وَلَميَكُللَهُۥۥكُفُوَنءَحَد";
  const all = A + B + C + D;
  it("begins where what was heard begins", () => {
    // Across a forgotten ayah the stretch may begin later (inside it), never before what was heard.
    const heard = B.slice(3) + D.slice(0, 14);
    const r = followStep(all, A.length + 3, heard)!;
    expect(r.from).toBeGreaterThanOrEqual(A.length + 3);
    expect(r.from).toBeLessThanOrEqual(A.length + B.length + C.length);
    const r2 = followStep(all, A.length, all.slice(A.length + 4, A.length + B.length + 9))!;
    expect(r2.from).toBe(A.length + 4);
  });
});

describe("التسميع: tafkhim and tarqiq (the ر, the lam of the Name, the alif after them)", () => {
  type TafkheemVector = { s: number; a: number; from: number; to: number; want: Array<[number, string]>; heard: Array<[string, Tafkheem]>; notes: Array<[number, number, string, string, string]> };
  const vectors = JSON.parse(readFileSync(new URL("./fixtures/quran2-tajweed/tafkheem.json", import.meta.url), "utf8")) as TafkheemVector[];
  const surahs = new Map<number, AyahPieces[]>();
  const piecesOf = (s: number, a: number) => {
    if (!surahs.has(s)) {
      const file = new URL(`../public/data/quran2/tajweed/${String(s).padStart(3, "0")}.json.gz`, import.meta.url);
      surahs.set(s, JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")) as AyahPieces[]);
    }
    return surahs.get(s)![a - 1]!;
  };
  const CODE: Record<string, string> = { mofakham: "m", moraqaq: "r", low_mofakham: "l" };

  it(`gives each group the tafkhim the phonetizer gives it (${vectors.length} stretches)`, () => {
    for (const v of vectors) {
      const ref = expected(piecesOf(v.s, v.a), v.from, v.to);
      expect(ref.tafkheem.map(([pos, t]) => [pos, CODE[t]]), `${v.s}:${v.a} [${v.from}, ${v.to})`).toEqual(v.want);
    }
  });

  it("cuts the script in sound groups as the phonetizer does", () => {
    expect(soundGroups("قُلهُوَللَااهُءَحَد").map(([, g]) => g)).toEqual(["قُ", "ل", "هُ", "وَ", "للَ", "اا", "هُ", "ءَ", "حَ", "د"]);
    for (const v of vectors) {
      const ref = expected(piecesOf(v.s, v.a), v.from, v.to);
      expect(soundGroups(ref.phonemes).map(([, g]) => g)).toEqual(v.heard.map(([g]) => g));
    }
  });

  it("says where a ر, a lam or an alif was heard heavy for light, or light for heavy, as the reference does", () => {
    let remarks = 0;
    for (const v of vectors) {
      const ref = expected(piecesOf(v.s, v.a), v.from, v.to);
      const got = listen(ref, ref.phonemes, { sifat: v.heard })
        .flatMap((w, k) => w.notes.filter((n) => n.rule === "tafkheem_or_taqeeq").map((n) => [k, n.pos, n.expected, n.heard, n.msg]));
      expect(got, `${v.s}:${v.a} [${v.from}, ${v.to})`).toEqual(v.notes);
      remarks += got.length;
    }
    expect(remarks).toBeGreaterThan(500);
  });
});
