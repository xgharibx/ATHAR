// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { splitIntoSegments } from "@/lib/companionBlocks";

describe("splitIntoSegments — text only", () => {
  it("returns one text segment when no blocks present", () => {
    expect(splitIntoSegments("مرحبا كيف حالك")).toEqual([{ kind: "text", text: "مرحبا كيف حالك" }]);
  });
  it("returns empty array for empty input", () => {
    expect(splitIntoSegments("")).toEqual([]);
    expect(splitIntoSegments("   \n\n  ")).toEqual([]);
  });
});

describe("splitIntoSegments — action blocks", () => {
  it("recognises [action:label →/route]", () => {
    const segs = splitIntoSegments("اقرأ [action:سورة الكهف →/quran] الآن");
    expect(segs).toContainEqual({ kind: "action", label: "سورة الكهف", route: "/quran" });
    expect(segs.length).toBe(3); // text before + action + text after
    expect(segs[0]).toEqual({ kind: "text", text: "اقرأ" });
    expect(segs[2]).toEqual({ kind: "text", text: "الآن" });
  });
  it("supports multiple actions in one message", () => {
    const segs = splitIntoSegments("[action:أذكار الصباح →/c/morning] ثم [action:السبحة →/sebha]");
    expect(segs.filter((s) => s.kind === "action").length).toBe(2);
  });
  it("handles action at start of message with no preceding text", () => {
    const segs = splitIntoSegments("[action:افتح →/c/morning]");
    expect(segs).toEqual([{ kind: "action", label: "افتح", route: "/c/morning" }]);
  });
});

describe("splitIntoSegments — callout blocks", () => {
  it("recognises a verse callout", () => {
    const input = "قال الله تعالى:\n\n:::verse\n﴿البقرة ٢٥٥﴾ — آية الكرسي\n:::\n\nوالحمد لله.";
    const segs = splitIntoSegments(input);
    expect(segs.some((s) => s.kind === "callout" && (s as { calloutKind: string }).calloutKind === "verse")).toBe(true);
  });
  it("supports hadith + dua + tip + warn + info kinds", () => {
    for (const k of ["verse", "hadith", "dua", "tip", "warn", "info"] as const) {
      const input = `:::${k}\nنص تجريبي\n:::`;
      const segs = splitIntoSegments(input);
      expect(segs.length).toBe(1);
      expect(segs[0].kind).toBe("callout");
      expect((segs[0] as { calloutKind: string }).calloutKind).toBe(k);
    }
  });
  it("supports multiple callouts in one message", () => {
    const input = ":::verse\nآية ١\n:::\n\n:::hadith\nحديث ١\n:::\n\n:::dua\nدعاء ١\n:::";
    const segs = splitIntoSegments(input);
    expect(segs.filter((s) => s.kind === "callout").length).toBe(3);
  });
});

describe("splitIntoSegments — artefact cleanup", () => {
  it("strips [//-], [//~], [//] artifacts", () => {
    const segs = splitIntoSegments("نص [//-] ثم [//~] ثم [//] نهاية");
    const text = (segs.find((s) => s.kind === "text") as { text: string }).text;
    expect(text).not.toContain("[//-]");
    expect(text).not.toContain("[//~]");
    expect(text).not.toContain("[//]");
  });
  it("removes standalone ---", () => {
    const segs = splitIntoSegments("قبل\n\n---\n\nبعد");
    const text = (segs.find((s) => s.kind === "text") as { text: string }).text;
    expect(text).not.toContain("---");
  });
});

describe("splitIntoSegments — mixed", () => {
  it("returns segments in correct order when callouts and actions interleave", () => {
    const input = "مقدمة\n\n:::verse\n﴿آية﴾\n:::\n\nثم [action:افتح →/c/morning]\n\n:::dua\nاللهم أعنّي\n:::\n\nخاتمة";
    const segs = splitIntoSegments(input);
    const kinds = segs.map((s) => s.kind);
    expect(kinds).toEqual(["text", "callout", "text", "action", "callout", "text"]);
    expect(segs.filter((s) => s.kind === "callout").length).toBe(2);
    expect(segs.filter((s) => s.kind === "action").length).toBe(1);
  });
});

describe("splitIntoSegments — legacy route shorthand", () => {
  it("promotes 'افتح [/c/morning]' to an action block", () => {
    const segs = splitIntoSegments("افتح [/c/morning]");
    expect(segs).toContainEqual({
      kind: "action",
      label: "افتح أذكار الصباح",
      route: "/c/morning",
    });
  });
  it("works with explicit label after the route", () => {
    const segs = splitIntoSegments("اقرأ [/quran وردي]");
    expect(segs).toContainEqual({ kind: "action", label: "اقرأ وردي", route: "/quran" });
  });
  it("handles multiple imperative phrases in one message", () => {
    const segs = splitIntoSegments("افتح [/c/morning] ثم اقرأ [/quran وردي]");
    const actions = segs.filter((s) => s.kind === "action");
    expect(actions.length).toBe(2);
    expect(actions[0].kind === "action" && actions[0].route).toBe("/c/morning");
    expect(actions[1].kind === "action" && actions[1].route).toBe("/quran");
  });
});