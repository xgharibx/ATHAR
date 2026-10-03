// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => "android"),
  },
  localNotifications: {
    addListener: vi.fn(async () => ({ remove: vi.fn() })),
    schedule: vi.fn(async (_options: unknown) => ({ notifications: [] })),
    registerActionTypes: vi.fn(async () => undefined),
    createChannel: vi.fn(async () => undefined),
  },
}));

vi.mock("@capacitor/core", () => ({ Capacitor: mocks.capacitor }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: mocks.localNotifications }));

import {
  consumePendingNotificationAction,
  registerNotificationDeepLinkListener,
  setPendingNotificationAction,
} from "@/lib/reminders";

const { localNotifications } = mocks;

beforeEach(() => {
  mocks.capacitor.isNativePlatform.mockReturnValue(true);
  mocks.capacitor.getPlatform.mockReturnValue("android");
  localNotifications.addListener.mockClear();
  localNotifications.schedule.mockClear();
  localNotifications.registerActionTypes.mockClear();
  localNotifications.createChannel.mockClear();
  consumePendingNotificationAction();
});

describe("cold-start snooze actions", () => {
  it.each([
    {
      name: "built-in adhkar",
      actionId: "snooze_60",
      route: "/c/morning",
      extra: { reminderKey: "morning", route: "/c/morning" },
      snoozeMinutes: 60,
      expected: { id: 9111, actionTypeId: "REMINDER_ACTIONS" },
    },
    {
      name: "custom reminder",
      actionId: "snooze",
      route: "/c/morning",
      extra: { reminderId: "custom-1", route: "/c/morning" },
      snoozeMinutes: 10,
      expected: { actionTypeId: "CUSTOM_REMINDER_ACTIONS" },
    },
  ])("schedules the $name snooze after the app listener mounts", async (testCase) => {
    const now = Date.now();
    setPendingNotificationAction({
      actionId: testCase.actionId,
      route: testCase.route,
      extra: testCase.extra,
      notification: {
        id: 9101,
        title: "تذكير أثر",
        body: "حان وقت وردك",
        channelId: "athar-reminders-quiet",
      },
    });

    const navigate = vi.fn();
    await registerNotificationDeepLinkListener(navigate);
    expect(localNotifications.schedule).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();

    const request = localNotifications.schedule.mock.calls.at(-1)?.[0] as {
      notifications: Array<Record<string, unknown>>;
    };
    expect(request.notifications).toHaveLength(1);
    expect(request.notifications[0]).toMatchObject({
      ...testCase.expected,
      title: "تذكير أثر",
      body: "حان وقت وردك",
      ...(testCase.actionId === "snooze_60" ? { channelId: "athar-reminders-quiet" } : {}),
      extra: testCase.extra,
    });
    const schedule = request.notifications[0]?.schedule as { at: Date };
    expect(schedule.at.getTime()).toBeGreaterThanOrEqual(now + testCase.snoozeMinutes * 60_000 - 1_000);
    expect(schedule.at.getTime()).toBeLessThanOrEqual(now + testCase.snoozeMinutes * 60_000 + 1_000);
  });
});
