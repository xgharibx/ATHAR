import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => "ios"),
  },
  localNotifications: {
    registerActionTypes: vi.fn(async (_options: unknown) => undefined),
    createChannel: vi.fn(async (_options: unknown) => undefined),
    schedule: vi.fn(async (_options: unknown) => ({ notifications: [] })),
  },
}));

vi.mock("@capacitor/core", () => ({ Capacitor: mocks.capacitor }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: mocks.localNotifications }));

import { ensureDefaultNotificationChannels } from "@/lib/reminders";
import { scheduleCustomNotification } from "@/lib/customReminderNotifications";

const EXPECTED_ACTION_TYPE_IDS = [
  "CUSTOM_REMINDER_ACTIONS",
  "PRAYER_ACTIONS",
  "REMINDER_ACTIONS",
];

function registeredActionTypeIds(): string[] {
  const options = mocks.localNotifications.registerActionTypes.mock.calls.at(-1)?.[0] as {
    types: Array<{ id: string }>;
  } | undefined;
  return options?.types.map(({ id }) => id).sort() ?? [];
}

beforeEach(() => {
  mocks.capacitor.isNativePlatform.mockReturnValue(true);
  mocks.capacitor.getPlatform.mockReturnValue("ios");
  mocks.localNotifications.registerActionTypes.mockClear();
  mocks.localNotifications.createChannel.mockClear();
  mocks.localNotifications.schedule.mockClear();
});

describe("native notification action category registration", () => {
  it("registers every built-in and custom category during startup", async () => {
    await ensureDefaultNotificationChannels();

    expect(registeredActionTypeIds()).toEqual(EXPECTED_ACTION_TYPE_IDS);
  });

  it("keeps built-in categories registered when a custom reminder is scheduled", async () => {
    await scheduleCustomNotification({
      id: "custom-1",
      category: "custom",
      title: "ذكرني",
      enabled: true,
      repeat: "daily",
      atTimeOfDay: "08:00",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }, new Date(Date.now() + 60_000), "body");

    expect(registeredActionTypeIds()).toEqual(EXPECTED_ACTION_TYPE_IDS);
  });
});
