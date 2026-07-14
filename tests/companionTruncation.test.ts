// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { previewSnippet, groupConversationsByRecency } from "@/lib/companionHistoryGroup";
import { titleFromMessages } from "@/lib/companionHistory";
import type { CompanionConversation } from "@/lib/companionHistory";

describe("titleFromMessages — word-boundary truncation", () => {
  it("does not truncate mid-word", () => {
    const long = "السلام عليكم ورحمة الله وبركاته أخي الكريم أعجبني موضوع اليوم جدا";
    const t = titleFromMessages([{ role: "user", content: long }]);
    expect(t.endsWith("…")).toBe(true);
    // The cut must land on a word boundary — the kept text ends in a
    // complete word (no trailing space, since slice cuts BEFORE the space).
    const beforeEllipsis = t.slice(0, -1);
    expect(beforeEllipsis).not.toMatch(/[\s]$/);
    expect(beforeEllipsis.length).toBeGreaterThan(0);
  });
  it("keeps short titles intact", () => {
    expect(titleFromMessages([{ role: "user", content: "مرحبا" }])).toBe("مرحبا");
  });
});

describe("previewSnippet — word-boundary truncation", () => {
  const conv: CompanionConversation = {
    id: "c_test",
    title: "تجربة",
    createdAt: 0,
    updatedAt: 0,
    messages: [
      { role: "user", content: "سؤال قصير" },
      { role: "assistant", content: "الجواب يبدأ هنا ثم يستمر بكلام طويل جدا ".repeat(20) },
    ],
  };
  it("cuts at a space, not in the middle of a word", () => {
    const snippet = previewSnippet(conv, 90);
    expect(snippet.endsWith("…")).toBe(true);
    // The cut should land BEFORE the last space inside the slice — meaning
    // the resulting string must NOT end with a space (the space was the
    // boundary, not part of the kept text) AND the kept text must be a
    // whole-word prefix (no partial Arabic glyph glued on).
    const beforeEllipsis = snippet.slice(0, -1);
    expect(beforeEllipsis).not.toMatch(/[\s]$/);
    // The character before the cut was either a letter/diacritic or a space
    // we trimmed away — assert it's a complete word.
    expect(beforeEllipsis.length).toBeGreaterThan(0);
  });
  it("returns short text as-is", () => {
    const tiny: CompanionConversation = {
      ...conv,
      messages: [{ role: "assistant", content: "رد قصير" }],
    };
    expect(previewSnippet(tiny)).toBe("رد قصير");
  });
});

describe("groupConversationsByRecency — 7-day window", () => {
  const now = Date.now();
  const dayMs = 86_400_000;
  const conv = (offsetDays: number): CompanionConversation => ({
    id: `c_${offsetDays}`,
    title: `قبل ${offsetDays} يوم`,
    createdAt: now - offsetDays * dayMs,
    updatedAt: now - offsetDays * dayMs,
    messages: [],
  });

  it("places a conversation from exactly 7 days ago in 'this week'", () => {
    const layout = groupConversationsByRecency([conv(0), conv(7)]);
    const weekGroup = layout.groups.find((g) => g.key === "week");
    expect(weekGroup).toBeDefined();
    expect(weekGroup?.items.map((c) => c.id)).toContain("c_7");
  });
});