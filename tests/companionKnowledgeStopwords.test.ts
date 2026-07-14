// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { __test__ } from "@/lib/companionKnowledge";

describe("companionKnowledge tokenize + stopwords", () => {
  const { tokenize, STOPWORDS } = __test__;

  it("strips diacritics before tokenising", () => {
    const toks = tokenize("السَّلَامُ عَلَيْكُمْ");
    expect(toks).toContain("السلام");
    expect(toks).toContain("عليكم");
  });

  it("filters out Arabic stopwords", () => {
    const toks = tokenize("في من على إلى عن ما لا");
    for (const t of toks) {
      expect(STOPWORDS.has(t)).toBe(false);
    }
    expect(toks).toEqual([]);
  });

  it("keeps content words even when surrounded by stopwords", () => {
    const toks = tokenize("في القرآن الكريم ذكرى");
    expect(toks).toContain("القرآن");
    expect(toks).toContain("الكريم");
    expect(toks).toContain("ذكرى");
    expect(toks).not.toContain("في");
  });

  it("drops tokens shorter than 3 letters", () => {
    const toks = tokenize("في من على");
    expect(toks).toEqual([]);
  });
});