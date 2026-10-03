export type AccountStorageOwner = "local" | `user:${string}`;

type SyncStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

let activeOwner: AccountStorageOwner = "local";
let suspendedWrites = 0;
let accountOwnerTransitionInProgress = false;

export function normalizeAccountStorageOwner(
  userId: string | null | undefined,
): AccountStorageOwner {
  const normalizedId = userId?.trim();
  return normalizedId ? `user:${normalizedId}` : "local";
}

export function getAccountStorageOwner(): AccountStorageOwner {
  return activeOwner;
}

export function beginAccountStorageOwnerTransition(): void {
  accountOwnerTransitionInProgress = true;
}

export function completeAccountStorageOwnerTransition(): void {
  accountOwnerTransitionInProgress = false;
}

export function isAccountStorageOwnerTransitionInProgress(): boolean {
  return accountOwnerTransitionInProgress;
}

export function setAccountStorageOwner(owner: AccountStorageOwner): void {
  activeOwner = owner;
}

export async function withAccountStorageWritesPaused<T>(
  operation: () => T | Promise<T>,
): Promise<T> {
  suspendedWrites += 1;
  try {
    return await operation();
  } finally {
    suspendedWrites -= 1;
  }
}

export function accountScopedStorageKey(
  key: string,
  owner: AccountStorageOwner = activeOwner,
): string {
  if (owner === "local") return key;
  return `${key}::${encodeURIComponent(owner.slice("user:".length))}`;
}

export function accountScopedDatabaseName(
  name: string,
  owner: AccountStorageOwner = activeOwner,
): string {
  if (owner === "local") return name;
  return `${name}::${encodeURIComponent(owner.slice("user:".length))}`;
}

/**
 * Adapts a synchronous Storage-like backend to the current account owner.
 * The owner is read on every operation so stores can keep a stable adapter
 * while an authenticated session changes.
 */
export function createAccountScopedStorage(storage: SyncStorage): SyncStorage {
  return {
    getItem(key) {
      return storage.getItem(accountScopedStorageKey(key));
    },
    setItem(key, value) {
      if (suspendedWrites > 0) return;
      storage.setItem(accountScopedStorageKey(key), value);
    },
    removeItem(key) {
      if (suspendedWrites > 0) return;
      storage.removeItem(accountScopedStorageKey(key));
    },
  };
}

/** Lazily accesses browser storage so importing this module is SSR-safe. */
export const accountScopedLocalStorage: SyncStorage = {
  getItem(key) {
    if (typeof globalThis.localStorage === "undefined") return null;
    return globalThis.localStorage.getItem(accountScopedStorageKey(key));
  },
  setItem(key, value) {
    if (suspendedWrites > 0) return;
    if (typeof globalThis.localStorage === "undefined") return;
    globalThis.localStorage.setItem(accountScopedStorageKey(key), value);
  },
  removeItem(key) {
    if (suspendedWrites > 0) return;
    if (typeof globalThis.localStorage === "undefined") return;
    globalThis.localStorage.removeItem(accountScopedStorageKey(key));
  },
};
