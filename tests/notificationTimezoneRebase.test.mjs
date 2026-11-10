import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("native one-shot reminder timezone patch", () => {
  it("rebases marked local reminders on Android and uses floating calendar triggers on iOS", () => {
    const repoRoot = fileURLToPath(new URL("../", import.meta.url));
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "athar-timezone-notifications-"));
    const fixtureScript = path.join(fixtureRoot, "tools/scripts/patch-capacitor-plugins.mjs");
    const pluginRoot = path.join(fixtureRoot, "node_modules/@capacitor/local-notifications");
    const androidRoot = path.join(
      pluginRoot,
      "android/src/main/java/com/capacitorjs/plugins/localnotifications",
    );
    const sourceAndroidRoot = path.join(
      repoRoot,
      "node_modules/@capacitor/local-notifications/android/src/main/java/com/capacitorjs/plugins/localnotifications",
    );
    const javaFiles = [
      "LocalNotification.java",
      "DateMatch.java",
      "LocalNotificationManager.java",
      "LocalNotificationRestoreReceiver.java",
      "TimedNotificationPublisher.java",
    ];
    const sourceSwift = path.join(
      repoRoot,
      "node_modules/@capacitor/local-notifications/ios/Sources/LocalNotificationsPlugin/LocalNotificationsPlugin.swift",
    );
    const fixtureSwift = path.join(
      pluginRoot,
      "ios/Sources/LocalNotificationsPlugin/LocalNotificationsPlugin.swift",
    );

    try {
      mkdirSync(path.dirname(fixtureScript), { recursive: true });
      copyFileSync(path.join(repoRoot, "tools/scripts/patch-capacitor-plugins.mjs"), fixtureScript);
      for (const file of javaFiles) {
        mkdirSync(androidRoot, { recursive: true });
        copyFileSync(path.join(sourceAndroidRoot, file), path.join(androidRoot, file));
      }
      const sourceManifest = path.join(
        repoRoot,
        "node_modules/@capacitor/local-notifications/android/src/main/AndroidManifest.xml",
      );
      const fixtureManifest = path.join(pluginRoot, "android/src/main/AndroidManifest.xml");
      mkdirSync(path.dirname(fixtureManifest), { recursive: true });
      copyFileSync(sourceManifest, fixtureManifest);
      mkdirSync(path.dirname(fixtureSwift), { recursive: true });
      copyFileSync(sourceSwift, fixtureSwift);

      const receiverTarget = path.join(androidRoot, "LocalNotificationRestoreReceiver.java");
      const receiverBeforeMigration = readFileSync(receiverTarget, "utf8");
      const completeTimeChangeGuard = `        boolean timeOrTimezoneChanged = Intent.ACTION_TIME_CHANGED.equals(intent.getAction())
            || Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction())
            || "android.intent.action.TIMEZONE_OFFSET_CHANGED".equals(intent.getAction())
            || Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())
            || Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(intent.getAction())
            || "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction());`;
      const previousTimeChangeGuard = `        boolean timeOrTimezoneChanged = Intent.ACTION_TIME_CHANGED.equals(intent.getAction())
            || Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction())
            || "android.intent.action.TIMEZONE_OFFSET_CHANGED".equals(intent.getAction());`;
      expect(receiverBeforeMigration).toContain(completeTimeChangeGuard);
      writeFileSync(
        receiverTarget,
        receiverBeforeMigration.replace(completeTimeChangeGuard, `${previousTimeChangeGuard}\n\n${completeTimeChangeGuard}`),
      );

      execFileSync(process.execPath, [fixtureScript], { cwd: fixtureRoot });

      const dateMatch = readFileSync(path.join(androidRoot, "DateMatch.java"), "utf8");
      const receiver = readFileSync(path.join(androidRoot, "LocalNotificationRestoreReceiver.java"), "utf8");
      const swift = readFileSync(fixtureSwift, "utf8");
      expect(dateMatch.match(/public static Date nextConfiguredLocalTimeAfter\(/g)).toHaveLength(1);
      expect(dateMatch.match(/public static Date atLocalWallClock\(/g)).toHaveLength(1);
      expect(receiver.match(/boolean timeOrTimezoneChanged =/g)).toHaveLength(1);
      expect(dateMatch).toContain("atLocalWallClock(String dateISO, String configuredTime)");
      expect(receiver).toContain('extra.getBool("atharWallClockOnce")');
      expect(receiver).toContain("DateMatch.atLocalWallClock(");
      expect(receiver).toContain("cancelAlarm(context, Integer.parseInt(id))");
      expect(receiver).toContain("alarmManager.cancel(pendingIntent)");
      expect(receiver).toContain("Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())");
      expect(receiver).toContain('savedSchedule.put("at", dateFormat.format(at))');
      expect(swift).toContain('notification["extra"] as? JSObject ?? [:]');
      expect(swift).toContain('extra["atharWallClockOnce"] as? Bool == true');
      expect(swift).toContain("TimeZone.autoupdatingCurrent");
      expect(swift).toContain("dateComponents([.year, .month, .day, .hour, .minute, .second], from: at)");
      expect(swift).toContain("UNCalendarNotificationTrigger(dateMatching: localComponents, repeats: false)");

      let javacAvailable = true;
      try {
        execFileSync("javac", ["-version"], { stdio: "ignore" });
      } catch {
        javacAvailable = false;
      }

      if (javacAvailable) {
        const probePath = path.join(fixtureRoot, "WallClockProbe.java");
        writeFileSync(probePath, `package com.capacitorjs.plugins.localnotifications;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public final class WallClockProbe {
    public static void main(String[] args) throws Exception {
        TimeZone.setDefault(TimeZone.getTimeZone("America/New_York"));
        SimpleDateFormat newYorkFormatter = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US);
        Date newYork = DateMatch.atLocalWallClock("2026-11-10", "08:30");
        String newYorkClock = newYorkFormatter.format(newYork);
        TimeZone.setDefault(TimeZone.getTimeZone("Africa/Cairo"));
        SimpleDateFormat cairoFormatter = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US);
        Date cairo = DateMatch.atLocalWallClock("2026-11-10", "08:30");
        String cairoClock = cairoFormatter.format(cairo);
        Date invalid = DateMatch.atLocalWallClock("2026-02-30", "08:30");
        System.out.print(newYorkClock + "|" + cairoClock + "|" + (newYork.getTime() != cairo.getTime()) + "|" + (invalid == null));
    }
}
`);
        execFileSync("javac", ["-d", fixtureRoot, path.join(androidRoot, "DateMatch.java"), probePath], {
          cwd: fixtureRoot,
        });
        const result = execFileSync("java", ["-cp", fixtureRoot, "com.capacitorjs.plugins.localnotifications.WallClockProbe"], {
          cwd: fixtureRoot,
          encoding: "utf8",
        }).trim();
        expect(result).toBe("2026-11-10 08:30|2026-11-10 08:30|true|true");
      }

      // Upgrade the prior native patch in place, then prove postinstall remains idempotent.
      const previousIosPatch = swift.replace(
        "var localComponents = Calendar.autoupdatingCurrent.dateComponents([.year, .month, .day, .hour, .minute, .second], from: at)",
        "var localComponents = dateInfo",
      );
      expect(previousIosPatch).not.toBe(swift);
      writeFileSync(fixtureSwift, previousIosPatch);
      execFileSync(process.execPath, [fixtureScript], { cwd: fixtureRoot });
      expect(readFileSync(fixtureSwift, "utf8")).toBe(swift);

      // Re-running postinstall must leave both native sources unchanged.
      execFileSync(process.execPath, [fixtureScript], { cwd: fixtureRoot });
      expect(readFileSync(fixtureSwift, "utf8")).toBe(swift);
    } finally {
      const resolvedFixtureRoot = path.resolve(fixtureRoot);
      if (path.dirname(resolvedFixtureRoot) !== path.resolve(tmpdir())) {
        throw new Error("Refusing to remove a fixture outside the system temp directory");
      }
      rmSync(resolvedFixtureRoot, { recursive: true, force: true });
    }
  });
});
