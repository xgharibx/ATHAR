import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * Athar's reminder fixes for @capacitor/local-notifications live in
 * patches/ and are applied by patch-package on every install. These checks
 * fail if the patch no longer matches the installed plugin version, or if any
 * fix is missing from the installed sources.
 */
const repo = fileURLToPath(new URL("../", import.meta.url));
const plugin = path.join(repo, "node_modules/@capacitor/local-notifications");
const kotlin = path.join(plugin, "android/src/main/kotlin/com/capacitorjs/plugins/localnotifications");
const read = (file) => readFileSync(file, "utf8");
const installedVersion = JSON.parse(read(path.join(plugin, "package.json"))).version;

describe("local-notifications patch", () => {
  it("targets the installed plugin version", () => {
    const patches = readdirSync(path.join(repo, "patches")).filter((name) =>
      name.startsWith("@capacitor+local-notifications+"),
    );
    expect(patches).toEqual([`@capacitor+local-notifications+${installedVersion}.patch`]);
  });

  it("keeps silent reminders silent and lets recurring reminders alert again", () => {
    const manager = read(path.join(kotlin, "LocalNotificationManager.kt"));
    expect(manager).toContain('val explicitSilence = localNotification.sound == ""');
    expect(manager).toContain("mBuilder.setSound(null)");
    expect(manager).toContain('extraJson.optBoolean("vibration", true)');
    expect(manager).toContain("mBuilder.setOnlyAlertOnce(explicitSilence)");
    expect(manager).not.toContain("mBuilder.setOnlyAlertOnce(true)");
  });

  it("schedules daily repeats on the configured local clock", () => {
    const manager = read(path.join(kotlin, "LocalNotificationManager.kt"));
    expect(manager).toContain('DateMatch.dailyAt(at, (request.extra as? JSONObject)?.optString("reminderTime", null))');
    expect(manager).toContain("notificationIntent.putExtra(TimedNotificationPublisher.CRON_KEY, daily.toMatchString())");

    const dateMatch = read(path.join(kotlin, "DateMatch.kt"));
    expect(dateMatch).toContain("hour?.let { next.set(Calendar.HOUR_OF_DAY, it) }");
    for (const helper of ["fun parseClock(", "fun dailyAt(", "fun nextConfiguredLocalTimeAfter(", "fun atLocalWallClock("]) {
      expect(dateMatch.split(helper)).toHaveLength(2);
    }
  });

  it("restores alarms after reboot and clock or time-zone changes without catch-up bursts", () => {
    const receiver = read(path.join(kotlin, "LocalNotificationRestoreReceiver.kt"));
    for (const action of [
      "Intent.ACTION_TIME_CHANGED",
      "Intent.ACTION_TIMEZONE_CHANGED",
      '"android.intent.action.TIMEZONE_OFFSET_CHANGED"',
      "Intent.ACTION_BOOT_COMPLETED",
    ]) {
      expect(receiver).toContain(action);
    }
    expect(receiver).toContain('extra.optBoolean("atharWallClockOnce", false)');
    expect(receiver).toContain("DateMatch.nextConfiguredLocalTimeAfter(");
    expect(receiver).toContain("schedule.on = daily");
    expect(receiver).toContain("dismissVisible = false");
    expect(receiver).not.toContain("15 * 1000");

    const manifest = read(path.join(plugin, "android/src/main/AndroidManifest.xml"));
    for (const action of ["TIME_SET", "TIMEZONE_CHANGED", "TIMEZONE_OFFSET_CHANGED"]) {
      expect(manifest).toContain(`<action android:name="android.intent.action.${action}" />`);
    }
  });

  it("keeps Doze-safe delivery for later occurrences", () => {
    const publisher = read(path.join(kotlin, "TimedNotificationPublisher.kt"));
    expect(publisher).toContain('optBoolean("allowWhileIdle", false)');
    expect(publisher).toContain("alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pendingIntent)");
  });

  it("uses a floating local calendar trigger for date-specific prayer reminders on iOS", () => {
    const swift = read(path.join(plugin, "ios/Sources/LocalNotificationsPlugin/LocalNotificationsPlugin.swift"));
    expect(swift).toContain('handleScheduledNotification(schedule, notification["extra"] as? JSObject ?? [:])');
    expect(swift).toContain('if extra["atharWallClockOnce"] as? Bool == true, !repeats {');
    expect(swift).toContain("UNCalendarNotificationTrigger(dateMatching: localComponents, repeats: false)");
  });

  it("is applied on install", () => {
    const manifest = JSON.parse(read(path.join(repo, "package.json")));
    expect(manifest.scripts.postinstall).toBe("patch-package");
    expect(existsSync(path.join(repo, "node_modules/patch-package"))).toBe(true);
  });
});
