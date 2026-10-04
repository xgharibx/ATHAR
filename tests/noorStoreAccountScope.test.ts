// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hydrateAccountStorageOwner, useNoorStore } from "@/store/noorStore";
import { getAccountStorageOwner, setAccountStorageOwner } from "@/lib/accountStorageScope";

function seedStore(key: string, favorites: Record<string, boolean>) {
  localStorage.setItem(key, JSON.stringify({
    state: { favorites },
    version: 33,
  }));
}

describe("Noor store account scope", () => {
  beforeEach(() => {
    localStorage.clear();
    setAccountStorageOwner("local");
  });

  afterEach(async () => {
    localStorage.clear();
    setAccountStorageOwner("local");
  });

  it("starts with defaults until a storage owner is explicitly hydrated", () => {
    seedStore("noor_store_v1", { "legacy:1": true });
    expect(useNoorStore.persist.hasHydrated()).toBe(false);
    expect(useNoorStore.getState().favorites).toEqual({});
  });

  it("rehydrates each account independently and restores legacy data only for local", async () => {
    seedStore("noor_store_v1", { "legacy:1": true });
    seedStore("noor_store_v1::user-a", { "account-a:1": true });
    seedStore("noor_store_v1::user-b", { "account-b:1": true });

    await hydrateAccountStorageOwner("user:user-a");
    expect(useNoorStore.getState().favorites).toEqual({ "account-a:1": true });

    await hydrateAccountStorageOwner("user:user-b");
    expect(useNoorStore.getState().favorites).toEqual({ "account-b:1": true });

    await hydrateAccountStorageOwner("user:user-a");
    expect(useNoorStore.getState().favorites).toEqual({ "account-a:1": true });

    await hydrateAccountStorageOwner("local");
    expect(useNoorStore.getState().favorites).toEqual({ "legacy:1": true });
  });

  it("migrates an existing version-33 account to the default-off reading preference", async () => {
    localStorage.setItem("noor_store_v1::user-a", JSON.stringify({
      state: { prefs: { theme: "midnight" }, favorites: { "account-a:1": true } },
      version: 33,
    }));

    await hydrateAccountStorageOwner("user:user-a");

    expect(useNoorStore.getState().prefs.clearReading).toBe(false);
    expect(useNoorStore.getState().prefs.theme).toBe("midnight");
    expect(useNoorStore.getState().favorites).toEqual({ "account-a:1": true });
    expect(JSON.parse(localStorage.getItem("noor_store_v1::user-a") ?? "{}").version).toBe(34);
  });

  it("restores the previous in-memory owner when the destination snapshot is corrupt", async () => {
    seedStore("noor_store_v1::user-a", { "account-a:1": true });
    await hydrateAccountStorageOwner("user:user-a");
    localStorage.setItem("noor_store_v1::user-b", "not valid JSON");

    await expect(hydrateAccountStorageOwner("user:user-b")).rejects.toThrow();
    expect(getAccountStorageOwner()).toBe("user:user-a");
    expect(useNoorStore.getState().favorites).toEqual({ "account-a:1": true });
  });

});
