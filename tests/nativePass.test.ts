// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const plugin = {
  setBackSwipe: vi.fn(async () => undefined),
  copyText: vi.fn(async () => ({ systemConfirms: true })),
  pickDate: vi.fn(async () => ({ value: "2026-11-20" })),
  pickTime: vi.fn(async () => ({ value: "05:30" })),
  setPullToRefresh: vi.fn(async () => undefined),
  endPullToRefresh: vi.fn(async () => undefined),
  vaultWrite: vi.fn(async () => undefined),
  vaultRemove: vi.fn(async () => undefined),
  vaultClear: vi.fn(async () => undefined),
  addListener: vi.fn(async () => ({ remove: vi.fn() })),
};
let native = true;
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => native,
    isPluginAvailable: () => native,
    getPlatform: () => (native ? "ios" : "web"),
  },
  registerPlugin: () => plugin,
}));

describe("native controls", () => {
  beforeEach(() => {
    native = true;
    Object.values(plugin).forEach((f) => f.mockClear());
  });

  it("uses the phone's pickers in the app and offers «مسح» when there is a date", async () => {
    const { pickNativeDate, pickNativeTime } = await import("@/lib/nativeUI");
    expect(await pickNativeDate({ value: "2026-11-19", min: "2026-01-01" })).toBe("2026-11-20");
    expect(plugin.pickDate).toHaveBeenCalledWith({ value: "2026-11-19", min: "2026-01-01", clearable: true });
    expect(await pickNativeTime("05:00")).toBe("05:30");
    plugin.pickDate.mockRejectedValueOnce(new Error("cancelled"));
    expect(await pickNativeDate({})).toBeNull();
  });

  it("keeps the web pickers in a browser", async () => {
    native = false;
    const { pickNativeDate, pickNativeTime } = await import("@/lib/nativeUI");
    expect(await pickNativeDate({})).toBeUndefined();
    expect(await pickNativeTime()).toBeUndefined();
  });

  it("copies natively and reports when the system confirmed it", async () => {
    const { writeClipboard } = await import("@/lib/nativeUI");
    expect(await writeClipboard("ذكر")).toBe(true);
    expect(plugin.copyText).toHaveBeenCalledWith({ text: "ذكر" });
  });

  it("turns the back swipe off and on", async () => {
    const { setBackSwipe } = await import("@/lib/nativeUI");
    await setBackSwipe(false);
    expect(plugin.setBackSwipe).toHaveBeenCalledWith({ enabled: false });
  });
});

describe("saved-data copy", () => {
  afterEach(() => vi.useRealTimers());

  it("mirrors saves shortly after, removals at once, and a clear entirely", async () => {
    vi.useFakeTimers();
    const { startNativeVault, __test } = await import("@/lib/nativeVault");
    startNativeVault();
    localStorage.setItem("noor_store_v1", "{\"a\":1}");
    localStorage.setItem("scroll_y:/quran", "120");
    expect(plugin.vaultWrite).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1600);
    expect(plugin.vaultWrite).toHaveBeenCalledWith({ key: "noor_store_v1", value: "{\"a\":1}" });
    expect(plugin.vaultWrite).not.toHaveBeenCalledWith(expect.objectContaining({ key: "scroll_y:/quran" }));
    localStorage.removeItem("noor_store_v1");
    expect(plugin.vaultRemove).toHaveBeenCalledWith({ key: "noor_store_v1" });
    localStorage.clear();
    expect(plugin.vaultClear).toHaveBeenCalled();
    expect(__test.pending.size).toBe(0);
  });
});

describe("keyboard inset", () => {
  it("publishes how much of the screen the keyboard covers", async () => {
    const listeners: Record<string, () => void> = {};
    const vv = { height: 844, offsetTop: 0, addEventListener: (e: string, cb: () => void) => (listeners[e] = cb), removeEventListener: () => {} };
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 844, configurable: true });
    const { startKeyboardInset } = await import("@/lib/keyboardInset");
    startKeyboardInset();
    expect(document.documentElement.style.getPropertyValue("--kb")).toBe("0px");
    vv.height = 500;
    listeners.resize!();
    expect(document.documentElement.style.getPropertyValue("--kb")).toBe("344px");
    expect(document.documentElement.hasAttribute("data-keyboard")).toBe(true);
  });
});
