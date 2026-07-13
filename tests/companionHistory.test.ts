// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  addPin, clearPartialStream, listPins, loadPartialStream,
  newConversationId, removePin, savePartialStream, titleFromMessages,
} from "@/lib/companionHistory";

const clear = () => {
  try { localStorage.removeItem("noor_companion_partial_v1"); } catch { /* ignore */ }
  try { localStorage.removeItem("noor_companion_pins_v1"); } catch { /* ignore */ }
  try {
    const dbs = (indexedDB as unknown as { databases?: () => Promise<Array<{ name?: string }>> }).databases;
    if (typeof dbs === "function") {
      dbs().then((arr) => {
        for (const d of arr) if (d.name?.startsWith("athar-companion")) indexedDB.deleteDatabase(d.name);
      }).catch(() => {});
    }
  } catch { /* ignore */ }
};

describe("companionHistory", () => {
  beforeEach(() => clear());

  it("titleFromMessages truncates long messages", () => {
    expect(titleFromMessages([])).toBe("محادثة جديدة");
    expect(titleFromMessages([{ role: "user", content: "" }])).toBe("محادثة جديدة");
    const long = "x".repeat(120);
    const t = titleFromMessages([{ role: "user", content: long }]);
    expect(t.length).toBeLessThanOrEqual(41);
    expect(t.endsWith("…")).toBe(true);
  });

  it("newConversationId is unique", () => {
    const a = newConversationId();
    const b = newConversationId();
    expect(a).not.toBe(b);
    expect(a.startsWith("c_")).toBe(true);
  });

  it("partial stream round-trip within TTL", () => {
    const id = newConversationId();
    const msgs = [{ role: "user" as const, content: "hi" }];
    savePartialStream(id, msgs, "hello…");
    const back = loadPartialStream();
    expect(back).not.toBeNull();
    expect(back?.conversationId).toBe(id);
    expect(back?.messages).toEqual(msgs);
    expect(back?.text).toBe("hello…");
    clearPartialStream();
    expect(loadPartialStream()).toBeNull();
  });

  it("partial stream expires after TTL", () => {
    const id = newConversationId();
    savePartialStream(id, [], "stale");
    const raw = localStorage.getItem("noor_companion_partial_v1");
    const parsed = raw ? JSON.parse(raw) : null;
    parsed.updatedAt = Date.now() - 60 * 60 * 1000;
    localStorage.setItem("noor_companion_partial_v1", JSON.stringify(parsed));
    expect(loadPartialStream()).toBeNull();
  });

  it("addPin + listPins + removePin", () => {
    expect(listPins()).toEqual([]);
    const a = addPin("first reply");
    const b = addPin("second reply");
    const all = listPins();
    expect(all.length).toBe(2);
    expect(all[0].id).toBe(b.id);
    expect(all[1].id).toBe(a.id);
    removePin(a.id);
    expect(listPins().map((p) => p.id)).toEqual([b.id]);
  });
});
