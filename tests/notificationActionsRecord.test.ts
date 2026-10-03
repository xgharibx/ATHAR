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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyNotificationAction,
  beginAccountReminderTransition,
  completeAccountReminderTransition,
  getAccountScopedNotificationRoute,
} from "@/lib/reminders";
import { useNoorStore } from "@/store/noorStore";
import { setAccountStorageOwner } from "@/lib/accountStorageScope";

const customNotificationImport = vi.hoisted(() => {
  let signalStarted!: () => void;
  let releaseLoad!: () => void;
  return {
    started: new Promise<void>((resolve) => { signalStarted = resolve; }),
    loadGate: new Promise<void>((resolve) => { releaseLoad = resolve; }),
    signalStarted: () => signalStarted(),
    releaseLoad: () => releaseLoad(),
    schedule: vi.fn(async () => "scheduled-custom-notification"),
    cancel: vi.fn(async () => undefined),
    scheduleIdFor: (reminderId: string, fireAt: number, owner: string) => `${owner}:${reminderId}:${fireAt}`,
  };
});

vi.mock("@/lib/customReminderNotifications", async () => {
  customNotificationImport.signalStarted();
  await customNotificationImport.loadGate;
  return {
    scheduleCustomNotification: customNotificationImport.schedule,
    cancelCustomNotification: customNotificationImport.cancel,
    scheduleIdFor: customNotificationImport.scheduleIdFor,
  };
});

const DAY = "2026-08-24";

beforeEach(() => {
  completeAccountReminderTransition();
  setAccountStorageOwner("local");
  customNotificationImport.schedule.mockClear();
  customNotificationImport.cancel.mockClear();
  useNoorStore.setState({ prayerLog: {}, sectionCompletions: {} });
});

afterEach(() => {
  completeAccountReminderTransition();
  setAccountStorageOwner("local");
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

  it("does not write an old account's notification action into the active account", async () => {
    setAccountStorageOwner("user:account-b");

    await applyNotificationAction({
      actionId: "mark_prayed",
      extra: { accountOwner: "user:account-a", prayerName: "Fajr", dateISO: DAY },
    });

    expect(useNoorStore.getState().prayerLog).toEqual({});
  });

  it("does not write when the account changes while the action store is loading", async () => {
    setAccountStorageOwner("user:account-a");
    const action = applyNotificationAction({
      actionId: "mark_prayed",
      extra: { accountOwner: "user:account-a", prayerName: "Fajr", dateISO: DAY },
    });
    setAccountStorageOwner("user:account-b");

    await action;

    expect(useNoorStore.getState().prayerLog).toEqual({});
  });

  it("does not schedule a custom snooze after the account changes during module loading", async () => {
    setAccountStorageOwner("user:account-a");
    const action = applyNotificationAction({
      actionId: "snooze",
      extra: { accountOwner: "user:account-a", reminderId: "reminder-a", route: "/c/morning", body: "Morning adhkar" },
    });
    await customNotificationImport.started;
    setAccountStorageOwner("user:account-b");
    customNotificationImport.releaseLoad();

    await action;

    expect(customNotificationImport.schedule).not.toHaveBeenCalled();
  });

  it("keeps a custom snooze under the account that received the action", async () => {
    setAccountStorageOwner("user:account-a");
    await applyNotificationAction({
      actionId: "snooze",
      extra: { accountOwner: "user:account-a", reminderId: "reminder-a", route: "/c/morning", body: "Morning adhkar" },
    });

    expect(customNotificationImport.schedule.mock.calls.at(-1)?.[3]).toBe("user:account-a");
  });

  it("does not navigate from an outgoing account's reminder", () => {
    setAccountStorageOwner("user:account-b");

    expect(getAccountScopedNotificationRoute(
      { accountOwner: "user:account-a", route: "/quran" },
    )).toBeNull();
  });

  it("does not navigate while account reminder state is transitioning", () => {
    setAccountStorageOwner("user:account-a");
    beginAccountReminderTransition();

    expect(getAccountScopedNotificationRoute(
      { accountOwner: "user:account-a", route: "/quran" },
    )).toBeNull();
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
