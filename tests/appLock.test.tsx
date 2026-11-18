// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  available: true,
  authenticate: vi.fn(async () => ({ success: true })),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
  registerPlugin: () => ({
    status: async () => ({ available: native.available, biometryType: "face" }),
    authenticate: native.authenticate,
  }),
}));

import { AppLockGate } from "@/components/security/AppLockGate";
import { APP_LOCK_GRACE_MS, appLockMethodLabel, needsUnlockAfter } from "@/lib/appLock";
import { useNoorStore } from "@/store/noorStore";

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let visibility: DocumentVisibilityState = "visible";

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(createElement(AppLockGate)));
  await act(async () => { await vi.advanceTimersByTimeAsync(10); });
}

async function setVisibility(next: DocumentVisibilityState) {
  visibility = next;
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  await act(async () => { await vi.advanceTimersByTimeAsync(10); });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  visibility = "visible";
  native.available = true;
  native.authenticate.mockReset();
  native.authenticate.mockResolvedValue({ success: true });
  useNoorStore.getState().setPrefs({ biometricLock: true });
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  useNoorStore.getState().setPrefs({ biometricLock: false });
});

describe("app lock", () => {
  it("asks again only after a minute away", () => {
    expect(needsUnlockAfter(APP_LOCK_GRACE_MS - 1)).toBe(false);
    expect(needsUnlockAfter(APP_LOCK_GRACE_MS)).toBe(true);
    expect(appLockMethodLabel("face")).toBe("بصمة الوجه");
  });

  it("covers the app on launch until the phone confirms its owner", async () => {
    native.authenticate.mockResolvedValueOnce({ success: false });
    await mount();
    expect(native.authenticate).toHaveBeenCalledOnce();
    expect(container!.textContent).toContain("أثر مقفل");
    expect(container!.textContent).toContain("بصمة الوجه");
    const open = Array.from(container!.querySelectorAll("button")).find((b) => b.textContent?.includes("فتح أثر"))!;
    await act(async () => { open.click(); });
    expect(container!.textContent).toBe("");
  });

  it("hides the screen in the background, and asks again only after a minute", async () => {
    await mount();
    expect(container!.textContent).toBe("");

    await setVisibility("hidden");
    expect(container!.querySelector("[data-no-swipe]")).not.toBeNull();
    await setVisibility("visible");
    expect(container!.textContent).toBe("");
    expect(native.authenticate).toHaveBeenCalledTimes(1);

    await setVisibility("hidden");
    await act(async () => { vi.setSystemTime(Date.now() + APP_LOCK_GRACE_MS + 1000); });
    native.authenticate.mockResolvedValueOnce({ success: false });
    await setVisibility("visible");
    expect(native.authenticate).toHaveBeenCalledTimes(2);
    expect(container!.textContent).toContain("أثر مقفل");
  });

  it("never traps someone whose phone has no passcode or biometrics any more", async () => {
    native.available = false;
    await mount();
    expect(container!.textContent).toBe("");
    expect(native.authenticate).not.toHaveBeenCalled();
  });

  it("does nothing when the lock is off", async () => {
    useNoorStore.getState().setPrefs({ biometricLock: false });
    await mount();
    expect(container!.textContent).toBe("");
    expect(native.authenticate).not.toHaveBeenCalled();
  });
});
