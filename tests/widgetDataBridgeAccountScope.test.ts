// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nativeState = vi.hoisted(() => ({
  values: new Map<string, string>(),
  operations: [] as string[],
  nextSetGate: null as null | { started: () => void; wait: Promise<void> },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => "android",
  },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      const gate = nativeState.nextSetGate;
      if (gate) {
        nativeState.nextSetGate = null;
        gate.started();
        await gate.wait;
      }
      nativeState.values.set(key, value);
      nativeState.operations.push(`set:${key}`);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      nativeState.values.delete(key);
      nativeState.operations.push(`remove:${key}`);
    }),
  },
}));

vi.mock("@/lib/widgetRefresh", () => ({
  refreshHomeWidgets: vi.fn(async () => {
    nativeState.operations.push("refresh");
  }),
}));

import { accountScopedLocalStorage, getAccountStorageOwner, setAccountStorageOwner } from "@/lib/accountStorageScope";
import { refreshHomeWidgets } from "@/lib/widgetRefresh";
import { syncQiblaWidget } from "@/lib/widgetDataBridge";

const QIBLA_KEY = "noor_widget_qibla_v1";

describe("Qibla widget account scope", () => {
  beforeEach(() => {
    localStorage.clear();
    nativeState.values.clear();
    nativeState.operations.length = 0;
    nativeState.nextSetGate = null;
    setAccountStorageOwner("local");
    vi.mocked(refreshHomeWidgets).mockClear();
  });

  afterEach(() => {
    localStorage.clear();
    nativeState.values.clear();
    nativeState.operations.length = 0;
    nativeState.nextSetGate = null;
    setAccountStorageOwner("local");
  });

  it("clears account A's native location and refreshes the placeholder after switching to B without coordinates", async () => {
    setAccountStorageOwner("user:account-a");
    accountScopedLocalStorage.setItem("noor_prayer_coords_v1", JSON.stringify({ lat: 40.7128, lng: -74.006 }));
    await syncQiblaWidget();
    expect(JSON.parse(nativeState.values.get(QIBLA_KEY) ?? "null")).toMatchObject({ lat: 40.7128, lng: -74.006 });

    setAccountStorageOwner("user:account-b");
    accountScopedLocalStorage.setItem(QIBLA_KEY, JSON.stringify({ lat: 40.7128, lng: -74.006 }));
    await syncQiblaWidget();

    expect(nativeState.values.has(QIBLA_KEY)).toBe(false);
    expect(accountScopedLocalStorage.getItem(QIBLA_KEY)).toBeNull();
    expect(getAccountStorageOwner()).toBe("user:account-b");
    expect(refreshHomeWidgets).toHaveBeenCalledTimes(1);
    expect(nativeState.operations.slice(-2)).toEqual([`remove:${QIBLA_KEY}`, "refresh"]);
  });

  it("keeps a delayed account A write from overwriting account B's widget clear", async () => {
    let signalWriteStarted!: () => void;
    let releaseWrite!: () => void;
    const writeStarted = new Promise<void>((resolve) => {
      signalWriteStarted = resolve;
    });
    const writeGate = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });

    setAccountStorageOwner("user:account-a");
    accountScopedLocalStorage.setItem("noor_prayer_coords_v1", JSON.stringify({ lat: 40.7128, lng: -74.006 }));
    nativeState.nextSetGate = { started: signalWriteStarted, wait: writeGate };
    const accountASync = syncQiblaWidget();
    await writeStarted;

    setAccountStorageOwner("user:account-b");
    accountScopedLocalStorage.setItem(QIBLA_KEY, JSON.stringify({ lat: 40.7128, lng: -74.006 }));
    let accountBSyncComplete = false;
    const accountBSync = syncQiblaWidget().then(() => {
      accountBSyncComplete = true;
    });

    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(accountBSyncComplete).toBe(false);
      expect(nativeState.operations).not.toContain(`remove:${QIBLA_KEY}`);

      releaseWrite();
      await Promise.all([accountASync, accountBSync]);

      expect(nativeState.values.has(QIBLA_KEY)).toBe(false);
      expect(accountScopedLocalStorage.getItem(QIBLA_KEY)).toBeNull();
      expect(nativeState.operations.slice(-2)).toEqual([`remove:${QIBLA_KEY}`, "refresh"]);

      setAccountStorageOwner("user:account-a");
      expect(accountScopedLocalStorage.getItem(QIBLA_KEY)).not.toBeNull();
    } finally {
      releaseWrite();
      await Promise.allSettled([accountASync, accountBSync]);
    }
  });
});
