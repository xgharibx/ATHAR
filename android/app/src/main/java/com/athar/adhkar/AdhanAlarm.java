package com.athar.adhkar;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Date;

/**
 * The Adhan as a real alarm (src/lib/adhanAlarm.ts). One system alarm clock
 * is set for the next chosen prayer — the alarm-clock icon shows in the status
 * bar — and when it rings, the next one is set. The times come from the same
 * plan as the prayer alerts (PrayerTopUp): the app's own times for its week,
 * then a year of offline times.
 */
final class AdhanAlarm {
    static final String ACTION_RING = "com.athar.adhkar.ADHAN_ALARM_RING";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_SOUND = "sound";
    private static final String[] PRAYERS = {"Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"};
    private static final int REQUEST_CODE = 7310;
    private static final long MIN_LEAD_MS = 30_000L;
    private static final int LOOKAHEAD_DAYS = 14;

    private AdhanAlarm() {}

    /** The next alarm: { time in ms, title, sound }, or null. */
    static Object[] next(JSONObject plan, long nowMs) {
        JSONObject alarm = plan == null ? null : plan.optJSONObject("alarm");
        if (alarm == null) return null;
        JSONArray prayers = alarm.optJSONArray("prayers");
        if (prayers == null || prayers.length() == 0) return null;
        JSONObject names = alarm.optJSONObject("names");
        JSONObject sound = alarm.optJSONObject("sound");
        String soundName = sound == null ? null : sound.optString("android", null);

        Calendar day = Calendar.getInstance();
        day.setTimeInMillis(nowMs);
        for (int offset = 0; offset < LOOKAHEAD_DAYS; offset++) {
            String dateISO = PrayerTopUp.dateKey(day);
            JSONObject times = timesFor(plan, alarm, dateISO);
            if (times != null) {
                long best = Long.MAX_VALUE;
                String bestPrayer = null;
                for (String prayer : PRAYERS) {
                    if (!contains(prayers, prayer)) continue;
                    String hhmm = times.optString(prayer, "");
                    if (hhmm.isEmpty()) continue;
                    Date at = PrayerTopUp.localInstant(dateISO, hhmm);
                    if (at == null || at.getTime() <= nowMs + MIN_LEAD_MS) continue;
                    if (at.getTime() < best) {
                        best = at.getTime();
                        bestPrayer = prayer;
                    }
                }
                if (bestPrayer != null) {
                    String name = names == null ? bestPrayer : names.optString(bestPrayer, bestPrayer);
                    return new Object[] { best, "حان وقت صلاة " + name, soundName };
                }
            }
            day.add(Calendar.DAY_OF_MONTH, 1);
        }
        return null;
    }

    /** The app's own times for its week first, then the offline plan. */
    private static JSONObject timesFor(JSONObject plan, JSONObject alarm, String dateISO) {
        JSONArray appDays = alarm.optJSONArray("appDays");
        if (appDays != null) {
            for (int i = 0; i < appDays.length(); i++) {
                JSONObject day = appDays.optJSONObject(i);
                if (day != null && dateISO.equals(day.optString("d"))) return day.optJSONObject("t");
            }
        }
        JSONArray days = plan.optJSONArray("days");
        if (days != null) {
            for (int i = 0; i < days.length(); i++) {
                JSONObject day = days.optJSONObject(i);
                if (day != null && dateISO.equals(day.optString("d"))) return day.optJSONObject("t");
            }
        }
        return null;
    }

    private static boolean contains(JSONArray values, String value) {
        for (int i = 0; i < values.length(); i++) if (value.equals(values.optString(i))) return true;
        return false;
    }

    private static PendingIntent ringIntent(Context context, String title, String sound) {
        Intent intent = new Intent(context, AdhanAlarmReceiver.class)
            .setAction(ACTION_RING)
            .putExtra(EXTRA_TITLE, title)
            .putExtra(EXTRA_SOUND, sound);
        return PendingIntent.getBroadcast(context, REQUEST_CODE, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static boolean canRingExactly(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        return alarms != null && alarms.canScheduleExactAlarms();
    }

    /** Set the next alarm from the saved plan, or clear it when the alarm is off. */
    static void sync(Context context) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms == null) return;
        Object[] next = next(PrayerTopUp.loadPlan(context), System.currentTimeMillis());
        if (next == null) {
            alarms.cancel(ringIntent(context, "", ""));
            return;
        }
        long at = (Long) next[0];
        PendingIntent ring = ringIntent(context, (String) next[1], (String) next[2]);
        boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms();
        if (exact) {
            Intent open = new Intent(context, AtharActivity.class)
                .putExtra(AtharWidgetProvider.EXTRA_ROUTE, "/prayer-times");
            PendingIntent show = PendingIntent.getActivity(context, REQUEST_CODE, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            alarms.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), ring);
        } else {
            // Without the exact-alarm permission Android may ring a few minutes late.
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, ring);
        }
    }

    static void cancel(Context context) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms != null) alarms.cancel(ringIntent(context, "", ""));
    }
}
