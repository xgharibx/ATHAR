// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { accountScopedStorageKey, getAccountStorageOwner, setAccountStorageOwner } from "@/lib/accountStorageScope";
import { copyLocalDataIntoAccount, hasLocalCompanionData, hasLocalDataToImport } from "@/lib/accountDataImport";
import { hydrateAccountStorageOwner, useNoorStore } from "@/store/noorStore";
import { idbGetAllHadithBookmarks, idbSetHadithBookmark } from "@/lib/hadithIDB";
import { loadCustomReminders, saveCustomReminders } from "@/lib/reminderStorage";
import { listConversations, listPins, newConversationId, saveConversation } from "@/lib/companionHistory";
import { getLeaderboardIdentity, peekLeaderboardIdentity } from "@/lib/leaderboard";

function seedStore(key: string, state: Record<string, unknown>) {
  localStorage.setItem(key, JSON.stringify({ state, version: 33 }));
}

describe("explicit local-data import", () => {
  beforeEach(async () => {
    localStorage.clear();
    setAccountStorageOwner("local");
    await hydrateAccountStorageOwner("local");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setAccountStorageOwner("local");
  });

  it("keeps the source intact, merges progress/favorites, and never copies auth tokens", async () => {
    const owner = `user:import-test-${crypto.randomUUID()}`;
    expect(await hasLocalDataToImport()).toBe(false);
    seedStore("noor_store_v1", {
      prefs: { theme: "midnight" },
      onboardingDone: true,
      favorites: { "local:1": true },
      progress: { "morning:0": 4, "evening:0": 2 },
    });
    seedStore(accountScopedStorageKey("noor_store_v1", owner), {
      prefs: { theme: "forest" },
      onboardingDone: false,
      favorites: { "account:1": true },
      progress: { "morning:0": 3, "night:0": 1 },
    });
    localStorage.setItem("sb-project-auth-token", "secret-session-token");
    localStorage.setItem("noor_companion_pins_v1", JSON.stringify([
      { id: "local-pin", text: "local reply", savedAt: 1 },
    ]));
    localStorage.setItem(accountScopedStorageKey("noor_companion_pins_v1", owner), JSON.stringify([
      { id: "account-pin", text: "account reply", savedAt: 2 },
    ]));
    await hydrateAccountStorageOwner("local");
    expect(await hasLocalDataToImport()).toBe(true);
    await idbSetHadithBookmark("nawawi:4", true);
    await saveCustomReminders([{
      id: "legacy-reminder", category: "custom", title: "Legacy reminder", description: "",
      enabled: true, repeat: "daily", atTimeOfDay: "09:00", deeplink: { route: "/" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }]);
    await saveConversation({
      id: newConversationId(), title: "Legacy companion", messages: [{ role: "user", content: "old local note" }],
      createdAt: Date.now(), updatedAt: Date.now(),
    });

    await copyLocalDataIntoAccount(owner, () => true, { includeCompanionData: true });

    expect(useNoorStore.getState().favorites).toEqual({
      "local:1": true,
      "account:1": true,
    });
    expect(useNoorStore.getState().progress).toEqual({
      "morning:0": 4,
      "evening:0": 2,
      "night:0": 1,
    });
    expect(useNoorStore.getState().prefs.theme).toBe("forest");
    expect(useNoorStore.getState().onboardingDone).toBe(false);
    expect(localStorage.getItem("noor_store_v1")).not.toBeNull();
    expect(localStorage.getItem(accountScopedStorageKey("sb-project-auth-token", owner))).toBeNull();
    expect(localStorage.getItem("sb-project-auth-token")).toBe("secret-session-token");
    expect(await idbGetAllHadithBookmarks()).toEqual({ "nawawi:4": true });
    expect((await loadCustomReminders()).map((item) => item.id)).toEqual(["legacy-reminder"]);
    expect((await listConversations()).map((item) => item.title)).toEqual(["Legacy companion"]);
    expect(listPins().map((item) => item.id)).toEqual(["account-pin", "local-pin"]);
  });

  it("preserves local preferences and onboarding when importing into a fresh account", async () => {
    const owner = `user:fresh-import-${crypto.randomUUID()}`;
    seedStore("noor_store_v1", {
      prefs: { theme: "midnight" },
      onboardingDone: true,
      favorites: { "local:1": true },
    });
    await hydrateAccountStorageOwner("local");

    await copyLocalDataIntoAccount(owner);

    expect(useNoorStore.getState().prefs.theme).toBe("midnight");
    expect(useNoorStore.getState().onboardingDone).toBe(true);
  });

  it("keeps Companion history local unless it has its own explicit opt-in", async () => {
    const owner = `user:private-companion-${crypto.randomUUID()}`;
    const conversationId = newConversationId();
    await saveConversation({
      id: conversationId,
      title: "Private local conversation",
      messages: [{ role: "user", content: "private local text" }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    localStorage.setItem("noor_companion_profile_v1", JSON.stringify({ name: "Local profile", onboarded: true }));
    localStorage.setItem("noor_companion_pins_v1", JSON.stringify([
      { id: "private-pin", text: "private saved reply", savedAt: 1 },
    ]));

    expect(await hasLocalCompanionData()).toBe(true);
    await copyLocalDataIntoAccount(owner);
    await hydrateAccountStorageOwner(owner);
    expect(await listConversations()).toEqual([]);
    expect(localStorage.getItem(accountScopedStorageKey("noor_companion_profile_v1", owner))).toBeNull();
    expect(localStorage.getItem(accountScopedStorageKey("noor_companion_pins_v1", owner))).toBeNull();

    await copyLocalDataIntoAccount(owner, () => true, { includeCompanionData: true });
    await hydrateAccountStorageOwner(owner);
    expect((await listConversations()).map((item) => item.id)).toContain(conversationId);
    expect(JSON.parse(localStorage.getItem(accountScopedStorageKey("noor_companion_profile_v1", owner)) ?? "null").name).toBe("Local profile");
    expect(listPins().map((item) => item.id)).toEqual(["private-pin"]);
    await hydrateAccountStorageOwner("local");
    expect((await listConversations()).map((item) => item.id)).toContain(conversationId);
  });

  it("stops safely when the account changes before copying begins", async () => {
    const owner = `user:stale-import-${crypto.randomUUID()}`;
    localStorage.setItem("noor_example_v1", "local-only-value");
    let checks = 0;

    await copyLocalDataIntoAccount(owner, () => ++checks === 1);

    expect(localStorage.getItem(accountScopedStorageKey("noor_example_v1", owner))).toBeNull();
    expect(localStorage.getItem("noor_example_v1")).toBe("local-only-value");
    expect(getAccountStorageOwner()).toBe("local");
  });

  it("does not restore the imported owner or identity after a slower account switch", async () => {
    const importingOwner = `user:slow-import-${crypto.randomUUID()}`;
    const activeOwner = `user:active-during-import-${crypto.randomUUID()}`;
    seedStore("noor_store_v1", { favorites: { "local:1": true } });
    await hydrateAccountStorageOwner("local");
    const sourceIdentity = getLeaderboardIdentity();

    await hydrateAccountStorageOwner(activeOwner);
    const activeIdentity = getLeaderboardIdentity();
    await hydrateAccountStorageOwner("local");

    const realImportState = useNoorStore.getState().importState;
    const realGetState = useNoorStore.getState.bind(useNoorStore);
    let signalImportFinished!: () => void;
    let releaseImport!: () => void;
    const importFinished = new Promise<void>((resolve) => { signalImportFinished = resolve; });
    const importGate = new Promise<void>((resolve) => { releaseImport = resolve; });
    vi.spyOn(useNoorStore, "getState").mockImplementation(() => {
      const state = realGetState();
      if (getAccountStorageOwner() !== importingOwner) return state;
      return {
        ...state,
        importState: async (blob) => {
          await realImportState(blob);
          signalImportFinished();
          await importGate;
        },
      };
    });

    let requestedOwner = importingOwner;
    const importPromise = copyLocalDataIntoAccount(importingOwner, () => requestedOwner === importingOwner);
    await importFinished;
    requestedOwner = activeOwner;
    await hydrateAccountStorageOwner(activeOwner);
    releaseImport();
    await importPromise;

    expect(getAccountStorageOwner()).toBe(activeOwner);
    expect(peekLeaderboardIdentity()?.id).toBe(activeIdentity.id);
    expect(peekLeaderboardIdentity()?.id).not.toBe(sourceIdentity.id);
  });
});
