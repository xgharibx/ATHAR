import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  capacitor: { isNativePlatform: vi.fn(() => true) },
  localNotifications: {
    checkPermissions: vi.fn(async () => ({ display: "granted" })),
    requestPermissions: vi.fn(async () => ({ display: "granted" })),
  },
  schedule: vi.fn<(
    reminderId: string,
    fireAt: Date,
    options?: { nativeRepeat?: { on: { day?: number; weekday?: number; hour: number; minute: number; second: number } } },
  ) => Promise<string>>(),
  cancel: vi.fn<(scheduleId: string) => Promise<void>>(),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: mocks.capacitor }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: mocks.localNotifications }));
vi.mock("@/lib/customReminderNotifications", () => ({
  scheduleIdFor: (reminderId: string, fireAtMs: number) => `cr:${reminderId}:${fireAtMs}`,
  scheduleCustomNotification: (
    reminder: { id: string },
    fireAt: Date,
    _body: string,
    _owner: string,
    options?: { nativeRepeat?: { on: { day?: number; weekday?: number; hour: number; minute: number; second: number } } },
  ) => mocks.schedule(reminder.id, fireAt, options),
  cancelCustomNotification: (scheduleId: string) => mocks.cancel(scheduleId),
}));

import { getNativeCalendarRepeat, syncCustomReminders } from "@/lib/reminderSync";
import type { CustomReminder } from "@/data/reminderTypes";
import { beginAccountReminderTransition, completeAccountReminderTransition } from "@/lib/reminders";

function makeReminder(): CustomReminder {
  return {
    id: "custom-1",
    category: "custom",
    title: "Test reminder",
    repeat: "daily",
    atTimeOfDay: "08:00",
    enabled: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("native custom reminder cancellation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 7, 0, 0));
    mocks.localNotifications.checkPermissions.mockResolvedValue({ display: "granted" });
    mocks.localNotifications.requestPermissions.mockReset().mockResolvedValue({ display: "granted" });
    mocks.schedule.mockReset();
    mocks.cancel.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    completeAccountReminderTransition();
    vi.useRealTimers();
  });

  it("does not prompt or schedule while account reminder cleanup is in progress", () => {
    beginAccountReminderTransition();

    const cleanup = syncCustomReminders([makeReminder()], { maxFirings: 1 });
    cleanup();

    expect(mocks.localNotifications.checkPermissions).not.toHaveBeenCalled();
    expect(mocks.localNotifications.requestPermissions).not.toHaveBeenCalled();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it("never prompts for notification permission during background sync", async () => {
    mocks.localNotifications.checkPermissions.mockResolvedValue({ display: "prompt" });

    const cleanup = syncCustomReminders([makeReminder()], { maxFirings: 1 });
    await vi.waitFor(() => expect(mocks.localNotifications.checkPermissions).toHaveBeenCalledOnce());

    expect(mocks.localNotifications.requestPermissions).not.toHaveBeenCalled();
    expect(mocks.schedule).not.toHaveBeenCalled();
    cleanup();
  });

  it("uses one repeating local-calendar alarm for an unbounded daily reminder", async () => {
    const cleanup = syncCustomReminders([makeReminder()], { maxFirings: 10 });
    await vi.waitFor(() => expect(mocks.schedule).toHaveBeenCalledOnce());

    expect(mocks.schedule.mock.calls[0]?.[2]).toEqual({
      nativeRepeat: { on: { hour: 8, minute: 0, second: 0 } },
    });
    cleanup();
  });

  it("maps weekly calendar repeats to Capacitor's Sunday-based weekday numbers", () => {
    const reminder = { ...makeReminder(), repeat: "weekly" as const, dayOfWeek: 5 };
    expect(getNativeCalendarRepeat(reminder, new Date(2026, 0, 2, 8, 0, 0))).toEqual({
      on: { hour: 8, minute: 0, second: 0, weekday: 6 },
    });
  });

  it("uses monthly calendar repeats only when the day exists in every month", () => {
    const commonDay = { ...makeReminder(), repeat: "monthly" as const, dayOfMonth: 28 };
    const shortMonthEdge = { ...makeReminder(), repeat: "monthly" as const, dayOfMonth: 31 };
    const firstOccurrence = new Date(2026, 0, 28, 8, 0, 0);

    expect(getNativeCalendarRepeat(commonDay, firstOccurrence)).toEqual({
      on: { hour: 8, minute: 0, second: 0, day: 28 },
    });
    expect(getNativeCalendarRepeat(shortMonthEdge, firstOccurrence)).toBeUndefined();
  });

  it("keeps a valid monthly calendar repeat even when its next occurrence is beyond the finite queue horizon", async () => {
    const reminder = { ...makeReminder(), repeat: "monthly" as const, dayOfMonth: 28 };
    const cleanup = syncCustomReminders([reminder], { maxFirings: 10 });
    await vi.waitFor(() => expect(mocks.schedule).toHaveBeenCalledOnce());

    expect(mocks.schedule.mock.calls[0]?.[2]).toEqual({
      nativeRepeat: { on: { hour: 8, minute: 0, second: 0, day: 28 } },
    });
    cleanup();
  });

  it("schedules the next day-29 occurrence even when it is more than 14 days away", async () => {
    vi.setSystemTime(new Date(2026, 9, 4, 7, 0, 0));
    const reminder = { ...makeReminder(), repeat: "monthly" as const, dayOfMonth: 29 };
    const cleanup = syncCustomReminders([reminder], { maxFirings: 10 });
    await vi.waitFor(() => expect(mocks.schedule).toHaveBeenCalledOnce());

    expect(mocks.schedule.mock.calls[0]?.[1]).toEqual(new Date(2026, 9, 29, 8, 0, 0));
    cleanup();
  });

  it.each([
    ["one-time reminders", { repeat: "once" as const, startDate: "2026-11-01" }],
    ["daily reminders with a future start date", { repeat: "daily" as const, startDate: "2026-11-01" }],
    ["date-bounded monthly reminders", { repeat: "monthly" as const, dayOfMonth: 29, endDate: "2026-12-31" }],
  ])("schedules the next future occurrence beyond the 14-day queue for %s", async (_label, overrides) => {
    vi.setSystemTime(new Date(2026, 9, 4, 7, 0, 0));
    const reminder = { ...makeReminder(), ...overrides };
    const cleanup = syncCustomReminders([reminder], { maxFirings: 3 });
    await vi.waitFor(() => expect(mocks.schedule).toHaveBeenCalled());

    expect(mocks.schedule.mock.calls[0]?.[1].getTime()).toBeGreaterThan(Date.now() + 14 * 24 * 60 * 60 * 1000);
    cleanup();
  });

  it("schedules the next Hijri fasting occurrence even when it is beyond the 14-day queue", async () => {
    vi.setSystemTime(new Date(2026, 9, 4, 7, 0, 0));
    const reminder = { ...makeReminder(), repeat: "fasting_aligned" as const, fastingPattern: "arafah" as const };
    const cleanup = syncCustomReminders([reminder], { maxFirings: 1 });
    await vi.waitFor(() => expect(mocks.schedule).toHaveBeenCalledOnce());

    expect(mocks.schedule.mock.calls[0]?.[1].getTime()).toBeGreaterThan(Date.now() + 14 * 24 * 60 * 60 * 1000);
    cleanup();
  });

  it("keeps date-bounded recurrences as individual scheduled occurrences", async () => {
    const reminder = { ...makeReminder(), endDate: "2026-01-03" };
    const cleanup = syncCustomReminders([reminder], { maxFirings: 3 });
    await vi.waitFor(() => expect(mocks.schedule).toHaveBeenCalledTimes(3));

    expect(mocks.schedule.mock.calls.every((call) => call[2] === undefined)).toBe(true);
    cleanup();
  });

  it("cancels an OS alarm when scheduling finishes after its reminder was disabled", async () => {
    const pendingSchedule = deferred<string>();
    let scheduleId = "";
    mocks.schedule.mockImplementationOnce(async (reminderId, fireAt) => {
      scheduleId = `cr:${reminderId}:${fireAt.getTime()}`;
      return pendingSchedule.promise;
    });

    const cleanup = syncCustomReminders([makeReminder()], { maxFirings: 1 });
    await vi.waitFor(() => expect(mocks.schedule).toHaveBeenCalledTimes(1));

    cleanup();
    pendingSchedule.resolve(scheduleId);
    await vi.waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith(scheduleId));
  });

  it("cancels an old schedule before re-arming the same occurrence with updated data", async () => {
    vi.useRealTimers();
    const pendingOldSchedule = deferred<string>();
    let scheduleId = "";
    const operations: string[] = [];
    const secondPermissionStarted = deferred<void>();
    const releaseSecondPermission = deferred<void>();
    let permissionChecks = 0;
    mocks.localNotifications.checkPermissions.mockImplementation(async () => {
      permissionChecks += 1;
      if (permissionChecks === 2) {
        secondPermissionStarted.resolve();
        await releaseSecondPermission.promise;
      }
      return { display: "granted" };
    });
    mocks.schedule
      .mockImplementationOnce(async (reminderId, fireAt) => {
        scheduleId = `cr:${reminderId}:${fireAt.getTime()}`;
        operations.push("schedule-old");
        return pendingOldSchedule.promise;
      })
      .mockImplementationOnce(async () => {
        operations.push("schedule-new");
        return scheduleId;
      });
    mocks.cancel.mockImplementation(async (id) => {
      operations.push(`cancel:${id}`);
    });

    const cleanupOld = syncCustomReminders([makeReminder()], { maxFirings: 1 });
    await vi.waitFor(() => expect(mocks.schedule).toHaveBeenCalledTimes(1));
    cleanupOld();

    const updated = { ...makeReminder(), title: "Updated reminder" };
    const cleanupNew = syncCustomReminders([updated], { maxFirings: 1 });
    await secondPermissionStarted.promise;
    releaseSecondPermission.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.schedule).toHaveBeenCalledTimes(1);

    pendingOldSchedule.resolve(scheduleId);

    await vi.waitFor(() => expect(mocks.schedule).toHaveBeenCalledTimes(2));
    expect(operations).toEqual(["schedule-old", `cancel:${scheduleId}`, "schedule-new"]);

    cleanupNew();
    await vi.waitFor(() => expect(mocks.cancel).toHaveBeenCalledTimes(2));
  });
});
