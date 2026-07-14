// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { splitIntoSegments } from "@/lib/companionBlocks";

describe("splitIntoSegments — cite callout", () => {
  it("parses a :::cite(source)\n…\n::: block at start of segment", () => {
    const segs = splitIntoSegments(":::cite(sharh:1)\nنص الاقتباس هنا\n:::");
    const cite = segs.find((s) => s.kind === "callout");
    expect(cite).toBeDefined();
    if (cite && cite.kind === "callout") {
      expect(cite.calloutKind).toBe("cite");
      expect(cite.text).toContain("نص الاقتباس");
      expect(cite.text).toContain("sharh:1");
    }
  });

  it("parses a cite block that follows preceding text", () => {
    const segs = splitIntoSegments("قبل\n:::cite(sharh:1)\nنص الاقتباس هنا\n:::\nبعد");
    const cite = segs.find((s) => s.kind === "callout");
    expect(cite).toBeDefined();
  });

  it("still recognises existing callout kinds (verse / hadith / dua / tip)", () => {
    for (const kind of ["verse", "hadith", "dua", "tip", "warn", "info"]) {
      const segs = splitIntoSegments(`:::${kind}\nنص\n:::`);
      const c = segs.find((s) => s.kind === "callout");
      expect(c).toBeDefined();
      if (c && c.kind === "callout") expect(c.calloutKind).toBe(kind);
    }
  });
});
