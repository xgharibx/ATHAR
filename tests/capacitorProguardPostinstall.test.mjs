import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("Capacitor ProGuard compatibility postinstall", () => {
  it("rewrites legacy ProGuard files across installed Capacitor Android modules", () => {
    const repoRoot = fileURLToPath(new URL("../", import.meta.url));
    const scriptPath = path.join(
      repoRoot,
      "tools",
      "scripts",
      "patch-capacitor-plugins.mjs",
    );
    const fixtureRoot = mkdtempSync(
      path.join(tmpdir(), "athar-capacitor-proguard-"),
    );
    const fixtureScript = path.join(
      fixtureRoot,
      "tools",
      "scripts",
      "patch-capacitor-plugins.mjs",
    );
    const legacyGradle = "proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'\n";
    const moduleBuildFiles = [
      ["android", "capacitor", "build.gradle"],
      ["local-notifications", "android", "build.gradle"],
      ["preferences", "android", "build.gradle"],
    ].map((parts) => path.join(fixtureRoot, "node_modules", "@capacitor", ...parts));
    const notificationJavaFiles = [
      "LocalNotificationManager.java",
      "LocalNotificationRestoreReceiver.java",
      "TimedNotificationPublisher.java",
    ];
    const notificationSourceRoot = path.join(
      repoRoot,
      "node_modules",
      "@capacitor",
      "local-notifications",
      "android",
      "src",
      "main",
      "java",
      "com",
      "capacitorjs",
      "plugins",
      "localnotifications",
    );

    try {
      mkdirSync(path.dirname(fixtureScript), { recursive: true });
      copyFileSync(scriptPath, fixtureScript);
      for (const buildFile of moduleBuildFiles) {
        mkdirSync(path.dirname(buildFile), { recursive: true });
        writeFileSync(buildFile, legacyGradle);
      }
      for (const javaFile of notificationJavaFiles) {
        const target = path.join(
          fixtureRoot,
          "node_modules",
          "@capacitor",
          "local-notifications",
          "android",
          "src",
          "main",
          "java",
          "com",
          "capacitorjs",
          "plugins",
          "localnotifications",
          javaFile,
        );
        mkdirSync(path.dirname(target), { recursive: true });
        copyFileSync(path.join(notificationSourceRoot, javaFile), target);
      }

      execFileSync(process.execPath, [fixtureScript], { cwd: fixtureRoot });

      for (const buildFile of moduleBuildFiles) {
        const patched = readFileSync(buildFile, "utf8");
        expect(patched).toContain("getDefaultProguardFile('proguard-android-optimize.txt')");
        expect(patched).not.toContain("getDefaultProguardFile('proguard-android.txt')");
      }
    } finally {
      const resolvedFixtureRoot = path.resolve(fixtureRoot);
      if (path.dirname(resolvedFixtureRoot) !== path.resolve(tmpdir())) {
        throw new Error("Refusing to remove a fixture outside the system temp directory");
      }
      rmSync(resolvedFixtureRoot, { recursive: true, force: true });
    }
  });

  it("repairs local-notification repeat timing and drops expired boot alerts", () => {
    const repoRoot = fileURLToPath(new URL("../", import.meta.url));
    const scriptPath = path.join(
      repoRoot,
      "tools",
      "scripts",
      "patch-capacitor-plugins.mjs",
    );
    const fixtureRoot = mkdtempSync(
      path.join(tmpdir(), "athar-capacitor-notification-"),
    );
    const fixtureScript = path.join(
      fixtureRoot,
      "tools",
      "scripts",
      "patch-capacitor-plugins.mjs",
    );
    const pluginRoot = path.join(
      repoRoot,
      "node_modules",
      "@capacitor",
      "local-notifications",
      "android",
      "src",
      "main",
      "java",
      "com",
      "capacitorjs",
      "plugins",
      "localnotifications",
    );
    const patchedPluginRoot = path.join(
      fixtureRoot,
      "node_modules",
      "@capacitor",
      "local-notifications",
      "android",
      "src",
      "main",
      "java",
      "com",
      "capacitorjs",
      "plugins",
      "localnotifications",
    );
    const javaFiles = [
      "LocalNotificationManager.java",
      "LocalNotificationRestoreReceiver.java",
      "TimedNotificationPublisher.java",
    ];

    try {
      mkdirSync(path.dirname(fixtureScript), { recursive: true });
      copyFileSync(scriptPath, fixtureScript);
      for (const javaFile of javaFiles) {
        const source = path.join(pluginRoot, javaFile);
        const target = path.join(
          fixtureRoot,
          "node_modules",
          "@capacitor",
          "local-notifications",
          "android",
          "src",
          "main",
          "java",
          "com",
          "capacitorjs",
          "plugins",
          "localnotifications",
          javaFile,
        );
        mkdirSync(path.dirname(target), { recursive: true });
        copyFileSync(source, target);
      }

      execFileSync(process.execPath, [fixtureScript], { cwd: fixtureRoot });

      const manager = readFileSync(path.join(patchedPluginRoot, javaFiles[0]), "utf8");
      const receiver = readFileSync(path.join(patchedPluginRoot, javaFiles[1]), "utf8");
      const publisher = readFileSync(path.join(patchedPluginRoot, javaFiles[2]), "utf8");
      expect(manager).toContain("schedule.getEveryInterval()");
      expect(manager).toContain("schedule.getEvery() == null ? null : schedule.getEveryInterval()");
      expect(manager).toContain('"day".equals(schedule.getEvery())');
      expect(manager).toContain('"day".equals(schedule.getEvery()) && schedule.getCount() == 1');
      expect(manager).toContain("notificationIntent.putExtra(TimedNotificationPublisher.CRON_KEY, dateMatch.toMatchString())");
      expect(manager).toMatch(/notificationIntent\.putExtra\(TimedNotificationPublisher\.CRON_KEY, dateMatch\.toMatchString\(\)\);\s*pendingIntent = PendingIntent\.getBroadcast/);
      expect(manager).toContain("setExactIfPossible(alarmManager, schedule, at.getTime(), pendingIntent)");
      expect(receiver).toContain("storage.deleteNotification(id);");
      expect(receiver).toContain("schedule.setOn(dateMatch);");
      expect(receiver).toContain("schedule.isRepeating() && schedule.getEvery() != null");
      expect(receiver).toContain('schedule.isRepeating() && "day".equals(schedule.getEvery()) && schedule.getCount() == 1');
      expect(receiver).toContain("long missedIntervals = (now.getTime() - at.getTime()) / interval + 1");
      expect(receiver).toContain('!schedule.isRepeating()');
      expect(receiver).toContain("if (!schedule.isRepeating()) {\n                            // Do not replay missed one-shot notifications after a long shutdown.\n                            storage.deleteNotification(id);\n                        }");
      expect(receiver).toContain("notification.setSource(saved.toString());");
      expect(receiver).not.toContain("new Date().getTime() + 15 * 1000");
      expect(publisher).toContain("hasRepeatingSchedule(storage, id)");
      expect(publisher).toContain("!hasRepeatingSchedule(storage, id)");
      expect(publisher).toContain('schedule.getString("every") != null');

      execFileSync(process.execPath, [fixtureScript], { cwd: fixtureRoot });
    } finally {
      const resolvedFixtureRoot = path.resolve(fixtureRoot);
      if (path.dirname(resolvedFixtureRoot) !== path.resolve(tmpdir())) {
        throw new Error("Refusing to remove a fixture outside the system temp directory");
      }
      rmSync(resolvedFixtureRoot, { recursive: true, force: true });
    }
  });
});
