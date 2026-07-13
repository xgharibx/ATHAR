// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  exportConversationText,
  groupConversationsByRecency,
  previewSnippet,
} from "@/lib/companionHistoryGroup";
import type { CompanionConversation } from "@/lib/companionHistory";

const make = (
  id: string,
  updatedAt: number,
  messages: CompanionConversation["messages"],
  patch: Partial<CompanionConversation> = {},
): CompanionConversation => ({
  id, title: id, messages, createdAt: updatedAt, updatedAt, ...patch,
});

describe("groupConversationsByRecency — pinned section", () => {
  it("surfaces pinned conversations in their own section, sorted by pinnedAt desc", () => {
    const now = Date.now();
    const layout = groupConversationsByRecency([
      make("pin1", now - 5 * 86_400_000, [], { pinned: true, pinnedAt: now - 1000 }),
      make("pin2", now - 1 * 86_400_000, [], { pinned: true, pinnedAt: now - 500 }),
      make("reg", now - 100, []),
    ]);
    expect(layout.pinned.length).toBe(2);
    expect(layout.pinned[0].id).toBe("pin2");
    expect(layout.pinned[1].id).toBe("pin1");
    expect(layout.groups.length).toBe(1);
    expect(layout.groups[0].items[0].id).toBe("reg");
  });

  it("returns empty pinned array when none are pinned", () => {
    const layout = groupConversationsByRecency([make("a", Date.now() - 100, [])]);
    expect(layout.pinned).toEqual([]);
    expect(layout.groups.length).toBe(1);
  });

  it("omits empty groups", () => {
    const now = Date.now();
    const layout = groupConversationsByRecency([
      make("p", now - 100, [], { pinned: true, pinnedAt: now }),
    ]);
    expect(layout.groups).toEqual([]);
    expect(layout.pinned.length).toBe(1);
  });
});

describe("previewSnippet + exportConversationText", () => {
  it("preview picks last assistant message", () => {
    const c = make("a", 1, [
      { role: "user", content: "first" },
      { role: "assistant", content: "second" },
      { role: "assistant", content: "third — final" },
    ]);
    expect(previewSnippet(c)).toBe("third — final");
  });

  it("export labels both sides in Arabic", () => {
    const c = make("a", 1, [
      { role: "user", content: "مرحبا" },
      { role: "assistant", content: "وعليكم" },
    ]);
    expect(exportConversationText(c)).toContain("👤 أنت:");
    expect(exportConversationText(c)).toContain("✨ أثر:");
  });
});