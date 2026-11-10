/**
 * Post-install patches for Capacitor 6 native modules.
 *
 * @capacitor/android and @capacitor/preferences 6.x can ship
 * `getDefaultProguardFile('proguard-android.txt')`, which AGP 9+ rejects. Use
 * the optimized default already used by the generated app target.
 * Capacitor Local Notifications 6.1.3 also needs Android repeat/timezone lifecycle
 * repairs and timezone-aware one-shot prayer alarms on Android and iOS.
 *
 * Runs automatically via the package.json "postinstall" hook; safe to re-run.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function patchSourceFile(target, patches) {
  if (!existsSync(target)) {
    throw new Error(`[patch-capacitor-plugins] expected Capacitor source is missing: ${target}`);
  }

  const before = readFileSync(target, "utf8");
  const lineEnding = before.includes("\r\n") ? "\r\n" : "\n";
  let after = before.replace(/\r\n/g, "\n");
  let changed = false;

  for (const { from, to, label, optional = false, already } of patches) {
    if ((already && after.includes(already)) || after.includes(to)) {
      continue;
    }
    if (!after.includes(from)) {
      if (optional) continue;
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

function normalizeTimeZoneRestoreGuard(target) {
  const before = readFileSync(target, "utf8");
  const lineEnding = before.includes("\r\n") ? "\r\n" : "\n";
  const newlineSource = before.replace(/\r\n/g, "\n");
  const guardPattern = /^        boolean timeOrTimezoneChanged = Intent\.ACTION_TIME_CHANGED\.equals\(intent\.getAction\(\)\)(?:\n            \|\| [^\n]+)+/gm;
  const guards = [...newlineSource.matchAll(guardPattern)];
  if (guards.length === 0) {
    throw new Error("[patch-capacitor-plugins] cannot find the Local Notifications time-change guard");
  }

  const normalizedGuard = `        boolean timeOrTimezoneChanged = Intent.ACTION_TIME_CHANGED.equals(intent.getAction())
            || Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction())
            || "android.intent.action.TIMEZONE_OFFSET_CHANGED".equals(intent.getAction())
            || Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())
            || Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(intent.getAction())
            || "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction());`;
  let after = newlineSource.replace(guardPattern, "");
  const idsAnchor = "        List<String> ids = storage.getSavedNotificationIds();";
  if (!after.includes(idsAnchor)) {
    throw new Error("[patch-capacitor-plugins] cannot find the Local Notifications restore receiver anchor");
  }
  after = after.replace(idsAnchor, (match) => `${match}\n${normalizedGuard}`);
  if (after !== newlineSource) {
    writeFileSync(target, after.replace(/\n/g, lineEnding));
    console.log(`[patch-capacitor-plugins] normalized ${path.relative(capacitorPackages, target)} time-change guard`);
  }
}

const capacitorPackages = fileURLToPath(
  new URL("../../node_modules/@capacitor/", import.meta.url),
);

if (!existsSync(capacitorPackages)) {
  console.log("[patch-capacitor-plugins] Capacitor packages not installed — nothing to do");
  process.exit(0);
}

const capacitorCliTemplate = path.join(
  capacitorPackages,
  "cli",
  "dist",
  "util",
  "template.js",
);
if (existsSync(capacitorCliTemplate)) {
  const before = readFileSync(capacitorCliTemplate, "utf8");
  const after = before.replace("tar_1.default.extract(", "tar_1.x(");
  if (after === before && !before.includes("tar_1.x(")) {
    throw new Error("[patch-capacitor-plugins] cannot adapt the installed Capacitor CLI tar API");
  }
  if (after !== before) {
    writeFileSync(capacitorCliTemplate, after);
    console.log("[patch-capacitor-plugins] updated Capacitor CLI for the patched tar API");
  }
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

patchSourceFile(path.join(localNotificationsRoot, "LocalNotification.java"), [
  {
    label: "preserve an explicit silent sound instead of resolving the default resource",
    from: `    public String getSound(Context context, int defaultSound) {
        String soundPath = null;`,
    to: `    public String getSound(Context context, int defaultSound) {
        if ("".equals(sound)) return "";
        String soundPath = null;`,
  },
]);

patchSourceFile(path.join(localNotificationsRoot, "LocalNotificationManager.java"), [
  {
    label: "allow a new recurring occurrence to alert even if the previous notification remains visible",
    from: `        mBuilder.setOnlyAlertOnce(true);`,
    to: `        mBuilder.setOnlyAlertOnce("".equals(sound));`,
  },
  {
    label: "honor silence and vibration preferences before Android notification channels",
    from: `        String sound = localNotification.getSound(context, getDefaultSound(context));
        if (sound != null) {
            Uri soundUri = Uri.parse(sound);
            // Grant permission to use sound
            context.grantUriPermission("com.android.systemui", soundUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            mBuilder.setSound(soundUri);
            mBuilder.setDefaults(Notification.DEFAULT_VIBRATE | Notification.DEFAULT_LIGHTS);
        } else {
            mBuilder.setDefaults(Notification.DEFAULT_ALL);
        }`,
    to: `        String sound = localNotification.getSound(context, getDefaultSound(context));
        JSObject audioExtra = localNotification.getExtra();
        boolean vibrationEnabled = audioExtra == null || !Boolean.FALSE.equals(audioExtra.getBool("vibration"));
        int silentDefaults = Notification.DEFAULT_LIGHTS | (vibrationEnabled ? Notification.DEFAULT_VIBRATE : 0);
        if ("".equals(sound)) {
            mBuilder.setSound(null);
            mBuilder.setDefaults(silentDefaults);
        } else if (sound != null) {
            Uri soundUri = Uri.parse(sound);
            // Grant permission to use sound
            context.grantUriPermission("com.android.systemui", soundUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            mBuilder.setSound(soundUri);
            mBuilder.setDefaults(silentDefaults);
        } else {
            mBuilder.setDefaults(Notification.DEFAULT_SOUND | silentDefaults);
        }`,
  },
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

patchSourceFile(path.join(localNotificationsRoot, "DateMatch.java"), [
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
  {
    label: "rebase an alarm to its configured local clock after a timezone change",
    already: "public static Date nextConfiguredLocalTimeAfter(",
    from: `    @Override
    public String toString() {`,
    to: `    public static Date nextConfiguredLocalTimeAfter(Date original, int hour, int minute, Date now) {
        Calendar target = Calendar.getInstance();
        target.setTime(original);
        while (true) {
            target.set(Calendar.HOUR_OF_DAY, hour);
            target.set(Calendar.MINUTE, minute);
            target.set(Calendar.SECOND, 0);
            target.set(Calendar.MILLISECOND, 0);
            if (target.getTime().after(now)) return target.getTime();
            target.add(Calendar.DAY_OF_MONTH, 1);
        }
    }

    @Override
    public String toString() {`,
  },
]);

patchSourceFile(path.join(localNotificationsRoot, "DateMatch.java"), [
  {
    label: "build a one-shot instant for the current timezone from persisted local date and time",
    already: "public static Date atLocalWallClock(",
    from: `    @Override
    public String toString() {`,
    to: `    public static Date atLocalWallClock(String dateISO, String configuredTime) {
        if (dateISO == null || configuredTime == null
            || !dateISO.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")
            || !configuredTime.matches("[0-9]{2}:[0-9]{2}")) {
            return null;
        }

        try {
            String[] dateParts = dateISO.split("-");
            String[] timeParts = configuredTime.split(":");
            int year = Integer.parseInt(dateParts[0]);
            int month = Integer.parseInt(dateParts[1]);
            int day = Integer.parseInt(dateParts[2]);
            int hour = Integer.parseInt(timeParts[0]);
            int minute = Integer.parseInt(timeParts[1]);
            if (year < 1970 || month < 1 || month > 12 || day < 1 || day > 31
                || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
                return null;
            }

            Calendar validation = Calendar.getInstance();
            validation.clear();
            validation.setLenient(false);
            validation.set(year, month - 1, day, 12, 0, 0);
            validation.getTimeInMillis();

            Calendar target = Calendar.getInstance();
            target.clear();
            target.set(year, month - 1, day, hour, minute, 0);
            target.set(Calendar.MILLISECOND, 0);
            return target.getTime();
        } catch (IllegalArgumentException error) {
            return null;
        }
    }

    @Override
    public String toString() {`,
  },
]);

const deferredDailyTimeZoneRebase = `                if (timeOrTimezoneChanged && at != null && schedule.isRepeating() && "day".equals(schedule.getEvery()) && schedule.getCount() == 1) {
                    JSObject extra = notification.getExtra();
                    String configuredTime = extra == null ? null : extra.getString("reminderTime");
                    if (configuredTime != null && configuredTime.matches("[0-9]{2}:[0-9]{2}")) {
                        try {
                            String[] configuredParts = configuredTime.split(":");
                            int configuredHour = Integer.parseInt(configuredParts[0]);
                            int configuredMinute = Integer.parseInt(configuredParts[1]);
                            if (configuredHour >= 0 && configuredHour <= 23 && configuredMinute >= 0 && configuredMinute <= 59) {
                                at = DateMatch.nextConfiguredLocalTimeAfter(at, configuredHour, configuredMinute, now);
                                schedule.setAt(at);
                                notification.setSchedule(schedule);

                                JSObject saved = storage.getSavedNotificationAsJSObject(id);
                                JSObject savedSchedule = saved == null ? null : saved.getJSObject("schedule");
                                if (savedSchedule != null) {
                                    SimpleDateFormat dateFormat = new SimpleDateFormat(LocalNotificationSchedule.JS_DATE_FORMAT, Locale.US);
                                    dateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
                                    savedSchedule.put("at", dateFormat.format(at));
                                    saved.put("schedule", savedSchedule);
                                    notification.setSource(saved.toString());
                                    updatedNotifications.add(notification);
                                }
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                }`;

const deferredWallClockOneShotRebase = `                if (timeOrTimezoneChanged && at != null && !schedule.isRepeating()) {
                    JSObject extra = notification.getExtra();
                    boolean followsLocalWallClock = extra != null
                        && Boolean.TRUE.equals(extra.getBool("atharWallClockOnce"));
                    if (followsLocalWallClock) {
                        Date rebasedAt = DateMatch.atLocalWallClock(
                            extra.getString("atharWallClockDateISO"),
                            extra.getString("atharWallClockTime")
                        );
                        if (rebasedAt != null) {
                            if (!rebasedAt.after(now)) {
                                cancelAlarm(context, Integer.parseInt(id));
                                storage.deleteNotification(id);
                                continue;
                            }
                            if (!rebasedAt.equals(at)) {
                                at = rebasedAt;
                                schedule.setAt(at);
                                notification.setSchedule(schedule);

                                JSObject saved = storage.getSavedNotificationAsJSObject(id);
                                JSObject savedSchedule = saved == null ? null : saved.getJSObject("schedule");
                                if (savedSchedule != null) {
                                    SimpleDateFormat dateFormat = new SimpleDateFormat(LocalNotificationSchedule.JS_DATE_FORMAT, Locale.US);
                                    dateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
                                    savedSchedule.put("at", dateFormat.format(at));
                                    saved.put("schedule", savedSchedule);
                                    notification.setSource(saved.toString());
                                    updatedNotifications.add(notification);
                                }
                            }
                        }
                    }
                }`;

patchSourceFile(path.join(localNotificationsRoot, "LocalNotificationRestoreReceiver.java"), [
  {
    label: "import alarm APIs for expired timezone-rebased notifications",
    from: "import android.content.BroadcastReceiver;",
    to: "import android.app.AlarmManager;\nimport android.app.PendingIntent;\nimport android.content.BroadcastReceiver;",
  },
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
    label: "detect clock and timezone changes while restoring alarms",
    already: "boolean timeOrTimezoneChanged = Intent.ACTION_TIME_CHANGED.equals(intent.getAction())",
    from: `        List<String> ids = storage.getSavedNotificationIds();`,
    to: `        List<String> ids = storage.getSavedNotificationIds();
        boolean timeOrTimezoneChanged = Intent.ACTION_TIME_CHANGED.equals(intent.getAction())
            || Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction())
            || "android.intent.action.TIMEZONE_OFFSET_CHANGED".equals(intent.getAction());`,
  },
  {
    label: "rebase alarms when a changed timezone is restored after reboot",
    from: `            || "android.intent.action.TIMEZONE_OFFSET_CHANGED".equals(intent.getAction());`,
    to: `            || "android.intent.action.TIMEZONE_OFFSET_CHANGED".equals(intent.getAction())
            || Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())
            || Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(intent.getAction())
            || "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction());`,
  },
  {
    label: "upgrade previously patched alarms with timezone rebasing",
    from: `                Date at = schedule.getAt();
                Date now = new Date();
${deferredDailyTimeZoneRebase}`,
    to: `                Date at = schedule.getAt();
                Date now = new Date();
${deferredWallClockOneShotRebase}
${deferredDailyTimeZoneRebase}`,
    optional: true,
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
${deferredWallClockOneShotRebase}
${deferredDailyTimeZoneRebase}
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

normalizeTimeZoneRestoreGuard(path.join(localNotificationsRoot, "LocalNotificationRestoreReceiver.java"));

patchSourceFile(path.join(localNotificationsRoot, "LocalNotificationRestoreReceiver.java"), [
  {
    label: "cancel the old native alarm when its new local time has already passed",
    from: `        localNotificationManager.schedule(null, notifications);
    }
}`,
    to: `        localNotificationManager.schedule(null, notifications);
    }

    private void cancelAlarm(Context context, int id) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent alarmIntent = new Intent(context, TimedNotificationPublisher.class);
        int flags = PendingIntent.FLAG_NO_CREATE;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, id, alarmIntent, flags);
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
        }
    }
}`,
  },
]);

const localNotificationsIosRoot = path.join(
  capacitorPackages,
  "local-notifications",
  "ios",
  "Sources",
  "LocalNotificationsPlugin",
);

patchSourceFile(path.join(localNotificationsIosRoot, "LocalNotificationsPlugin.swift"), [
  {
    label: "pass local reminder metadata into the iOS trigger builder",
    from: "try trigger = handleScheduledNotification(call, schedule)",
    to: "try trigger = handleScheduledNotification(call, schedule, notification[\"extra\"] as? JSObject ?? [:])",
  },
  {
    label: "accept reminder metadata when building an iOS trigger",
    from: "func handleScheduledNotification(_ call: CAPPluginCall, _ schedule: JSObject) throws -> UNNotificationTrigger? {",
    to: "func handleScheduledNotification(_ call: CAPPluginCall, _ schedule: JSObject, _ extra: JSObject) throws -> UNNotificationTrigger? {",
  },
  {
    label: "upgrade the prior timezone-aware iOS trigger to use exact date components",
    from: `            if extra["atharWallClockOnce"] as? Bool == true, !repeats {
                var localComponents = dateInfo
                localComponents.calendar = Calendar.autoupdatingCurrent
                localComponents.timeZone = TimeZone.autoupdatingCurrent
                return UNCalendarNotificationTrigger(dateMatching: localComponents, repeats: false)
            }
            return UNTimeIntervalNotificationTrigger(timeInterval: dateInterval.duration, repeats: repeats)`,
    to: `            if extra["atharWallClockOnce"] as? Bool == true, !repeats {
                var localComponents = Calendar.autoupdatingCurrent.dateComponents([.year, .month, .day, .hour, .minute, .second], from: at)
                localComponents.calendar = Calendar.autoupdatingCurrent
                localComponents.timeZone = TimeZone.autoupdatingCurrent
                return UNCalendarNotificationTrigger(dateMatching: localComponents, repeats: false)
            }
            return UNTimeIntervalNotificationTrigger(timeInterval: dateInterval.duration, repeats: repeats)`,
    optional: true,
  },
  {
    label: "use a floating local calendar trigger for date-specific prayer reminders",
    from: "            return UNTimeIntervalNotificationTrigger(timeInterval: dateInterval.duration, repeats: repeats)",
    to: `            if extra["atharWallClockOnce"] as? Bool == true, !repeats {
                var localComponents = Calendar.autoupdatingCurrent.dateComponents([.year, .month, .day, .hour, .minute, .second], from: at)
                localComponents.calendar = Calendar.autoupdatingCurrent
                localComponents.timeZone = TimeZone.autoupdatingCurrent
                return UNCalendarNotificationTrigger(dateMatching: localComponents, repeats: false)
            }
            return UNTimeIntervalNotificationTrigger(timeInterval: dateInterval.duration, repeats: repeats)`,
  },
]);

patchSourceFile(path.join(capacitorPackages, "local-notifications", "android", "src", "main", "AndroidManifest.xml"), [
  {
    label: "restore calendar alarms after device time or timezone changes",
    from: `                <action android:name="android.intent.action.QUICKBOOT_POWERON" />`,
    to: `                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
                <action android:name="android.intent.action.TIME_SET" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
                <action android:name="android.intent.action.TIMEZONE_OFFSET_CHANGED" />`,
  },
]);

patchSourceFile(path.join(localNotificationsRoot, "TimedNotificationPublisher.java"), [
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
  {
    label: "preserve Doze-safe delivery when rescheduling calendar repeats",
    from: `            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                Logger.warn(
                    "Capacitor/LocalNotification",
                    "Exact alarms not allowed in user settings.  Notification scheduled with non-exact alarm."
                );
                alarmManager.set(AlarmManager.RTC, trigger, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC, trigger, pendingIntent);
            }`,
    to: `            JSObject saved = new NotificationStorage(context).getSavedNotificationAsJSObject(Integer.toString(id));
            JSObject savedSchedule = saved == null ? null : saved.getJSObject("schedule");
            boolean allowWhileIdle = savedSchedule != null && Boolean.TRUE.equals(savedSchedule.getBool("allowWhileIdle"));
            boolean exactAlarmsAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms();
            if (!exactAlarmsAllowed) {
                Logger.warn(
                    "Capacitor/LocalNotification",
                    "Exact alarms not allowed in user settings.  Notification scheduled with non-exact alarm."
                );
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && allowWhileIdle) {
                if (exactAlarmsAllowed) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pendingIntent);
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pendingIntent);
                }
            } else if (exactAlarmsAllowed) {
                alarmManager.setExact(AlarmManager.RTC, trigger, pendingIntent);
            } else {
                alarmManager.set(AlarmManager.RTC, trigger, pendingIntent);
            }`,
  },
]);
