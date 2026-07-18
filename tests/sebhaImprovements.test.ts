// @vitest-environment jsdom
/**
 * Tests for the Sebha improvements batch: custom-dhikr list CRUD,
 * streak tracking, daily goal, Asma Husna counter, sound profile pref,
 * long-press pref, volume keys pref.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { useNoorStore } from "@/store/noorStore";

function resetStore() {
  try { localStorage.clear(); } catch { /* ignore */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }
  const state = useNoorStore.getState();
  useNoorStore.setState({
    quickTasbeeh: {},
    sebhaSessions: [],
    sebhaCustom: null,
    sebhaCustomList: [],
    sebhaTarget: 100,
    sebhaSelected: "subhanallah",
    tasbeehLifetime: {},
    tasbeehDailyLog: {},
    tasbeehStreak: 0,
    tasbeehStreakBest: 0,
    tasbeehLastActiveDate: null,
    tasbeehDailyGoal: 0,
    tasbeehGoalCelebratedDate: null,
    asmaHusnaCounts: {},
    activity: {},
    prefs: {
      ...state.prefs,
      enableHaptics: true,
      hapticStrength: "medium",
      enableSounds: false,
      autoAdvanceDhikr: true,
      tasbeehLongPressEnabled: true,
      tasbeehVolumeKeysEnabled: false,
      tasbeehSoundProfile: "rising_3",
    },
  });
}

describe("Custom dhikr list CRUD", () => {
  beforeEach(() => resetStore());

  it("addSebhaCustomItem appends and returns id", () => {
    const id = useNoorStore.getState().addSebhaCustomItem({
      phrase: "يا حي يا قيوم",
      target: 100,
      color: "#7dd3fc",
      transliteration: "Ya Hayyu Ya Qayyum",
    });
    const list = useNoorStore.getState().sebhaCustomList;
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe(id);
    expect(list[0]?.phrase).toBe("يا حي يا قيوم");
  });

  it("updateSebhaCustomItem patches fields", () => {
    const id = useNoorStore.getState().addSebhaCustomItem({
      phrase: "x", target: 33, color: "#fff",
    });
    useNoorStore.getState().updateSebhaCustomItem(id, { phrase: "y", target: 50 });
    const item = useNoorStore.getState().sebhaCustomList.find((c) => c.id === id);
    expect(item?.phrase).toBe("y");
    expect(item?.target).toBe(50);
  });

  it("deleteSebhaCustomItem removes from list and per-key count", () => {
    const id = useNoorStore.getState().addSebhaCustomItem({
      phrase: "x", target: 33, color: "#fff",
    });
    useNoorStore.setState((s) => ({
      quickTasbeeh: { ...s.quickTasbeeh, [`custom:${id}`]: 7 },
    }));
    expect(useNoorStore.getState().quickTasbeeh[`custom:${id}`]).toBe(7);
    useNoorStore.getState().deleteSebhaCustomItem(id);
    expect(useNoorStore.getState().sebhaCustomList.find((c) => c.id === id)).toBeUndefined();
    expect(useNoorStore.getState().quickTasbeeh[`custom:${id}`]).toBeUndefined();
  });

  it("reorderSebhaCustomItem swaps adjacent items", () => {
    const a = useNoorStore.getState().addSebhaCustomItem({ phrase: "a", target: 33, color: "#fff" });
    const b = useNoorStore.getState().addSebhaCustomItem({ phrase: "b", target: 33, color: "#fff" });
    useNoorStore.getState().reorderSebhaCustomList(a, "down");
    const list = useNoorStore.getState().sebhaCustomList;
    expect(list[0]?.id).toBe(b);
    expect(list[1]?.id).toBe(a);
  });

  it("reorderSebhaCustomItem is a no-op at boundaries", () => {
    const a = useNoorStore.getState().addSebhaCustomItem({ phrase: "a", target: 33, color: "#fff" });
    const before = useNoorStore.getState().sebhaCustomList.slice();
    useNoorStore.getState().reorderSebhaCustomList(a, "up");
    expect(useNoorStore.getState().sebhaCustomList).toEqual(before);
  });
});

describe("Tasbeeh streak tracking", () => {
  beforeEach(() => resetStore());

  it("starts at 1 on first activity", () => {
    useNoorStore.getState().recordTasbeehActivity("2026-07-15");
    expect(useNoorStore.getState().tasbeehStreak).toBe(1);
    expect(useNoorStore.getState().tasbeehLastActiveDate).toBe("2026-07-15");
  });

  it("increments streak when consecutive days", () => {
    useNoorStore.getState().recordTasbeehActivity("2026-07-13");
    useNoorStore.getState().recordTasbeehActivity("2026-07-14");
    useNoorStore.getState().recordTasbeehActivity("2026-07-15");
    expect(useNoorStore.getState().tasbeehStreak).toBe(3);
  });

  it("resets to 1 after a gap day", () => {
    useNoorStore.getState().recordTasbeehActivity("2026-07-10");
    useNoorStore.getState().recordTasbeehActivity("2026-07-12");
    expect(useNoorStore.getState().tasbeehStreak).toBe(1);
  });

  it("does not double-count same-day activity", () => {
    useNoorStore.getState().recordTasbeehActivity("2026-07-15");
    useNoorStore.getState().recordTasbeehActivity("2026-07-15");
    expect(useNoorStore.getState().tasbeehStreak).toBe(1);
  });

  it("tracks best streak independently", () => {
    useNoorStore.getState().recordTasbeehActivity("2026-07-13");
    useNoorStore.getState().recordTasbeehActivity("2026-07-14");
    useNoorStore.getState().recordTasbeehActivity("2026-07-15");
    useNoorStore.getState().recordTasbeehActivity("2026-07-20");
    expect(useNoorStore.getState().tasbeehStreak).toBe(1);
    expect(useNoorStore.getState().tasbeehStreakBest).toBe(3);
  });
});

describe("Daily goal", () => {
  beforeEach(() => resetStore());

  it("setTasbeehDailyGoal clamps to 0..10000", () => {
    useNoorStore.getState().setTasbeehDailyGoal(-5);
    expect(useNoorStore.getState().tasbeehDailyGoal).toBe(0);
    useNoorStore.getState().setTasbeehDailyGoal(50000);
    expect(useNoorStore.getState().tasbeehDailyGoal).toBe(10000);
    useNoorStore.getState().setTasbeehDailyGoal(100);
    expect(useNoorStore.getState().tasbeehDailyGoal).toBe(100);
  });

  it("markTasbeehGoalCelebrated stores the date", () => {
    useNoorStore.getState().markTasbeehGoalCelebrated("2026-07-15");
    expect(useNoorStore.getState().tasbeehGoalCelebratedDate).toBe("2026-07-15");
  });
});

describe("Asma Husna counter", () => {
  beforeEach(() => resetStore());

  it("increments a per-name count", () => {
    expect(useNoorStore.getState().incAsmaHusnaCount(1, 100)).toBe(1);
    expect(useNoorStore.getState().incAsmaHusnaCount(1, 100)).toBe(2);
    expect(useNoorStore.getState().asmaHusnaCounts[1]).toBe(2);
  });

  it("caps at the given target", () => {
    for (let i = 0; i < 5; i++) useNoorStore.getState().incAsmaHusnaCount(7, 3);
    expect(useNoorStore.getState().asmaHusnaCounts[7]).toBe(3);
  });

  it("tracks lifetime + daily log per name", () => {
    useNoorStore.getState().incAsmaHusnaCount(5, 100);
    useNoorStore.getState().incAsmaHusnaCount(5, 100);
    expect(useNoorStore.getState().tasbeehLifetime["asma:5"]).toBe(2);
  });
});

describe("New Sebha preferences", () => {
  beforeEach(() => resetStore());

  it("tasbeehLongPressEnabled default true; settable via setPrefs", () => {
    expect(useNoorStore.getState().prefs.tasbeehLongPressEnabled).toBe(true);
    useNoorStore.getState().setPrefs({ tasbeehLongPressEnabled: false });
    expect(useNoorStore.getState().prefs.tasbeehLongPressEnabled).toBe(false);
  });

  it("tasbeehVolumeKeysEnabled default false; settable via setPrefs", () => {
    expect(useNoorStore.getState().prefs.tasbeehVolumeKeysEnabled).toBe(false);
    useNoorStore.getState().setPrefs({ tasbeehVolumeKeysEnabled: true });
    expect(useNoorStore.getState().prefs.tasbeehVolumeKeysEnabled).toBe(true);
  });

  it("tasbeehSoundProfile accepts the four profile ids", () => {
    for (const id of ["chime_bell", "soft_ping", "rising_3", "single_tap"] as const) {
      useNoorStore.getState().setPrefs({ tasbeehSoundProfile: id });
      expect(useNoorStore.getState().prefs.tasbeehSoundProfile).toBe(id);
    }
  });

  it("tasbeehDailyGoal default 0; tasbeehMascotEnabled default true", () => {
    expect(useNoorStore.getState().prefs.tasbeehDailyGoal).toBe(0);
    expect(useNoorStore.getState().prefs.tasbeehMascotEnabled).toBe(true);
  });
});

describe("Sound profile helpers", () => {
  it("exports 4 profiles with the expected ids", async () => {
    const { SOUND_PROFILES } = await import("../src/lib/dhikrCatalog");
    const ids = SOUND_PROFILES.map((p) => p.id).sort();
    expect(ids).toEqual(["chime_bell", "rising_3", "single_tap", "soft_ping"]);
  });
});

describe("Dhikr catalog", () => {
  it("provides categorized duas", async () => {
    const { DUAS, DUA_CATEGORIES } = await import("../src/lib/dhikrCatalog");
    expect(DUAS.length).toBeGreaterThan(5);
    expect(DUA_CATEGORIES.length).toBeGreaterThan(0);
    for (const cat of DUA_CATEGORIES) {
      const inCat = DUAS.filter((d) => d.category === cat.id);
      expect(inCat.length).toBeGreaterThan(0);
    }
  });

  it("mascotForPhrase returns known keys (no star)", async () => {
    const { mascotForPhrase } = await import("../src/lib/dhikrCatalog");
    expect(mascotForPhrase("سبحان الله")).toBe("wave");
    expect(mascotForPhrase("الحمد لله")).toBe("sun");
    expect(mascotForPhrase("الله أكبر")).toBe("moon");
    expect(mascotForPhrase("استغفر الله")).toBe("drop");
    expect(mascotForPhrase("الصلاة على نبي")).toBe("leaf");
    expect(mascotForPhrase("حسبنا الله")).toBe("flame");
    expect(mascotForPhrase("يا حي يا قيوم")).toBe("heart");
    // توحيد cluster now resolves to 'moon' (هلال) — was 'star' before
    // the user-asked-for star purge.
    expect(mascotForPhrase("لا إله إلا الله")).toBe("moon");
    expect(mascotForPhrase("")).toBe("default");
  });
});

describe("Dhikr custom palette", () => {
  it("validates hex colors", async () => {
    const { isValidHexColor, suggestColorForPhrase } = await import("../src/lib/dhikrCustom");
    expect(isValidHexColor("#fff")).toBe(true);
    expect(isValidHexColor("#aabbcc")).toBe(true);
    expect(isValidHexColor("not-a-color")).toBe(false);
    expect(suggestColorForPhrase("سبحان الله")).toMatch(/^#/);
  });
});

describe("Sebha sound helper", () => {
  it("playCompletionSound is a no-op when disabled", async () => {
    const { playCompletionSound, doHaptic } = await import("../src/lib/sebhaHaptics");
    expect(() => playCompletionSound(false, { id: "rising_3", label: "x", notes: [] })).not.toThrow();
    expect(() => doHaptic(1, 10, false, "medium")).not.toThrow();
  });
});