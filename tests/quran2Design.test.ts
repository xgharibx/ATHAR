import { describe, expect, it } from "vitest";
import { madinaLines, parseMadinaPage, type MadinaPage } from "@/quran2/data/madina";
import { adoptQuran2, exportQuran2, useQ2Store } from "@/quran2/store";
import { readMode } from "@/quran2/tasmee/types";

/** A page built from (surah, ayah, words, line of each word) rows; each ayah gets its end glyph. */
function page(rows: Array<[number, number, number[]]>): MadinaPage {
  const glyphs = rows.flatMap(([s, a, lines]) => [
    ...lines.map((line, i) => ({ s, a, n: i + 1, line, code: `w${s}.${a}.${i + 1}` })),
    { s, a, n: 0, line: lines[lines.length - 1]!, code: `e${s}.${a}` },
  ]);
  return { page: 1, glyphs, linked: [] };
}

describe("«مصحف المدينة»: the fifteen lines", () => {
  it("gives each surah beginning on the page its title and basmala on the lines above its text", () => {
    // Like page 604: three surahs, each with a title and a basmala.
    const lines = madinaLines(page([
      [112, 1, [3, 3, 3]], [112, 2, [3]], [112, 3, [4]], [112, 4, [4]],
      [113, 1, [7, 7]], [113, 2, [8]], [113, 3, [8, 9]],
      [114, 1, [12]], [114, 2, [13]], [114, 3, [14]], [114, 4, [15]],
    ]));
    expect(lines.map((l) => l.kind)).toEqual([
      "surah", "basmala", "glyphs", "glyphs", "surah", "basmala", "glyphs", "glyphs", "glyphs",
      "surah", "basmala", "glyphs", "glyphs", "glyphs", "glyphs",
    ]);
    const third = lines[2]!;
    expect(third.kind === "glyphs" && third.glyphs.map((g) => g.code)).toEqual(["w112.1.1", "w112.1.2", "w112.1.3", "e112.1", "w112.2.1", "e112.2"]);
  });

  it("puts the title at the foot of the page before when the text starts at the top", () => {
    const before = madinaLines(page([[26, 227, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]]]), { s: 27, line: 2 });
    expect(before[14]).toEqual({ kind: "surah", s: 27 });
    const opening = madinaLines(page([[27, 1, [2, 2, 3]]]));
    expect(opening[0]).toEqual({ kind: "basmala", s: 27 });
    expect(opening.some((l) => l.kind === "surah")).toBe(false);
  });

  it("gives at-Tawba a title and no basmala", () => {
    const lines = madinaLines(page([[9, 1, [3, 3]]]));
    expect(lines.slice(0, 3).map((l) => l.kind)).toEqual(["blank", "surah", "glyphs"]);
  });

  it("links an ayah's glyphs to our words only when the counts agree", () => {
    const parsed = parseMadinaPage(
      1,
      [
        { verse_key: "1:1", words: [{ char_type_name: "word", position: 1, line_number: 2, code_v2: "a" }, { char_type_name: "end", position: 2, line_number: 2, code_v2: "b" }] },
        { verse_key: "1:2", words: [{ char_type_name: "word", position: 1, line_number: 3, code_v2: "c" }] },
      ],
      (s, a) => (a === 1 ? 1 : 4),
    );
    expect(parsed.linked).toEqual(["1:1"]);
    expect(parsed.glyphs.map((g) => [g.n, g.line, g.code])).toEqual([[1, 2, "a"], [0, 2, "b"], [1, 3, "c"]]);
  });
});

describe("«التسميع»: the log and its backup", () => {
  it("keeps the latest recitations and restores only valid ones", () => {
    useQ2Store.setState({ tasmeeLog: [] });
    useQ2Store.getState().logTasmee({ at: 1, label: "الكهف ١–١٠", target: "/q2/tasmee/session?s=18&from=1&to=10&mode=hidden", said: 140, total: 150, missed: ["18:2:3"] });
    const blob = exportQuran2();
    useQ2Store.setState({ tasmeeLog: [] });
    expect(adoptQuran2(blob)).toBe(true);
    expect(useQ2Store.getState().tasmeeLog).toHaveLength(1);
    expect(adoptQuran2({ ...blob, tasmeeLog: [{ at: 2, label: "x", target: "https://evil.example", said: 1, total: 1, missed: [] }, { at: 3, label: "y", target: "/q2/tasmee", said: 1, total: 2, missed: ["bad", "2:3:4"] }] })).toBe(true);
    expect(useQ2Store.getState().tasmeeLog).toEqual([{ at: 3, label: "y", target: "/q2/tasmee", said: 1, total: 2, missed: ["2:3:4"] }]);
  });

  it("reads the display mode, hidden by default", () => {
    expect(readMode("cue")).toBe("cue");
    expect(readMode("shown")).toBe("shown");
    expect(readMode(null)).toBe("hidden");
    expect(readMode("anything")).toBe("hidden");
  });
});
