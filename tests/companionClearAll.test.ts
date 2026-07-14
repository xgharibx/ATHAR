// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from "vitest";

// Polyfill IndexedDB so Dexie can actually open a database in jsdom.
import "fake-indexeddb/auto";

import * as history from "@/lib/companionHistory";
vi.mock("@/lib/quranIDB", () => ({
  idbGetExtras: async () => null,
  idbSetExtras: async () => {},
}));

function makeConv(id: string, title: string): history.CompanionConversation {
  return {
    id,
    title,
    messages: [{ role: "user", content: title }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

beforeEach(async () => {
  // Make sure each test starts with an empty DB.
  await history.clearAllConversations();
});

describe("clearAllConversations", () => {
  it("removes every saved conversation", async () => {
    await history.saveConversation(makeConv("c1", "أ"));
    await history.saveConversation(makeConv("c2", "ب"));
    await history.saveConversation(makeConv("c3", "ج"));
    const before = await history.listConversations();
    expect(before.length).toBe(3);
    await history.clearAllConversations();
    const after = await history.listConversations();
    expect(after.length).toBe(0);
  });

  it("does not throw on an empty database", async () => {
    await expect(history.clearAllConversations()).resolves.toBeUndefined();
  });

  it("deleteConversation still works after a clear-all", async () => {
    const a = makeConv("c1", "أ");
    await history.saveConversation(a);
    await history.saveConversation(makeConv("c2", "ب"));
    await history.clearAllConversations();
    await history.saveConversation(a);
    await history.deleteConversation(a.id);
    const all = await history.listConversations();
    expect(all.find((c) => c.id === "c1")).toBeUndefined();
  });
});
