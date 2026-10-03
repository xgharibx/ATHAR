import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  capacitor: { isNativePlatform: vi.fn(() => true) },
  localNotifications: {
    checkPermissions: vi.fn(async () => ({ display: "granted" })),
    requestPermissions: vi.fn(async () => ({ display: "granted" })),
  },
  schedule: vi.fn<(reminderId: string, fireAt: Date) => Promise<string>>(),
  cancel: vi.fn<(scheduleId: string) => Promise<void>>(),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: mocks.capacitor }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: mocks.localNotifications }));
vi.mock("@/lib/customReminderNotifications", () => ({
  scheduleIdFor: (reminderId: string, fireAtMs: number) => `cr:${reminderId}:${fireAtMs}`,
  scheduleCustomNotification: (reminder: { id: string }, fireAt: Date) => mocks.schedule(reminder.id, fireAt),
  cancelCustomNotification: (scheduleId: string) => mocks.cancel(scheduleId),
}));

import { syncCustomReminders } from "@/lib/reminderSync";
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
