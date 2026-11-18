// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adhanLine, fillTime, notificationTime, premiumStyle, TIME_PLACEHOLDER } from "@/lib/notificationStyle";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("how notifications read", () => {
  it("writes the time the Arabic way, morning and evening", () => {
    expect(notificationTime("04:32")).toBe("٤:٣٢ ص");
    expect(notificationTime("12:05")).toBe("١٢:٠٥ م");
    expect(notificationTime("19:07 (EET)")).toBe("٧:٠٧ م");
    expect(notificationTime("00:15")).toBe("١٢:١٥ ص");
    expect(notificationTime("nonsense")).toBe("");
    expect(fillTime(`حيّ على الصلاة · ${TIME_PLACEHOLDER}`, "13:01")).toBe("حيّ على الصلاة · ١:٠١ م");
  });

  it("carries a line from the Adhan, Fajr's own for Fajr", () => {
    expect(adhanLine("Fajr")).toBe("الصلاة خيرٌ من النوم");
    expect(adhanLine("Maghrib")).toContain("حيّ على الصلاة");
  });

  it("groups each kind, labels it, shows the full text, and lets the Adhan through a Focus mode", () => {
    expect(premiumStyle("prayer", "نص", { timeSensitive: true })).toEqual({
      group: "athar-prayer",
      summaryText: "الصلاة",
      threadIdentifier: "athar-prayer",
      largeBody: "نص",
      interruptionLevel: "timeSensitive",
    });
    expect(premiumStyle("adhkar", "نص").interruptionLevel).toBe("active");
  });

  it("puts the phone's own top-ups through the same wording", () => {
    expect(read("android/app/src/main/java/com/athar/adhkar/PrayerTopUp.java")).toContain("NotificationText.withTime");
    const ios = read("ios/App/App/PrayerTopUp.swift");
    expect(ios).toContain('replacingOccurrences(of: "{time}"');
    expect(ios).toContain("content.interruptionLevel = .timeSensitive");
    expect(read("ios/App/App/App.entitlements")).toContain("com.apple.developer.usernotifications.time-sensitive");
  });
});

describe("buttons that act without opening the app", () => {
  type Listener = () => void;
  let queue: unknown[] = [];
  let queuedListener: Listener | null = null;

  beforeEach(() => {
    vi.resetModules();
    queue = [];
    vi.doMock("@capacitor/core", () => ({
      Capacitor: { isNativePlatform: () => true },
      registerPlugin: () => ({
        drain: vi.fn(async () => {
          const actions = queue;
          queue = [];
          return { actions };
        }),
        addListener: vi.fn(async (_event: string, listener: Listener) => {
          queuedListener = listener;
          return { remove: async () => { queuedListener = null; } };
        }),
      }),
    }));
  });

  afterEach(() => vi.doUnmock("@capacitor/core"));

  it("applies each queued press once, skipping snoozes the phone already scheduled", async () => {
    const { drainNotificationActions } = await import("@/lib/notificationActionQueue");
    queue = [
      { actionId: "mark_prayed", extra: { prayerName: "Fajr", dateISO: "2026-11-18" } },
      { actionId: "snooze_60", extra: { reminderKey: "morning" }, handled: true },
      { actionId: "snooze", extra: { reminderId: "r1" }, handled: false },
      { actionId: "done", extra: { route: "/c/morning" } },
    ];
    const apply = vi.fn(async () => true);
    expect(await drainNotificationActions(apply)).toBe(4);
    expect(apply.mock.calls.map((call) => (call as unknown as [{ actionId: string }])[0].actionId)).toEqual(["mark_prayed", "snooze", "done"]);
    expect(await drainNotificationActions(apply)).toBe(0);
    expect(apply).toHaveBeenCalledTimes(3);
  });

  it("does not apply a press twice when it also arrives through the notification listener", async () => {
    const { applyBackgroundAction } = await import("@/lib/notificationActionQueue");
    queue = [{ actionId: "mark_prayed", extra: { prayerName: "Asr", dateISO: "2026-11-18" } }];
    const apply = vi.fn(async () => true);
    await applyBackgroundAction({ actionId: "mark_prayed", extra: { prayerName: "Asr", dateISO: "2026-11-18" } }, apply);
    expect(apply).toHaveBeenCalledTimes(1);
    // Nothing queued (an older build): the press itself is applied.
    await applyBackgroundAction({ actionId: "done", extra: { route: "/c/evening" } }, apply);
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it("applies presses as they arrive while the app is open", async () => {
    const { watchNotificationActions } = await import("@/lib/notificationActionQueue");
    const apply = vi.fn(async () => true);
    const stop = await watchNotificationActions(apply);
    queue = [{ actionId: "mark_prayed", extra: { prayerName: "Isha", dateISO: "2026-11-18" } }];
    queuedListener?.();
    await vi.waitFor(() => expect(apply).toHaveBeenCalledTimes(1));
    stop();
  });

  it("routes the buttons to the app's receiver on Android, and keeps them on iPhone", () => {
    const patch = read("patches/@capacitor+local-notifications+8.3.1.patch");
    expect(patch).toContain("androidBackgroundActions");
    expect(patch).toContain("PendingIntent.getBroadcast(");
    expect(patch).toContain("AtharNotificationActions.record(actionId: actionId, request: originalNotificationRequest)");
    const config = read("capacitor.config.ts");
    expect(config).toContain('androidActionReceiver: "com.athar.adhkar.NotificationActionReceiver"');
    expect(read("android/app/src/main/AndroidManifest.xml")).toContain('android:name=".NotificationActionReceiver"');
    expect(read("android/app/src/main/java/com/athar/adhkar/AtharActivity.java")).toContain("registerPlugin(NotificationActionsPlugin.class)");
    expect(read("ios/App/App/AtharBridgeViewController.swift")).toContain("registerPluginInstance(NotificationActionsPlugin())");
    expect(read("ios/App/App.xcodeproj/project.pbxproj")).toContain("NotificationActionsPlugin.swift in Sources");
  });

  it("gives a native snooze the same id the app would", async () => {
    const { numericIdFor } = await import("@/lib/customReminderNotifications");
    // The same FNV-1a over UTF-16 code units, 31 bits, in Java and Swift.
    const java = read("android/app/src/main/java/com/athar/adhkar/NotificationActionReceiver.java");
    expect(java).toContain("2166136261L");
    expect(java).toContain("16777619L");
    expect(java).toContain("0x7fffffffL");
    expect(numericIdFor("cr:rem-1:1700000000000")).toBeGreaterThan(0);
    for (const id of [9111, 9112, 9113, 9114, 9115]) expect(java).toContain(String(id));
  });
});
