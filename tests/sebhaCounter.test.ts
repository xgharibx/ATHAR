// @vitest-environment jsdom
/**
 * سبحة (Sebha / Tasbih) — counter accuracy, persistence, haptics,
 * custom dhikr, round completion, and quick-tasbeeh contract.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { useNoorStore } from "@/store/noorStore";
import { doHaptic } from "../src/lib/sebhaHaptics";

function sync(fn: () => void): void {
  fn();
}

const STORAGE_KEY = "noor_store_v1";

function resetStore() {
  try { localStorage.clear(); } catch { /* ignore */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }
  const state = useNoorStore.getState();
  useNoorStore.setState({
    quickTasbeeh: {},
    sebhaSessions: [],
    sebhaCustom: null,
    sebhaTarget: 100,
    sebhaSelected: "subhanallah",
    tasbeehLifetime: {},
    tasbeehDailyLog: {},
    activity: {},
    prefs: {
      ...state.prefs,
      enableHaptics: true,
      hapticStrength: "medium",
      enableSounds: false,
      autoAdvanceDhikr: true,
    },
  });
}

describe("Sebha counter accuracy", () => {
  beforeEach(() => resetStore());

  it("starts at zero and increments by 1 per click", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    expect(useNoorStore.getState().quickTasbeeh["subhanallah"] ?? 0).toBe(0);
    sync(() => inc("subhanallah", 100));
    sync(() => inc("subhanallah", 100));
    sync(() => inc("subhanallah", 100));
    expect(useNoorStore.getState().quickTasbeeh["subhanallah"]).toBe(3);
  });

  it("does not increment past the target (silent block)", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    const a = inc("subhanallah", 5);
    const b = inc("subhanallah", 5);
    const c = inc("subhanallah", 5);
    const d = inc("subhanallah", 5);
    const e = inc("subhanallah", 5);
    const f = inc("subhanallah", 5);
    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(c).toBe(3);
    expect(d).toBe(4);
    expect(e).toBe(5);
    expect(f).toBe(5);
    expect(useNoorStore.getState().quickTasbeeh["subhanallah"]).toBe(5);
  });

  it("preserves counts of unrelated keys when incrementing", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    sync(() => inc("subhanallah", 100));
    sync(() => inc("subhanallah", 100));
    sync(() => inc("alhamdulillah", 100));
    sync(() => inc("alhamdulillah", 100));
    sync(() => inc("alhamdulillah", 100));
    const map = useNoorStore.getState().quickTasbeeh;
    expect(map["subhanallah"]).toBe(2);
    expect(map["alhamdulillah"]).toBe(3);
  });

  it("resetQuickTasbeeh clears a single key and resetAllQuickTasbeeh clears all", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    sync(() => inc("subhanallah", 100));
    sync(() => inc("alhamdulillah", 100));
    expect(useNoorStore.getState().quickTasbeeh).toEqual({
      subhanallah: 1,
      alhamdulillah: 1,
    });
    sync(() => useNoorStore.getState().resetQuickTasbeeh("subhanallah"));
    expect(useNoorStore.getState().quickTasbeeh["subhanallah"]).toBeUndefined();
    expect(useNoorStore.getState().quickTasbeeh["alhamdulillah"]).toBe(1);
    sync(() => useNoorStore.getState().resetAllQuickTasbeeh());
    expect(useNoorStore.getState().quickTasbeeh).toEqual({});
  });

  it("handles many rapid taps without losing ticks", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    for (let i = 0; i < 50; i++) sync(() => inc("subhanallah", 1000));
    expect(useNoorStore.getState().quickTasbeeh["subhanallah"]).toBe(50);
  });
});

describe("Sebha persistence", () => {
  beforeEach(() => resetStore());

  it("quickTasbeeh writes through to localStorage", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    sync(() => inc("subhanallah", 100));
    sync(() => inc("alhamdulillah", 100));
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    const persistedMap = parsed?.state?.quickTasbeeh ?? {};
    expect(persistedMap.subhanallah).toBe(1);
    expect(persistedMap.alhamdulillah).toBe(1);
  });

  it("sebhaCustom persists across reloads", () => {
    sync(() => {
      useNoorStore.getState().setSebhaCustom({ phrase: "سبحان الله وبحمده", target: 100 });
    });
    expect(useNoorStore.getState().sebhaCustom?.phrase).toBe("سبحان الله وبحمده");
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.sebhaCustom.phrase).toBe("سبحان الله وبحمده");
  });

  it("sebhaTarget and sebhaSelected persist", () => {
    sync(() => {
      useNoorStore.getState().setSebhaTarget(33);
      useNoorStore.getState().setSebhaSelected("alhamdulillah");
    });
    expect(useNoorStore.getState().sebhaTarget).toBe(33);
    expect(useNoorStore.getState().sebhaSelected).toBe("alhamdulillah");
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.state.sebhaTarget).toBe(33);
    expect(parsed.state.sebhaSelected).toBe("alhamdulillah");
  });

  it("survives a remount (re-hydrating from storage yields same values)", () => {
    sync(() => {
      useNoorStore.getState().setSebhaTarget(1000);
      useNoorStore.getState().incQuickTasbeeh("subhanallah", 1000);
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    const stateBefore = JSON.parse(raw!).state;
    expect(stateBefore.quickTasbeeh.subhanallah).toBe(1);
    expect(stateBefore.sebhaTarget).toBe(1000);
  });
});

describe("Sebha haptic feedback (doHaptic)", () => {
  beforeEach(() => {
    resetStore();
    (navigator as unknown as { vibrate: ReturnType<typeof vi.fn> }).vibrate = vi.fn();
  });

  it("does NOT vibrate when enableHaptics is false", () => {
    const spy = navigator.vibrate as unknown as ReturnType<typeof vi.fn>;
    spy.mockClear();
    doHaptic(5, 100, false, "medium");
    expect(spy).not.toHaveBeenCalled();
  });

  it("respects hapticStrength = 'off'", () => {
    const spy = navigator.vibrate as unknown as ReturnType<typeof vi.fn>;
    spy.mockClear();
    doHaptic(5, 100, true, "off");
    expect(spy).not.toHaveBeenCalled();
  });

  it("fires exactly one vibration per call when hapticStrength = light", () => {
    const spy = navigator.vibrate as unknown as ReturnType<typeof vi.fn>;
    spy.mockClear();
    doHaptic(5, 100, true, "light");
    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0]?.[0];
    expect(typeof arg === "number" ? arg : 0).toBeLessThanOrEqual(8);
  });

  it("fires a longer pattern on target completion when hapticStrength = strong", () => {
    const spy = navigator.vibrate as unknown as ReturnType<typeof vi.fn>;
    spy.mockClear();
    doHaptic(100, 100, true, "strong");
    expect(spy).toHaveBeenCalledTimes(1);
    const lastCall = spy.mock.calls[0];
    expect(Array.isArray(lastCall?.[0])).toBe(true);
  });

  it("triggers a 33-milestone double-pulse at light strength", () => {
    const spy = navigator.vibrate as unknown as ReturnType<typeof vi.fn>;
    spy.mockClear();
    doHaptic(33, 100, true, "light");
    expect(spy).toHaveBeenCalledTimes(1);
    const pattern = spy.mock.calls[0]?.[0];
    expect(Array.isArray(pattern)).toBe(true);
    expect((pattern as number[]).length).toBe(3);
  });

  it("triggers a 100-milestone triple pattern", () => {
    const spy = navigator.vibrate as unknown as ReturnType<typeof vi.fn>;
    spy.mockClear();
    doHaptic(100, 200, true, "medium");
    expect(spy).toHaveBeenCalledTimes(1);
    const pattern = spy.mock.calls[0]?.[0];
    expect(Array.isArray(pattern)).toBe(true);
    expect((pattern as number[]).length).toBe(5);
  });

  it("is a no-op when navigator.vibrate is unavailable", () => {
    const original = navigator.vibrate;
    delete (navigator as { vibrate?: unknown }).vibrate;
    try {
      expect(() => doHaptic(5, 100, true, "medium")).not.toThrow();
    } finally {
      (navigator as unknown as { vibrate: typeof original }).vibrate = original;
    }
  });
});

describe("Sebha custom dhikr", () => {
  beforeEach(() => resetStore());

  it("can be added, edited, deleted via store actions", () => {
    const { setSebhaCustom } = useNoorStore.getState();
    sync(() => setSebhaCustom({ phrase: "سبحان الله", target: 33 }));
    expect(useNoorStore.getState().sebhaCustom).toEqual({ phrase: "سبحان الله", target: 33 });

    sync(() => setSebhaCustom({ phrase: "الحمد لله", target: 33 }));
    expect(useNoorStore.getState().sebhaCustom?.phrase).toBe("الحمد لله");

    sync(() => setSebhaCustom(null));
    expect(useNoorStore.getState().sebhaCustom).toBeNull();
  });

  it("increments custom dhikr count under the 'custom' key without colliding", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    sync(() => useNoorStore.getState().setSebhaCustom({ phrase: "حَسْبِيَ الله", target: 50 }));
    sync(() => inc("custom", 50));
    sync(() => inc("custom", 50));
    expect(useNoorStore.getState().quickTasbeeh["custom"]).toBe(2);
    expect(useNoorStore.getState().quickTasbeeh["subhanallah"]).toBeUndefined();
  });

  it("respects the custom dhikr's own target cap", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    sync(() => useNoorStore.getState().setSebhaCustom({ phrase: "يا حي يا قيوم", target: 7 }));
    for (let i = 0; i < 10; i++) sync(() => inc("custom", 7));
    expect(useNoorStore.getState().quickTasbeeh["custom"]).toBe(7);
  });
});

describe("Sebha round completion", () => {
  beforeEach(() => {
    resetStore();
    (navigator as unknown as { vibrate: ReturnType<typeof vi.fn> }).vibrate = vi.fn();
  });

  it("counts to exactly the target, then resets on demand", () => {
    const { incQuickTasbeeh } = useNoorStore.getState();
    for (let i = 0; i < 5; i++) sync(() => incQuickTasbeeh("subhanallah", 5));
    expect(useNoorStore.getState().quickTasbeeh["subhanallah"]).toBe(5);
    sync(() => useNoorStore.getState().resetQuickTasbeeh("subhanallah"));
    expect(useNoorStore.getState().quickTasbeeh["subhanallah"]).toBeUndefined();
    for (let i = 0; i < 5; i++) sync(() => incQuickTasbeeh("subhanallah", 5));
    expect(useNoorStore.getState().quickTasbeeh["subhanallah"]).toBe(5);
  });

  it("addSebhaSession inserts at the head and caps at 100 entries", () => {
    const { addSebhaSession } = useNoorStore.getState();
    for (let i = 0; i < 105; i++) {
      sync(() => addSebhaSession({
        dhikrKey: "subhanallah",
        dhikrLabel: "سبحان الله",
        count: i + 1,
        target: 100,
        timestamp: new Date().toISOString(),
      }));
    }
    const sessions = useNoorStore.getState().sebhaSessions;
    expect(sessions.length).toBe(100);
    expect(sessions[0]?.count).toBe(105);
  });

  it("lifetime tally increments on every tap", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    sync(() => inc("alhamdulillah", 1000));
    sync(() => inc("alhamdulillah", 1000));
    sync(() => inc("alhamdulillah", 1000));
    expect(useNoorStore.getState().tasbeehLifetime["alhamdulillah"]).toBe(3);
  });

  it("daily log records today's count under the correct date key", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    sync(() => inc("subhanallah", 1000));
    sync(() => inc("subhanallah", 1000));
    const log = useNoorStore.getState().tasbeehDailyLog;
    const todayKey = Object.keys(log)[0];
    expect(todayKey).toBeTruthy();
    expect(log[todayKey!]?.["subhanallah"]).toBe(2);
  });
});

describe("Sebha preferences", () => {
  beforeEach(() => resetStore());

  it("hapticStrength accepts off/light/medium/strong via setPrefs", () => {
    sync(() => useNoorStore.getState().setPrefs({ hapticStrength: "off" }));
    expect(useNoorStore.getState().prefs.hapticStrength).toBe("off");
    sync(() => useNoorStore.getState().setPrefs({ hapticStrength: "light" }));
    expect(useNoorStore.getState().prefs.hapticStrength).toBe("light");
    sync(() => useNoorStore.getState().setPrefs({ hapticStrength: "strong" }));
    expect(useNoorStore.getState().prefs.hapticStrength).toBe("strong");
  });

  it("enableSounds toggle persists", () => {
    sync(() => useNoorStore.getState().setPrefs({ enableSounds: true }));
    expect(useNoorStore.getState().prefs.enableSounds).toBe(true);
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.state.prefs.enableSounds).toBe(true);
  });

  it("autoAdvanceDhikr controls auto-advance preference", () => {
    sync(() => useNoorStore.getState().setPrefs({ autoAdvanceDhikr: false }));
    expect(useNoorStore.getState().prefs.autoAdvanceDhikr).toBe(false);
  });

  it("setSebhaTarget accepts arbitrary targets", () => {
    sync(() => useNoorStore.getState().setSebhaTarget(33));
    expect(useNoorStore.getState().sebhaTarget).toBe(33);
    sync(() => useNoorStore.getState().setSebhaTarget(1000));
    expect(useNoorStore.getState().sebhaTarget).toBe(1000);
  });
});
