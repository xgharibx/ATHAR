/**
 * Post-install patches for Capacitor 6 Android modules.
 *
 * @capacitor/android and @capacitor/preferences 6.x can ship
 * `getDefaultProguardFile('proguard-android.txt')`, which AGP 9+ rejects. Use
 * the optimized default already used by the generated app target.
 * Capacitor Local Notifications 6.1.3 also needs repeat lifecycle repairs so
 * Android does not lose recurring alarms after delivery or replay stale ones at boot.
 *
 * Runs automatically via the package.json "postinstall" hook; safe to re-run.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function patchJavaSource(target, patches) {
  if (!existsSync(target)) {
    throw new Error(`[patch-capacitor-plugins] expected Capacitor source is missing: ${target}`);
  }

  const before = readFileSync(target, "utf8");
  const lineEnding = before.includes("\r\n") ? "\r\n" : "\n";
  let after = before.replace(/\r\n/g, "\n");
  let changed = false;

  for (const { from, to, label } of patches) {
    if (after.includes(to)) {
      continue;
    }
    if (!after.includes(from)) {
      throw new Error(`[patch-capacitor-plugins] cannot apply ${label} to the installed Capacitor source`);
    }
    after = after.replace(from, to);
    changed = true;
  }

  if (changed) {
    writeFileSync(target, after.replace(/\n/g, lineEnding));
    console.log(`[patch-capacitor-plugins] patched ${path.relative(capacitorPackages, target)}`);
  } else {
    console.log(`[patch-capacitor-plugins] ${path.relative(capacitorPackages, target)} already patched`);
  }
}

const capacitorPackages = fileURLToPath(
  new URL("../../node_modules/@capacitor/", import.meta.url),
);

if (!existsSync(capacitorPackages)) {
  console.log("[patch-capacitor-plugins] Capacitor packages not installed — nothing to do");
  process.exit(0);
}

for (const entry of readdirSync(capacitorPackages, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const packageRoot = path.join(capacitorPackages, entry.name);
  const buildFiles = [
    path.join(packageRoot, "capacitor", "build.gradle"),
    path.join(packageRoot, "android", "build.gradle"),
  ];

  for (const target of buildFiles) {
    if (!existsSync(target)) continue;

    const before = readFileSync(target, "utf8");
    const after = before.replace(
      "getDefaultProguardFile('proguard-android.txt')",
      "getDefaultProguardFile('proguard-android-optimize.txt')",
    );

    if (after !== before) {
      writeFileSync(target, after);
      console.log(`[patch-capacitor-plugins] patched ${path.relative(capacitorPackages, target)} for AGP 9+`);
    } else {
      console.log(`[patch-capacitor-plugins] ${path.relative(capacitorPackages, target)} already patched`);
    }
  }
}

const localNotificationsRoot = path.join(
  capacitorPackages,
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

patchJavaSource(path.join(localNotificationsRoot, "LocalNotificationManager.java"), [
  {
    label: "import the calendar used to preserve repeating local times",
    from: "import java.text.SimpleDateFormat;\nimport java.util.Date;",
    to: "import java.text.SimpleDateFormat;\nimport java.util.Calendar;\nimport java.util.Date;",
  },
  {
    label: "schedule daily at-repeats as one local-time alarm followed by calendar repeats",
    from: `                long interval = at.getTime() - new Date().getTime();
                alarmManager.setRepeating(AlarmManager.RTC, at.getTime(), interval, pendingIntent);`,
    to: `                if ("day".equals(schedule.getEvery()) && schedule.getCount() == 1) {
                    Calendar dailyTime = Calendar.getInstance();
                    dailyTime.setTime(at);
                    DateMatch dateMatch = new DateMatch();
                    dateMatch.setHour(dailyTime.get(Calendar.HOUR_OF_DAY));
                    dateMatch.setMinute(dailyTime.get(Calendar.MINUTE));
                    dateMatch.setSecond(dailyTime.get(Calendar.SECOND));
                    JSObject extra = request.getExtra();
                    String configuredTime = extra == null ? null : extra.getString("reminderTime");
                    if (configuredTime != null && configuredTime.matches("[0-9]{2}:[0-9]{2}")) {
                        try {
                            String[] configuredParts = configuredTime.split(":");
                            int configuredHour = Integer.parseInt(configuredParts[0]);
                            int configuredMinute = Integer.parseInt(configuredParts[1]);
                            if (configuredHour >= 0 && configuredHour <= 23 && configuredMinute >= 0 && configuredMinute <= 59) {
                                dateMatch.setHour(configuredHour);
                                dateMatch.setMinute(configuredMinute);
                                dateMatch.setSecond(0);
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                    dateMatch.nextTrigger(new Date());
                    notificationIntent.putExtra(TimedNotificationPublisher.CRON_KEY, dateMatch.toMatchString());
                    pendingIntent = PendingIntent.getBroadcast(context, request.getId(), notificationIntent, flags);
                    setExactIfPossible(alarmManager, schedule, at.getTime(), pendingIntent);
                } else {
                    Long configuredInterval = schedule.getEvery() == null ? null : schedule.getEveryInterval();
                    long interval = configuredInterval != null && configuredInterval > 0
                        ? configuredInterval
                        : at.getTime() - new Date().getTime();
                    alarmManager.setRepeating(AlarmManager.RTC, at.getTime(), interval, pendingIntent);
                }`,
  },
]);

patchJavaSource(path.join(localNotificationsRoot, "DateMatch.java"), [
  {
    label: "restore configured clock fields after advancing past a DST gap",
    from: `            if (incrementUnit != -1) {
                next.set(incrementUnit, next.get(incrementUnit) + 1);
            }`,
    to: `            if (incrementUnit != -1) {
                next.set(incrementUnit, next.get(incrementUnit) + 1);
                // Calendar may normalize a nonexistent DST-gap time (for example 00:30 to 01:30).
                // Reapply the requested clock after advancing the date so later days keep 00:30.
                if (hour != null) next.set(Calendar.HOUR_OF_DAY, hour);
                if (minute != null) next.set(Calendar.MINUTE, minute);
                if (second != null) next.set(Calendar.SECOND, second);
            }`,
  },
]);

patchJavaSource(path.join(localNotificationsRoot, "LocalNotificationRestoreReceiver.java"), [
  {
    label: "import mutable notification JSON for boot recovery",
    from: "import com.getcapacitor.CapConfig;",
    to: "import com.getcapacitor.CapConfig;\nimport com.getcapacitor.JSObject;",
  },
  {
    label: "import the calendar used to preserve daily wall-clock times",
    from: "import java.util.ArrayList;\nimport java.util.Date;",
    to: "import java.util.ArrayList;\nimport java.util.Calendar;\nimport java.util.Date;",
  },
  {
    label: "import UTC formatting for advanced repeat dates",
    from: "import java.util.Calendar;\nimport java.util.Date;\nimport java.util.List;",
    to: "import java.util.Calendar;\nimport java.util.Date;\nimport java.util.List;\nimport java.text.SimpleDateFormat;\nimport java.util.Locale;\nimport java.util.TimeZone;",
  },
  {
    label: "drop expired one-shots and recover recurring schedules without catch-up bursts",
    from: `                Date at = schedule.getAt();
                if (at != null && at.before(new Date())) {
                    // modify the scheduled date in order to show notifications that would have been delivered while device was off.
                    long newDateTime = new Date().getTime() + 15 * 1000;
                    schedule.setAt(new Date(newDateTime));
                    notification.setSchedule(schedule);
                    updatedNotifications.add(notification);
                }`,
    to: `                Date at = schedule.getAt();
                Date now = new Date();
                if (at != null && !at.after(now)) {
                    if (schedule.isRepeating() && "day".equals(schedule.getEvery()) && schedule.getCount() == 1) {
                        Calendar dailyTime = Calendar.getInstance();
                        dailyTime.setTime(at);
                        DateMatch dateMatch = new DateMatch();
                        dateMatch.setHour(dailyTime.get(Calendar.HOUR_OF_DAY));
                        dateMatch.setMinute(dailyTime.get(Calendar.MINUTE));
                        dateMatch.setSecond(dailyTime.get(Calendar.SECOND));
                        JSObject extra = notification.getExtra();
                        String configuredTime = extra == null ? null : extra.getString("reminderTime");
                        if (configuredTime != null && configuredTime.matches("[0-9]{2}:[0-9]{2}")) {
                            try {
                                String[] configuredParts = configuredTime.split(":");
                                int configuredHour = Integer.parseInt(configuredParts[0]);
                                int configuredMinute = Integer.parseInt(configuredParts[1]);
                                if (configuredHour >= 0 && configuredHour <= 23 && configuredMinute >= 0 && configuredMinute <= 59) {
                                    dateMatch.setHour(configuredHour);
                                    dateMatch.setMinute(configuredMinute);
                                    dateMatch.setSecond(0);
                                }
                            } catch (NumberFormatException ignored) {}
                        }
                        schedule.setAt(null);
                        schedule.setEvery(null);
                        schedule.setOn(dateMatch);
                        notification.setSchedule(schedule);

                        JSObject saved = storage.getSavedNotificationAsJSObject(id);
                        JSObject savedSchedule = saved == null ? null : saved.getJSObject("schedule");
                        if (savedSchedule == null) {
                            continue;
                        }
                        JSObject on = new JSObject();
                        on.put("hour", dateMatch.getHour());
                        on.put("minute", dateMatch.getMinute());
                        on.put("second", dateMatch.getSecond());
                        savedSchedule.put("at", null);
                        savedSchedule.put("every", null);
                        savedSchedule.put("on", on);
                        savedSchedule.put("repeats", true);
                        saved.put("schedule", savedSchedule);
                        notification.setSource(saved.toString());
                        updatedNotifications.add(notification);
                    } else if (schedule.isRepeating() && schedule.getEvery() != null) {
                        Long interval = schedule.getEveryInterval();
                        if (interval == null || interval <= 0) {
                            // Keep the saved recurring item, but never fire an expired trigger as catch-up.
                            continue;
                        }
                        long missedIntervals = (now.getTime() - at.getTime()) / interval + 1;
                        Date nextAt = new Date(at.getTime() + missedIntervals * interval);
                        schedule.setAt(nextAt);
                        notification.setSchedule(schedule);

                        JSObject saved = storage.getSavedNotificationAsJSObject(id);
                        JSObject savedSchedule = saved == null ? null : saved.getJSObject("schedule");
                        if (savedSchedule == null) {
                            continue;
                        }
                        SimpleDateFormat dateFormat = new SimpleDateFormat(LocalNotificationSchedule.JS_DATE_FORMAT, Locale.US);
                        dateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
                        savedSchedule.put("at", dateFormat.format(nextAt));
                        saved.put("schedule", savedSchedule);
                        notification.setSource(saved.toString());
                        updatedNotifications.add(notification);
                    } else {
                        if (!schedule.isRepeating()) {
                            // Do not replay missed one-shot notifications after a long shutdown.
                            storage.deleteNotification(id);
                        }
                        continue;
                    }
                }`,
  },
]);

patchJavaSource(path.join(localNotificationsRoot, "TimedNotificationPublisher.java"), [
  {
    label: "retain persisted repeating notifications after delivery",
    from: `        if (!rescheduleNotificationIfNeeded(context, intent, id)) {
            storage.deleteNotification(Integer.toString(id));
        }`,
    to: `        if (!rescheduleNotificationIfNeeded(context, intent, id) && !hasRepeatingSchedule(storage, id)) {
            storage.deleteNotification(Integer.toString(id));
        }`,
  },
  {
    label: "detect interval repeats that have no calendar rescheduler",
    from: `    @SuppressWarnings("deprecation")
    private Notification getParcelableExtraLegacy(Intent intent, String string) {`,
    to: `    private boolean hasRepeatingSchedule(NotificationStorage storage, int id) {
        JSObject saved = storage.getSavedNotificationAsJSObject(Integer.toString(id));
        JSObject schedule = saved == null ? null : saved.getJSObject("schedule");
        return schedule != null && (Boolean.TRUE.equals(schedule.getBool("repeats")) || schedule.getString("every") != null);
    }

    @SuppressWarnings("deprecation")
    private Notification getParcelableExtraLegacy(Intent intent, String string) {`,
  },
]);
