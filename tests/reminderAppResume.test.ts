// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { listenForAppResume } from "@/lib/reminderAppResume";

function setVisibilityState(state: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: state,
  });
}

describe("reminder schedule resume listener", () => {
  afterEach(() => {
    setVisibilityState("visible");
  });

  it("reconciles once when the app returns to the foreground", async () => {
    const reconcile = vi.fn();
    const unsubscribe = listenForAppResume(reconcile);

    setVisibilityState("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(reconcile).not.toHaveBeenCalled();

    setVisibilityState("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
    await Promise.resolve();

    expect(reconcile).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("uses window focus as a resume signal when visibility did not change", async () => {
    const reconcile = vi.fn();
    const unsubscribe = listenForAppResume(reconcile);

    window.dispatchEvent(new Event("focus"));
    await Promise.resolve();

    expect(reconcile).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("reconciles when the Android activity signals onResume", async () => {
    const reconcile = vi.fn();
    const unsubscribe = listenForAppResume(reconcile);

    window.dispatchEvent(new Event("athar-app-resume"));
    await Promise.resolve();

    expect(reconcile).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stops reconciling after its listeners are removed", async () => {
    const reconcile = vi.fn();
    const unsubscribe = listenForAppResume(reconcile);
    unsubscribe();

    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();

    expect(reconcile).not.toHaveBeenCalled();
  });
});
