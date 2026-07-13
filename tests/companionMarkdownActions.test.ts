// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { appLinksToMarkdown, calloutLabel, isActionHref } from "@/lib/companionMarkdown";

describe("appLinksToMarkdown — action blocks", () => {
  it("converts [action:label →/route] to a markdown link with action: scheme", () => {
    const out = appLinksToMarkdown("[action:افتح أذكار الصباح →/c/morning]");
    expect(out).toBe("[افتح أذكار الصباح](action:/c/morning)");
  });

  it("supports multiple actions in one message", () => {
    const out = appLinksToMarkdown(
      "اقرأ [action:سورة الكهف →/quran]، ثم [action:السبحة →/sebha].",
    );
    expect(out).toContain("[سورة الكهف](action:/quran)");
    expect(out).toContain("[السبحة](action:/sebha)");
  });

  it("lower-cases the route", () => {
    const out = appLinksToMarkdown("[action:افتح →/C/MORNING]");
    expect(out).toBe("[افتح](action:/c/morning)");
  });
});

describe("appLinksToMarkdown — callout blocks", () => {
  it("converts :::verse ... ::: to a blockquote with marker", () => {
    const input = ":::verse\n﴿البقرة ٢٥٥﴾ — آية الكرسي\n:::";
    const out = appLinksToMarkdown(input);
    expect(out).toContain("[callout:verse]");
    expect(out).toContain("آية الكرسي");
  });

  it("supports hadith + dua + tip + warn + info kinds", () => {
    for (const k of ["verse", "hadith", "dua", "tip", "warn", "info"] as const) {
      const input = `:::${k}\nنص تجريبي\n:::`;
      const out = appLinksToMarkdown(input);
      expect(out).toContain(`[callout:${k}]`);
      expect(calloutLabel(k)).toBeTruthy();
    }
  });

  it("preserves multiple callouts in one message", () => {
    const input = ":::verse\nآية ١\n:::\n\n:::hadith\nحديث ١\n:::";
    const out = appLinksToMarkdown(input);
    expect(out).toContain("[callout:verse]");
    expect(out).toContain("[callout:hadith]");
  });
});

describe("isActionHref", () => {
  it("detects action: scheme", () => {
    expect(isActionHref("action:/c/morning")).toBe(true);
    expect(isActionHref("/c/morning")).toBe(false);
    expect(isActionHref(undefined)).toBe(false);
  });
});