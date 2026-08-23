/**
 * @vitest-environment jsdom
 *
 * Notification action buttons must RECORD, not just dismiss.
 *
 * "اتممت الصلاة" is nearly always tapped with the app closed. That cold-start
 * path buffered the action but read only its `route`, throwing the actionId
 * (and the prayer extras) away — so the prayer was never logged. "تم" on an
 * adhkar reminder was documented as deliberately writing nothing at all.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { applyNotificationAction } from "@/lib/reminders";
import { useNoorStore } from "@/store/noorStore";

const DAY = "2026-08-24";

beforeEach(() => {
  useNoorStore.setState({ prayerLog: {}, sectionCompletions: {} });
});

describe("اتممت الصلاة", () => {
  it("logs the prayer", async () => {
    await applyNotificationAction({
      actionId: "mark_prayed",
      extra: { prayerName: "Fajr", dateISO: DAY },
    });
    expect(useNoorStore.getState().prayerLog[DAY]?.Fajr).toBe(true);
  });

  it("logs each prayer independently", async () => {
    await applyNotificationAction({ actionId: "mark_prayed", extra: { prayerName: "Fajr", dateISO: DAY } });
    await applyNotificationAction({ actionId: "mark_prayed", extra: { prayerName: "Asr", dateISO: DAY } });
    const log = useNoorStore.getState().prayerLog[DAY]!;
    expect(log.Fajr).toBe(true);
    expect(log.Asr).toBe(true);
    expect(log.Maghrib).toBeUndefined();
  });

  it("ignores a payload with no prayer in it", async () => {
    await applyNotificationAction({ actionId: "mark_prayed", extra: {} });
    expect(useNoorStore.getState().prayerLog).toEqual({});
  });
});

describe("تم on an adhkar reminder", () => {
  it("records the section as completed", async () => {
    await applyNotificationAction({ actionId: "done", route: "/c/morning" });
    expect(useNoorStore.getState().sectionCompletions.morning?.length).toBe(1);
  });

  it("reads the section from the notification's own extras too", async () => {
    await applyNotificationAction({ actionId: "done", extra: { route: "/c/evening" } });
    expect(useNoorStore.getState().sectionCompletions.evening?.length).toBe(1);
  });

  it("does not double-record the same section on the same day", async () => {
    await applyNotificationAction({ actionId: "done", route: "/c/morning" });
    await applyNotificationAction({ actionId: "done", route: "/c/morning" });
    expect(useNoorStore.getState().sectionCompletions.morning?.length).toBe(1);
  });

  it("ignores a route that is not an adhkar section", async () => {
    await applyNotificationAction({ actionId: "done", route: "/quran" });
    expect(useNoorStore.getState().sectionCompletions).toEqual({});
  });
});

describe("other actions write nothing", () => {
  it("snooze does not log a prayer or a completion", async () => {
    await applyNotificationAction({ actionId: "snooze", route: "/c/morning", extra: { prayerName: "Fajr", dateISO: DAY } });
    expect(useNoorStore.getState().prayerLog).toEqual({});
    expect(useNoorStore.getState().sectionCompletions).toEqual({});
  });

  it("a plain body tap writes nothing", async () => {
    await applyNotificationAction({ route: "/c/morning" });
    expect(useNoorStore.getState().sectionCompletions).toEqual({});
  });
});
