import { afterEach, describe, expect, it } from "vitest";

import {
  accountScopedDatabaseName,
  accountScopedStorageKey,
  createAccountScopedStorage,
  getAccountStorageOwner,
  normalizeAccountStorageOwner,
  setAccountStorageOwner,
} from "@/lib/accountStorageScope";

afterEach(() => setAccountStorageOwner("local"));

describe("account storage scope", () => {
  it("keeps unscoped legacy storage assigned to the signed-out local owner", () => {
    expect(accountScopedStorageKey("noor_store_v1", "local")).toBe("noor_store_v1");
    expect(accountScopedDatabaseName("athar-hadith-v1", "local")).toBe("athar-hadith-v1");
  });

  it("uses distinct stable storage names for each authenticated account", () => {
    expect(accountScopedStorageKey("noor_store_v1", "user:user-a"))
      .not.toBe(accountScopedStorageKey("noor_store_v1", "user:user-b"));
    expect(accountScopedDatabaseName("athar-companion-v1", "user:user-a"))
      .not.toBe(accountScopedDatabaseName("athar-companion-v1", "user:user-b"));
  });

  it("encodes owner IDs without changing the account identity", () => {
    const owner = normalizeAccountStorageOwner(" user/one@example.com ");
    expect(owner).toBe("user:user/one@example.com");
    expect(accountScopedStorageKey("profile", owner)).toBe("profile::user%2Fone%40example.com");
  });

  it("exposes only the explicitly activated scope to dynamic stores", () => {
    setAccountStorageOwner("user:user-a");
    expect(getAccountStorageOwner()).toBe("user:user-a");
    expect(accountScopedStorageKey("notes")).toBe("notes::user-a");
    setAccountStorageOwner("user:user-b");
    expect(getAccountStorageOwner()).toBe("user:user-b");
    expect(accountScopedStorageKey("notes")).toBe("notes::user-b");
  });

  it("routes a storage adapter through the active owner and keeps legacy data local", () => {
    const values = new Map<string, string>();
    const storage = createAccountScopedStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: (key) => { values.delete(key); },
    });

    storage.setItem("noor_store_v1", "legacy local data");
    setAccountStorageOwner("user:user-a");
    storage.setItem("noor_store_v1", "account A");
    setAccountStorageOwner("user:user-b");
    storage.setItem("noor_store_v1", "account B");

    expect(storage.getItem("noor_store_v1")).toBe("account B");
    setAccountStorageOwner("user:user-a");
    expect(storage.getItem("noor_store_v1")).toBe("account A");
    setAccountStorageOwner("local");
    expect(storage.getItem("noor_store_v1")).toBe("legacy local data");
  });
});
