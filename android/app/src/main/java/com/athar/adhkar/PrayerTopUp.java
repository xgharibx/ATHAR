package com.athar.adhkar;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.capacitorjs.plugins.localnotifications.LocalNotification;
import com.capacitorjs.plugins.localnotifications.LocalNotificationManager;
import com.capacitorjs.plugins.localnotifications.NotificationStorage;
import com.getcapacitor.CapConfig;
import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.TimeUnit;

/**
 * Keeps the Adhan coming while the app stays closed (src/lib/prayerTopUp.ts).
 *
 * The app queues its own week of prayer alarms and hands over a plan: a year
 * of offline prayer times and each prayer's notification. Twice a day, and
 * whenever the plan changes, this queues the days after the app's week, up to
 * ten days ahead, through the same notification plugin the app uses. The
 * alerts are the app's own: the same channel and Adhan sound, the same ids,
 * the same "prayed" button, and they follow the wall clock across time zones.
 */
final class PrayerTopUp {
    private static final String TAG = "PrayerTopUp";
    private static final String PREFS = "athar_prayer_top_up";
    private static final String KEY_PLAN = "plan_v1";
    private static final String PERIODIC_WORK = "athar-prayer-top-up";
    private static final String NOW_WORK = "athar-prayer-top-up-now";
    private static final String[] PRAYERS = {"Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"};
    /** Never replay an Adhan whose time has come. */
    private static final long MIN_LEAD_MS = 30_000L;

    private PrayerTopUp() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void savePlan(Context context, JSONObject plan) {
        prefs(context).edit().putString(KEY_PLAN, plan.toString()).apply();
        ensureScheduled(context);
    }

    static void clear(Context context) {
        prefs(context).edit().remove(KEY_PLAN).apply();
        WorkManager.getInstance(context).cancelUniqueWork(PERIODIC_WORK);
    }

    /** The twice-daily job; kept as is if it already exists. */
    static void ensureScheduled(Context context) {
        if (prefs(context).getString(KEY_PLAN, null) == null) return;
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(PrayerTopUpWorker.class, 12, TimeUnit.HOURS).build();
        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(PERIODIC_WORK, ExistingPeriodicWorkPolicy.KEEP, request);
    }

    /** Queue now, off the main thread. */
    static void runSoon(Context context) {
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(PrayerTopUpWorker.class).build();
        WorkManager.getInstance(context).enqueueUniqueWork(NOW_WORK, ExistingWorkPolicy.REPLACE, request);
    }

    static String dateKey(Calendar day) {
        return String.format(Locale.US, "%04d-%02d-%02d",
            day.get(Calendar.YEAR), day.get(Calendar.MONTH) + 1, day.get(Calendar.DAY_OF_MONTH));
    }

    /** The local instant of a date and "HH:mm", or null when it does not exist. */
    static Date localInstant(String dateISO, String hhmm) {
        try {
            String[] date = dateISO.split("-");
            String[] time = hhmm.split(":");
            Calendar at = Calendar.getInstance();
            at.clear();
            at.set(Integer.parseInt(date[0]), Integer.parseInt(date[1]) - 1, Integer.parseInt(date[2]),
                Integer.parseInt(time[0]), Integer.parseInt(time[1].substring(0, 2)), 0);
            return at.getTime();
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String utc(Date date) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(date);
    }

    /** Queue the days after the app's own week that fall inside the window. Returns how many. */
    static synchronized int run(Context context) {
        String raw = prefs(context).getString(KEY_PLAN, null);
        if (raw == null) return 0;
        try {
            JSONObject plan = new JSONObject(raw);
            List<JSObject> wanted = notificationsToQueue(plan, Calendar.getInstance(), System.currentTimeMillis());
            if (wanted.isEmpty()) return 0;

            List<LocalNotification> notifications = new ArrayList<>(wanted.size());
            for (JSObject json : wanted) {
                notifications.add(LocalNotification.Companion.buildNotificationFromJSObject(json));
            }
            NotificationStorage storage = new NotificationStorage(context);
            LocalNotificationManager manager =
                new LocalNotificationManager(storage, null, context, CapConfig.loadDefault(context));
            if (manager.schedule(null, notifications, false) == null) return 0;
            storage.appendNotifications(notifications);
            return notifications.size();
        } catch (Exception e) {
            Log.w(TAG, "Could not queue prayer alerts", e);
            return 0;
        }
    }

    /** Pure planning step: which notifications to queue, given today and now. */
    static List<JSObject> notificationsToQueue(JSONObject plan, Calendar today, long nowMs) throws Exception {
        List<JSObject> result = new ArrayList<>();
        String scheduledThrough = plan.getString("scheduledThrough");
        int slotOffset = plan.getInt("slotOffset");
        int windowDays = Math.max(1, plan.getInt("windowDays"));
        JSONObject templates = plan.getJSONObject("templates");
        JSONArray days = plan.getJSONArray("days");

        Calendar last = (Calendar) today.clone();
        last.add(Calendar.DAY_OF_MONTH, windowDays - 1);
        String todayKey = dateKey(today);
        String lastKey = dateKey(last);

        for (int i = 0; i < days.length(); i++) {
            JSONObject day = days.getJSONObject(i);
            String dateISO = day.getString("d");
            if (dateISO.compareTo(scheduledThrough) <= 0 || dateISO.compareTo(todayKey) < 0) continue;
            if (dateISO.compareTo(lastKey) > 0) break;
            JSONObject times = day.getJSONObject("t");
            int slot = day.getInt("s");
            for (String prayer : PRAYERS) {
                JSONObject template = templates.optJSONObject(prayer);
                String hhmm = times.optString(prayer, "");
                if (template == null || hhmm.isEmpty()) continue;
                Date at = localInstant(dateISO, hhmm);
                if (at == null || at.getTime() <= nowMs + MIN_LEAD_MS) continue;

                JSObject notification = JSObject.fromJSONObject(template.getJSONObject("notification"));
                notification.put("id", template.getInt("baseId") + slot * slotOffset);
                JSObject schedule = new JSObject();
                schedule.put("at", utc(at));
                schedule.put("allowWhileIdle", true);
                notification.put("schedule", schedule);

                JSONObject templateExtra = template.getJSONObject("notification").optJSONObject("extra");
                JSObject extra = new JSObject();
                if (templateExtra != null) {
                    Iterator<String> keys = templateExtra.keys();
                    while (keys.hasNext()) {
                        String key = keys.next();
                        extra.put(key, templateExtra.get(key));
                    }
                }
                extra.put("dateISO", dateISO);
                extra.put("atharWallClockOnce", true);
                extra.put("atharWallClockDateISO", dateISO);
                extra.put("atharWallClockTime", hhmm.substring(0, 5));
                notification.put("extra", extra);
                result.add(notification);
            }
        }
        return result;
    }
}
