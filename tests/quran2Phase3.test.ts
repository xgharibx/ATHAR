import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { parseTanzil } from "@/quran2/data/text";
import type { Q2Meta } from "@/quran2/data/meta";
import { ayahIndex, pageRange, refFromIndex } from "@/quran2/data/meta";
import { layPage, parseLines } from "@/quran2/data/lines";
import { parseWordMeanings } from "@/quran2/data/wordMeanings";
import { buildSearchIndex, findWord } from "@/quran2/data/search";
import { matchesWord } from "@/quran2/data/arabic";
import { findRecited } from "@/quran2/data/voiceFind";
import { addBits, countBits, decodeBits, emptyBits, firstUnread, juzShares, khatmaPace, pageShares, readingStreak, TOTAL_AYAHS } from "@/quran2/reading/khatma";
import { needMs } from "@/quran2/reading/useReadingTracker";
import { adoptQuran2, exportQuran2, useQ2Store } from "@/quran2/store";

const text = parseTanzil(readFileSync("public/data/quran2/tanzil-uthmani.txt", "utf8"));
const meta = JSON.parse(readFileSync("public/data/quran2/tanzil-meta.json", "utf8")) as Q2Meta;
const index = buildSearchIndex(text);

describe("The khatma, one bit per ayah", () => {
  it("adds ayahs once and counts them", () => {
    let b = emptyBits();
    const first = addBits(b, [0, 1, 2, 2, -1, 6236, 6235]);
    expect(first).toMatchObject({ added: 4, total: 4 });
    b = first.bits;
    expect(addBits(b, [1, 2]).added).toBe(0);
    expect(countBits(decodeBits(b))).toBe(4);
    expect(decodeBits("not base64 !!")).toHaveLength(Math.ceil(TOTAL_AYAHS / 8));
  });

  it("works out pages, juz and where to go on", () => {
    const [first, last] = pageRange(meta, 1); // al-Fatiha
    const b = addBits(emptyBits(), Array.from({ length: last - first + 1 }, (_, i) => first + i)).bits;
    const bits = decodeBits(b);
    const pages = pageShares(meta, bits);
    expect(pages).toHaveLength(604);
    expect(pages[0]).toBe(1);
    expect(pages[1]).toBe(0);
    expect(juzShares(meta, bits)[0]).toBeGreaterThan(0);
    expect(firstUnread(meta, bits)).toEqual([2, 1]);
    const all = decodeBits(addBits(emptyBits(), Array.from({ length: TOTAL_AYAHS }, (_, i) => i)).bits);
    expect(firstUnread(meta, all)).toBeNull();
    expect(pageShares(meta, all).every((x) => x === 1)).toBe(true);
  });

  it("counts reading streaks and the pace to a goal", () => {
    const d = (offset: number) => {
      const x = new Date(2026, 10, 25 + offset);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    };
    const today = new Date(2026, 10, 25, 12);
    expect(readingStreak({ [d(0)]: 3, [d(-1)]: 5, [d(-2)]: 1, [d(-4)]: 9 }, today)).toBe(3);
    expect(readingStreak({ [d(-1)]: 5, [d(-2)]: 1 }, today)).toBe(2); // today not begun yet
    expect(readingStreak({ [d(-2)]: 1 }, today)).toBe(0);
    const start = new Date(2026, 10, 20, 9).getTime();
    // Five days gone of thirty: about 101 pages were due by this morning.
    const pace = khatmaPace({ pagesRead: 110, startedAt: start, goalDays: 30, now: today.getTime() });
    expect(pace.daysLeft).toBe(25);
    expect(pace.perDay).toBe(Math.ceil(494 / 25));
    expect(pace.onTrack).toBe(true);
    expect(khatmaPace({ pagesRead: 10, startedAt: start, goalDays: 30, now: today.getTime() }).onTrack).toBe(false);
  });

  it("asks an ayah to stay on screen about as long as it takes to read", () => {
    expect(needMs(1)).toBe(1500);
    expect(needMs(20)).toBe(6000);
    expect(needMs(128)).toBe(15000);
  });
});

describe("Marks and reading in the store and the backup", () => {
  beforeEach(() => {
    useQ2Store.setState({ marks: {}, readLog: {}, khatma: { bits: emptyBits(), startedAt: 1, goalDays: null, finished: [] } });
  });

  it("keeps a mark only while it holds something", () => {
    const { setMark } = useQ2Store.getState();
    setMark(2, 255, { bookmark: true });
    setMark(2, 255, { color: "gold", note: "  آية الكرسي  " });
    expect(useQ2Store.getState().marks["2:255"]).toMatchObject({ bookmark: true, color: "gold", note: "  آية الكرسي  " });
    setMark(2, 255, { bookmark: false, color: undefined, note: " " });
    expect(useQ2Store.getState().marks["2:255"]).toBeUndefined();
  });

  it("logs the ayahs read each day and finishes a khatma", () => {
    const { markRead } = useQ2Store.getState();
    markRead([0, 1, 2], "2026-11-25");
    markRead([2, 3], "2026-11-25");
    expect(useQ2Store.getState().readLog["2026-11-25"]).toBe(4);
    markRead(Array.from({ length: TOTAL_AYAHS }, (_, i) => i), "2026-11-26");
    expect(useQ2Store.getState().khatma.finished).toHaveLength(1);
    useQ2Store.getState().newKhatma();
    expect(countBits(decodeBits(useQ2Store.getState().khatma.bits))).toBe(0);
    expect(useQ2Store.getState().khatma.finished).toHaveLength(1);
  });

  it("backs up marks and the khatma, and drops what is not valid", () => {
    useQ2Store.getState().setMark(18, 10, { note: "دعاء أصحاب الكهف" });
    useQ2Store.getState().markRead([ayahIndex(meta, 18, 10)], "2026-11-25");
    const blob = exportQuran2();
    useQ2Store.setState({ marks: {}, readLog: {}, khatma: { bits: emptyBits(), startedAt: 1, goalDays: null, finished: [] } });
    expect(adoptQuran2(blob)).toBe(true);
    expect(useQ2Store.getState().marks["18:10"]?.note).toBe("دعاء أصحاب الكهف");
    expect(countBits(decodeBits(useQ2Store.getState().khatma.bits))).toBe(1);
    expect(adoptQuran2({ ...blob, marks: { "999:1": { bookmark: true }, "2:2": { color: "red" }, "2:3": { bookmark: true, at: 5 } }, khatma: { bits: "<script>", startedAt: 1 } })).toBe(true);
    expect(Object.keys(useQ2Store.getState().marks)).toEqual(["2:3"]);
    expect(countBits(decodeBits(useQ2Store.getState().khatma.bits))).toBe(1); // the bad khatma was ignored
  });
});

describe("Finding an ayah from a recitation", () => {
  const top = (heard: string) => findRecited(index, heard).map((h) => `${h.s}:${h.a}`);

  it("finds the ayah from a few words in everyday spelling", () => {
    expect(top("قل هو الله احد")[0]).toBe("112:1");
    expect(top("وقال ربكم ادعوني استجب لكم")[0]).toBe("40:60");
    expect(top("اقرا باسم ربك الذي خلق")[0]).toBe("96:1");
    expect(top("يا ايها الذين امنوا كتب عليكم الصيام")[0]).toBe("2:183");
  });

  it("lists every ayah that says the same words", () => {
    expect(top("الله لا اله الا هو الحي القيوم").slice(0, 2).sort()).toEqual(["2:255", "3:2"]);
    expect(top("فباي الاء ربكما تكذبان")).toHaveLength(5);
  });

  it("forgives a misheard word in the middle, and ignores noise", () => {
    expect(top("ان مع العسر يسرا")[0]).toBe("94:6");
    expect(top("ولقد يسرنا القران للذكر هل من مدكر")[0]).toMatch(/^54:/);
    expect(top("اه")).toEqual([]);
  });
});

describe("Everyday spelling of the madda", () => {
  it("reads a hamza before an alef as the madda", () => {
    expect(matchesWord("ءَامَنُوا۟", "آمنوا")).toBe(true);
    expect(matchesWord("ٱلْقُرْءَانُ", "القرآن")).toBe(true);
    expect(matchesWord("ءَالَآءِ", "آلاء")).toBe(true);
    expect(findWord(index, "القرآن").length).toBeGreaterThan(40);
  });
});

describe("The printed page, line for line", () => {
  // Line numbers of a few surahs from Quran.com (word_fields=line_number).
  const sample = JSON.parse(readFileSync("tests/fixtures/quran2-lines-sample.json", "utf8")) as Record<string, Array<number[] | null>>;
  const linesOf = (s: number, a: number) => sample[String(s)]?.[a - 1] ?? null;
  const ayahsOn = (page: number) => {
    const [first, last] = pageRange(meta, page);
    const out = [];
    for (let i = first; i <= last; i++) {
      const [s, a] = refFromIndex(meta, i);
      const ayah = text.surahs[s - 1]!.ayahs[a - 1]!;
      out.push({ s, a, words: ayah.words, before: ayah.before });
    }
    return out;
  };

  it("takes only line numbers that fit the ayah's words", () => {
    const verses = [{ verse_number: 1, words: [{ char_type_name: "word", position: 2, line_number: 3 }, { char_type_name: "word", position: 1, line_number: 2 }, { char_type_name: "end", position: 3, line_number: 3 }] }, { verse_number: 2, words: [{ char_type_name: "word", position: 1, line_number: 3 }] }];
    expect(parseLines(verses, [2, 2])).toEqual([[2, 3], null]);
  });

  it("fills all fifteen lines, with each surah's title and basmala", () => {
    const p604 = layPage(ayahsOn(604), linesOf)!;
    expect(p604.map((l) => l.kind)).toEqual(["surah", "basmala", "words", "words", "surah", "basmala", "words", "words", "words", "surah", "basmala", "words", "words", "words", "words"]);
    const fatiha = layPage(ayahsOn(1), linesOf)!;
    expect(fatiha[0]).toEqual({ kind: "surah", s: 1 });
    expect(fatiha.filter((l) => l.kind === "basmala")).toHaveLength(0); // its basmala is its first ayah
  });

  it("puts a surah's title at the foot of the page before when its text starts at the top", () => {
    const naml = { s: 27, line: linesOf(27, 1)![0]! };
    const before = layPage(ayahsOn(376), linesOf, naml)!;
    const opening = layPage(ayahsOn(377), linesOf)!;
    expect(before.some((l) => l.kind === "blank")).toBe(false);
    expect(opening.some((l) => l.kind === "blank")).toBe(false);
    expect([...before, ...opening].filter((l) => l.kind === "surah")).toEqual([{ kind: "surah", s: 27 }]);
    expect(before[14]).toEqual({ kind: "surah", s: 27 });
    expect(opening[0]).toEqual({ kind: "basmala", s: 27 });
  });
});

describe("Word-by-word meanings", () => {
  it("keeps an ayah's meanings only when they line up with its words", () => {
    const verses = [
      { verse_number: 1, words: [{ char_type_name: "word", position: 1, translation: { text: "In (the) name" } }, { char_type_name: "end", position: 2, translation: { text: "(1)" } }] },
      { verse_number: 2, words: [{ char_type_name: "word", position: 1, translation: { text: "All praises <b>" } }] },
    ];
    expect(parseWordMeanings(verses, [1, 2])).toEqual([["In (the) name"], null]);
  });
});
