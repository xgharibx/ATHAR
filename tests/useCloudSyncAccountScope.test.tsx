// @vitest-environment jsdom
import "fake-indexeddb/auto";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: { session: null as { user: { id: string } } | null, configured: false, loading: true },
  sessionReadHangs: false,
  startCloudSync: vi.fn(),
  stopCloudSync: vi.fn(),
}));

vi.mock("@/hooks/useAuthSession", () => ({ useAuthSession: () => mocks.auth }));
vi.mock("@/lib/authClient", () => ({
  getPersistedAccountStorageOwner: () => mocks.auth.session ? `user:${mocks.auth.session.user.id}` : "local",
  getSession: async () => mocks.sessionReadHangs
    ? new Promise<null>((_resolve, reject) => {
      setTimeout(() => reject(new Error("تعذّر التحقق من جلسة الحساب")), 5_000);
    })
    : mocks.auth.session,
}));
vi.mock("@/lib/syncClient", () => ({
  getSyncStatus: () => ({ phase: "idle", pending: false, lastSyncedAt: null }),
  startCloudSync: mocks.startCloudSync,
  stopCloudSync: mocks.stopCloudSync,
  subscribeSyncStatus: () => () => {},
}));

import { normalizeAccountStorageOwner, setAccountStorageOwner } from "@/lib/accountStorageScope";
import { useCloudSync, type AccountScopeState } from "@/hooks/useCloudSync";
import { hydrateAccountStorageOwner, useNoorStore } from "@/store/noorStore";

let root: Root | null = null;
let scope: AccountScopeState | null = null;

function Harness() {
  scope = useCloudSync();
  return null;
}

function seedLocalFavorites(favorites: Record<string, boolean>) {
  localStorage.setItem("noor_store_v1", JSON.stringify({ state: { favorites }, version: 33 }));
}

async function renderAndSettle(isSettled: () => boolean) {
  await act(async () => { root?.render(<Harness />); });
  const deadline = Date.now() + 5_000;
  while (!isSettled() && Date.now() < deadline) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 25)); });
  }
  expect(isSettled()).toBe(true);
}

describe("auth gate and account storage ownership", () => {
  beforeEach(async () => {
    localStorage.clear();
    setAccountStorageOwner("local");
    await hydrateAccountStorageOwner("local");
    seedLocalFavorites({ "local:1": true });
    await hydrateAccountStorageOwner("local");
    mocks.auth = { session: { user: { id: "synthetic-a" } }, configured: true, loading: false };
    mocks.sessionReadHangs = false;
    mocks.startCloudSync.mockClear();
    mocks.stopCloudSync.mockClear();
    scope = null;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    root = createRoot(document.createElement("div"));
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = null;
    scope = null;
    localStorage.clear();
    setAccountStorageOwner("local");
    mocks.auth = { session: null, configured: false, loading: true };
    vi.useRealTimers();
  });

  it("requires an import decision and keeps A's data out of B while retaining local recovery", async () => {
    await renderAndSettle(() => Boolean(scope?.error || (scope?.needsImportChoice && !scope.checkingImport)));
    expect(scope?.needsImportChoice).toBe(true);
    expect(mocks.startCloudSync).not.toHaveBeenCalled();
    expect(useNoorStore.getState().favorites).toEqual({});

    await act(async () => scope?.chooseImport("copy", false));
    expect(normalizeAccountStorageOwner("synthetic-a")).toBe("user:synthetic-a");
    expect(useNoorStore.getState().favorites).toEqual({ "local:1": true });
    expect(mocks.startCloudSync).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("noor_store_v1")).not.toBeNull();

    mocks.auth = { session: { user: { id: "synthetic-b" } }, configured: true, loading: false };
    await renderAndSettle(() => Boolean(scope?.error || (scope?.needsImportChoice && !scope.checkingImport)));
    expect(scope?.needsImportChoice).toBe(true);
    expect(useNoorStore.getState().favorites).toEqual({});
    expect(mocks.startCloudSync).toHaveBeenCalledTimes(1);

    await act(async () => scope?.chooseImport("keep"));
    expect(useNoorStore.getState().favorites).toEqual({});
    expect(mocks.startCloudSync).toHaveBeenCalledTimes(2);

    mocks.auth = { session: { user: { id: "synthetic-a" } }, configured: true, loading: false };
    await renderAndSettle(() => Boolean(scope?.error || scope?.ready));
    expect(scope?.ready).toBe(true);
    expect(useNoorStore.getState().favorites).toEqual({ "local:1": true });
  });

  it("hydrates the saved owner's data without waiting for a network session read", async () => {
    mocks.sessionReadHangs = true;
    await renderAndSettle(() => Boolean(scope?.needsImportChoice || scope?.ready));
    expect(scope?.error).toBeNull();
    expect(useNoorStore.getState().favorites).toEqual({});
    expect(mocks.startCloudSync).not.toHaveBeenCalled();
  });
});
