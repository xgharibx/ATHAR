// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { splitIntoSegments } from "@/lib/companionBlocks";

describe("splitIntoSegments — empty callout skip", () => {
  it("drops callouts whose body is only whitespace", () => {
    const input = "قبل\n\n:::verse\n   \n:::\n\nبعد";
    const segs = splitIntoSegments(input);
    expect(segs.filter((s) => s.kind === "callout").length).toBe(0);
    const texts = segs.filter((s) => s.kind === "text").map((s) => (s as { text: string }).text);
    expect(texts.length).toBeGreaterThanOrEqual(1);
    expect(texts.join(" ")).toContain("قبل");
    expect(texts.join(" ")).toContain("بعد");
  });
  it("keeps callouts that have real body text", () => {
    const input = ":::verse\n﴿آية الكرسي﴾\n:::";
    const segs = splitIntoSegments(input);
    expect(segs.length).toBe(1);
    expect(segs[0].kind).toBe("callout");
  });
});

describe("splitIntoSegments — imperative promotion gap", () => {
  it("still promotes imperative phrases with up to ~60 chars between verb and route", () => {
    // 60 chars between verb and route — well past the old {0,40}? cap
    const longGap = " ".repeat(60);
    const input = `افتح${longGap}[/c/morning]`;
    const segs = splitIntoSegments(input);
    expect(segs).toContainEqual({
      kind: "action",
      label: "افتح أذكار الصباح",
      route: "/c/morning",
    });
  });
  it("still tolerates small gaps for back-compat", () => {
    const input = "افتح [/c/morning]";
    const segs = splitIntoSegments(input);
    expect(segs).toContainEqual({
      kind: "action",
      label: "افتح أذكار الصباح",
      route: "/c/morning",
    });
  });
});