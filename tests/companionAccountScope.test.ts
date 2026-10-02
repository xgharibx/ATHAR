// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";

import { setAccountStorageOwner } from "@/lib/accountStorageScope";
import {
  addPin,
  listConversations,
  listPins,
  loadPartialStream,
  newConversationId,
  saveConversation,
  savePartialStream,
} from "@/lib/companionHistory";
import { loadProfile, saveProfile } from "@/lib/companionProfile";
import { clearMemory, getMemory, recordMemory } from "@/lib/companionAI";

describe("Companion account scope", () => {
  afterEach(() => setAccountStorageOwner("local"));

  it("keeps history, profile, pins, recovery, and memory with their owner", async () => {
    const ownerA = `user:companion-test-a-${crypto.randomUUID()}`;
    const ownerB = `user:companion-test-b-${crypto.randomUUID()}`;

    setAccountStorageOwner("local");
    await saveConversation({
      id: newConversationId(), title: "Local conversation", messages: [{ role: "user", content: "local" }],
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    addPin("local saved reply");
    savePartialStream("local-conversation", [], "local partial");
    saveProfile({ ...loadProfile(), greetingName: "Local name", onboarded: true });
    recordMemory("local memory");

    setAccountStorageOwner(ownerA);
    await saveConversation({
      id: newConversationId(), title: "A conversation", messages: [{ role: "user", content: "private A" }],
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    addPin("A saved reply");
    savePartialStream("a-conversation", [], "A partial");
    saveProfile({ ...loadProfile(), greetingName: "Account A", onboarded: true });
    recordMemory("account A memory");

    setAccountStorageOwner(ownerB);
    expect(await listConversations()).toEqual([]);
    expect(listPins()).toEqual([]);
    expect(loadPartialStream()).toBeNull();
    expect(loadProfile().greetingName).toBe("");
    expect(getMemory()).toEqual([]);

    setAccountStorageOwner(ownerA);
    expect((await listConversations()).map((item) => item.title)).toEqual(["A conversation"]);
    expect(listPins().map((item) => item.text)).toEqual(["A saved reply"]);
    expect(loadPartialStream()?.text).toBe("A partial");
    expect(loadProfile().greetingName).toBe("Account A");
    expect(getMemory().map((item) => item.q)).toEqual(["account A memory"]);

    setAccountStorageOwner("local");
    expect((await listConversations()).map((item) => item.title)).toEqual(["Local conversation"]);
    expect(listPins().map((item) => item.text)).toEqual(["local saved reply"]);
    expect(loadPartialStream()?.text).toBe("local partial");
    expect(loadProfile().greetingName).toBe("Local name");
    expect(getMemory().map((item) => item.q)).toEqual(["local memory"]);
    clearMemory();
  });
});
