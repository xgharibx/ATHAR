// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CustomReminder } from "@/data/reminderTypes";
import { setAccountStorageOwner } from "@/lib/accountStorageScope";
import { scheduleIdFor, WEB_ATHAR_TAG_PREFIX } from "@/lib/customReminderNotifications";
import { syncCustomReminders } from "@/lib/reminderSync";

function makeReminder(): CustomReminder {
  return {
    id: "morning",
    category: "custom",
    title: "اذكار الصباح",
    repeat: "daily",
    enabled: true,
    atTimeOfDay: "08:00",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function withVibration(reminder: CustomReminder, vibration: boolean): CustomReminder {
  return { ...reminder, notification: { vibration } };
}

afterEach(() => {
  vi.useRealTimers();
  setAccountStorageOwner("local");
});

describe("syncCustomReminders web notifications", () => {
  it("tags notifications with the owning account and deterministic schedule id", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 7, 0, 0));
    const owner = "user:reminder-account";
    setAccountStorageOwner(owner);
    const showNotification = vi.fn();
    const cleanup = syncCustomReminders([makeReminder()], {
      canNotify: () => true,
      showNotification,
      maxFirings: 1,
    });

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

    const scheduleId = scheduleIdFor("morning", new Date(2026, 0, 5, 8, 0, 0).getTime(), owner);
    expect(showNotification).toHaveBeenCalledWith("اذكار الصباح", expect.objectContaining({
      tag: `${WEB_ATHAR_TAG_PREFIX}${scheduleId}`,
      data: { route: undefined, reminderId: "morning", accountOwner: owner, scheduleId },
    }));
    cleanup();
  });

  it("passes disabled vibration through to scheduled web notifications", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 7, 0, 0));
    const showNotification = vi.fn();
    const cleanup = syncCustomReminders([withVibration(makeReminder(), false)], {
      canNotify: () => true,
      showNotification,
      maxFirings: 1,
    });

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

    expect(showNotification).toHaveBeenCalledWith("اذكار الصباح", expect.objectContaining({ vibrate: [] }));
    cleanup();
  });
});
