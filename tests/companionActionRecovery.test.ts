// @vitest-environment jsdom
/**
 * tests/companionActionRecovery.test.ts
 *
 * Regressions from a live MiniMax-M3 run where two consecutive action
 * attempts in the same reply came out malformed — one recovered correctly,
 * the other ("افتح أذكار المساء") stayed dead text because its garbled
 * route was doubled ("(/ / )") instead of the single-slash shape
 * extractEmbeddedAction() originally expected. Also covers the guessCalloutKind
 * false-positive this same reply exposed ("سورة قصيرة" misread as a verse
 * reference because "سورة\s+\S+\b" matched an adjective, not a name — the
 * trailing \b was also silently broken since JS's default \w is ASCII-only
 * and never matches Arabic letters).
 */
import { describe, expect, it } from "vitest";
import { splitIntoSegments } from "@/lib/companionBlocks";

describe("extractEmbeddedAction — garbled route recovery", () => {
  it("recovers both actions from a real malformed MiniMax-M3 reply", () => {
    const raw =
      "ابدأ بأذكار المساء. ::: اقرأ أذكار المساء كاملة، ثم افتح السبحة.\n" +
      "::: ::: (/ / )\nافتح أذكار المساء\n::: ::: (/ )\nافتح السبحة\n:::";
    const segs = splitIntoSegments(raw);
    const routes = segs
      .filter((s) => s.kind === "action")
      .map((s) => (s as { route: string }).route);
    expect(routes).toContain("/c/evening");
    expect(routes).toContain("/sebha");
  });

  it("recovers a single-slash garbled route (already worked, kept as a guard)", () => {
    const raw = "أرسل لك تحيتك الآن. [ افتح السبحة ←/ ]";
    const segs = splitIntoSegments(raw);
    const action = segs.find((s) => s.kind === "action");
    expect(action && action.kind === "action" ? action.route : null).toBe("/sebha");
  });

  it("does not leak raw '(/ ...)' fragments into text segments once recovered", () => {
    const raw = ":::tip\n(/ / )\nافتح أذكار المساء\n:::";
    const segs = splitIntoSegments(raw);
    const text = segs
      .filter((s) => s.kind === "text")
      .map((s) => (s as { text: string }).text)
      .join(" ");
    expect(text).not.toMatch(/\(\/[\s/]*\)/);
  });

  it("still renders an unrelated parenthetical tip normally (no false action)", () => {
    const raw = ":::tip\n(تذكير) اجعل هذا عادة يومية\n:::";
    const segs = splitIntoSegments(raw);
    expect(segs.some((s) => s.kind === "action")).toBe(false);
    expect(segs.some((s) => s.kind === "callout")).toBe(true);
  });
});

describe("guessCalloutKind — verse false-positive fix", () => {
  it("does not classify 'سورة قصيرة' (adjective) as a verse", () => {
    const raw = ":::tip\nاختم بخمس آيات من سورة قصيرة كبداية لوردك.\n:::";
    const segs = splitIntoSegments(raw);
    const callout = segs.find((s) => s.kind === "callout");
    expect(callout && callout.kind === "callout" ? callout.calloutKind : null).toBe("tip");
  });

  it("still classifies a real surah name as a verse", () => {
    const raw = "::: اقرأ سورة الكهف يوم الجمعة :::";
    const segs = splitIntoSegments(raw);
    const callout = segs.find((s) => s.kind === "callout");
    expect(callout && callout.kind === "callout" ? callout.calloutKind : null).toBe("verse");
  });

  it("classifies يس/طه/ق (surahs without the definite article) as verses too", () => {
    const raw = "::: استمع لسورة يس هذا المساء :::";
    const segs = splitIntoSegments(raw);
    const callout = segs.find((s) => s.kind === "callout");
    expect(callout && callout.kind === "callout" ? callout.calloutKind : null).toBe("verse");
  });
});
