package com.athar.adhkar;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Date;

/**
 * Silence the phone during prayer (src/lib/prayerSilence.ts): at each Adhan,
 * Do Not Disturb turns on for the chosen minutes, then the phone goes back
 * to how it was. It acts only when Do Not Disturb was off, and restores only
 * the mode it set itself, so a mode the person chose meanwhile is kept.
 * Alarms (the Adhan alarm included) still ring in Do Not Disturb.
 *
 * One alarm is set for the next prayer and one for the end of the silence;
 * the times come from the prayer plan (PrayerTopUp).
 */
public class PrayerSilence extends BroadcastReceiver {
    static final String ACTION_START = "com.athar.adhkar.PRAYER_SILENCE_START";
    static final String ACTION_END = "com.athar.adhkar.PRAYER_SILENCE_END";
    private static final String PREFS = "athar_prayer_silence";
    private static final String KEY_ACTIVE = "active";
    private static final String KEY_PREVIOUS = "previous_filter";
    private static final String[] PRAYERS = {"Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"};
    private static final int START_CODE = 7320;
    private static final int END_CODE = 7321;
    private static final int LOOKAHEAD_DAYS = 14;

    static boolean allowed(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        return manager != null && manager.isNotificationPolicyAccessGranted();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static PendingIntent intent(Context context, String action, int code) {
        Intent intent = new Intent(context, PrayerSilence.class).setAction(action);
        return PendingIntent.getBroadcast(context, code, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** The next prayer time in ms with silence on, or -1. */
    static long nextStart(JSONObject plan, long nowMs) {
        JSONObject silence = plan == null ? null : plan.optJSONObject("silence");
        if (silence == null) return -1;
        JSONArray prayers = silence.optJSONArray("prayers");
        if (prayers == null || prayers.length() == 0) return -1;
        Calendar day = Calendar.getInstance();
        day.setTimeInMillis(nowMs);
        for (int offset = 0; offset < LOOKAHEAD_DAYS; offset++) {
            String dateISO = PrayerTopUp.dateKey(day);
            JSONObject times = timesFor(plan, silence, dateISO);
            long best = Long.MAX_VALUE;
            if (times != null) {
                for (String prayer : PRAYERS) {
                    if (!contains(prayers, prayer)) continue;
                    Date at = PrayerTopUp.localInstant(dateISO, times.optString(prayer, ""));
                    if (at != null && at.getTime() > nowMs && at.getTime() < best) best = at.getTime();
                }
            }
            if (best != Long.MAX_VALUE) return best;
            day.add(Calendar.DAY_OF_MONTH, 1);
        }
        return -1;
    }

    private static JSONObject timesFor(JSONObject plan, JSONObject silence, String dateISO) {
        for (JSONArray list : new JSONArray[] { silence.optJSONArray("appDays"), plan.optJSONArray("days") }) {
            if (list == null) continue;
            for (int i = 0; i < list.length(); i++) {
                JSONObject day = list.optJSONObject(i);
                if (day != null && dateISO.equals(day.optString("d"))) return day.optJSONObject("t");
            }
        }
        return null;
    }

    private static boolean contains(JSONArray values, String value) {
        for (int i = 0; i < values.length(); i++) if (value.equals(values.optString(i))) return true;
        return false;
    }

    private static void setAlarm(Context context, long at, PendingIntent operation) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms == null) return;
        boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms();
        if (exact) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation);
        } else {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation);
        }
    }

    /** Set the next start from the plan; clear everything when silence is off. */
    static void sync(Context context) {
        JSONObject plan = PrayerTopUp.loadPlan(context);
        long next = allowed(context) && PrayerTopUp.timeZoneMatches(plan) ? nextStart(plan, System.currentTimeMillis()) : -1;
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (next < 0) {
            if (alarms != null) alarms.cancel(intent(context, ACTION_START, START_CODE));
            if (plan == null || plan.optJSONObject("silence") == null) end(context);
            return;
        }
        setAlarm(context, next, intent(context, ACTION_START, START_CODE));
    }

    static void cancel(Context context) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms != null) {
            alarms.cancel(intent(context, ACTION_START, START_CODE));
            alarms.cancel(intent(context, ACTION_END, END_CODE));
        }
        end(context);
    }

    private static void start(Context context) {
        JSONObject plan = PrayerTopUp.loadPlan(context);
        JSONObject silence = plan == null ? null : plan.optJSONObject("silence");
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (silence == null || manager == null || !manager.isNotificationPolicyAccessGranted()) return;
        int current = manager.getCurrentInterruptionFilter();
        // Already in Do Not Disturb (by the person or another app): leave it alone.
        if (current != NotificationManager.INTERRUPTION_FILTER_ALL && !prefs(context).getBoolean(KEY_ACTIVE, false)) return;
        if (!prefs(context).getBoolean(KEY_ACTIVE, false)) {
            prefs(context).edit().putBoolean(KEY_ACTIVE, true).putInt(KEY_PREVIOUS, current).apply();
            manager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY);
        }
        long minutes = Math.max(5, Math.min(90, silence.optInt("minutes", 20)));
        setAlarm(context, System.currentTimeMillis() + minutes * 60_000L, intent(context, ACTION_END, END_CODE));
    }

    private static void end(Context context) {
        SharedPreferences prefs = prefs(context);
        if (!prefs.getBoolean(KEY_ACTIVE, false)) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        int previous = prefs.getInt(KEY_PREVIOUS, NotificationManager.INTERRUPTION_FILTER_ALL);
        prefs.edit().remove(KEY_ACTIVE).remove(KEY_PREVIOUS).apply();
        if (manager == null || !manager.isNotificationPolicyAccessGranted()) return;
        // Only undo our own change: a mode chosen meanwhile stays.
        if (manager.getCurrentInterruptionFilter() == NotificationManager.INTERRUPTION_FILTER_PRIORITY) {
            manager.setInterruptionFilter(previous);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (ACTION_START.equals(action)) {
            start(context);
        } else if (ACTION_END.equals(action)) {
            end(context);
        }
        sync(context);
    }
}
