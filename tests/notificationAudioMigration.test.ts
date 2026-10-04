// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { useNoorStore } from "@/store/noorStore";
import { loadCustomReminders, saveCustomReminders } from "@/lib/reminderStorage";

describe("replacement notification audio migration", () => {
  it.each([
    { version: 26, expectedTajweed: true },
    { version: 27, expectedTajweed: false },
    { version: 34, expectedTajweed: false },
  ])("preserves Tajweed preferences after the historic v27 upgrade (saved v$version)", async ({ version, expectedTajweed }) => {
    const migrate = useNoorStore.persist.getOptions().migrate!;
    const state = await migrate({ prefs: { mushafTajweedMode: false } }, version) as ReturnType<typeof useNoorStore.getState>;
    expect(state.prefs.mushafTajweedMode).toBe(expectedTajweed);
  });

  it("upgrades existing sound profiles without changing enabled reminders or times", async () => {
    const migrate = useNoorStore.persist.getOptions().migrate!;
    const state = await migrate({ reminders: {
      soundProfile: "rain_calm", prayerSoundProfile: "adhan_haram",
      enabled: true, morningTime: "09:30", prayerAlerts: { Fajr: false },
    } }, 34) as ReturnType<typeof useNoorStore.getState>;
    expect(state.reminders).toMatchObject({
      soundProfile: "birds", prayerSoundProfile: "adhan_ahmad_al_nafees",
      enabled: true, morningTime: "09:30", prayerAlerts: { Fajr: false },
    });
    expect(useNoorStore.persist.getOptions().version).toBeGreaterThan(34);
  });

  it("upgrades a saved custom rain reminder and preserves disabled vibration", async () => {
    await saveCustomReminders([{
      id: "legacy-audio", title: "تذكير", category: "custom", enabled: true,
      repeat: "daily", atTimeOfDay: "08:00", createdAt: "2026-10-04", updatedAt: "2026-10-04",
      notification: { soundId: "rain_calm", vibration: false, snoozeMinutes: 30 },
    }]);
    expect((await loadCustomReminders())[0]?.notification)
      .toEqual({ soundId: "birds", vibration: false, snoozeMinutes: 30 });
  });
});
