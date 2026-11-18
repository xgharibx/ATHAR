package com.athar.adhkar;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import androidx.core.app.NotificationManagerCompat;
import com.capacitorjs.plugins.localnotifications.LocalNotification;
import com.capacitorjs.plugins.localnotifications.LocalNotificationManager;
import com.capacitorjs.plugins.localnotifications.NotificationStorage;
import com.getcapacitor.CapConfig;
import com.getcapacitor.JSObject;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.Collections;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The notification buttons that act without opening Athar: «صلّيتُ», «تمّ»
 * and the snoozes. The notification library sends them here instead of
 * launching the app (androidBackgroundActions in capacitor.config.ts).
 *
 * The notification closes at once. A snooze is scheduled right here, with the
 * same id the app would give it; the rest («صلّيتُ», «تمّ») is kept in a small
 * queue that the app applies the moment it is open or next opens
 * (NotificationActionsPlugin, src/lib/notificationActionQueue.ts).
 */
public class NotificationActionReceiver extends BroadcastReceiver {
    private static final String TAG = "AtharNotificationAction";
    static final String PREFS = "athar_notification_actions";
    static final String KEY_QUEUE = "queue";
    private static final int MAX_QUEUE = 50;
    private static final int[] CUSTOM_SNOOZE_MINUTES = { 5, 10, 15, 30, 60 };

    interface Listener {
        void queued();
    }

    /** Set while the app is running, so a press is applied straight away. */
    static volatile Listener listener;

    @Override
    public void onReceive(Context context, Intent intent) {
        int id = intent.getIntExtra(LocalNotificationManager.NOTIFICATION_INTENT_KEY, Integer.MIN_VALUE);
        String actionId = intent.getStringExtra(LocalNotificationManager.ACTION_INTENT_KEY);
        if (actionId == null) return;
        if (id != Integer.MIN_VALUE) NotificationManagerCompat.from(context).cancel(id);

        JSONObject notification = parse(intent.getStringExtra(LocalNotificationManager.NOTIFICATION_OBJ_INTENT_KEY));
        JSONObject extra = notification.optJSONObject("extra");
        if (extra == null) extra = new JSONObject();

        boolean handled = false;
        if ("snooze_60".equals(actionId) || "snooze".equals(actionId)) {
            handled = snooze(context, actionId, notification, extra);
        }
        try {
            JSONObject item = new JSONObject();
            item.put("id", UUID.randomUUID().toString());
            item.put("actionId", actionId);
            item.put("extra", extra);
            item.put("title", notification.optString("title", ""));
            item.put("body", notification.optString("body", ""));
            item.put("handled", handled);
            item.put("at", System.currentTimeMillis());
            append(context, item);
        } catch (Exception e) {
            Log.w(TAG, "Could not keep the action", e);
        }
        Listener current = listener;
        if (current != null) current.queued();
    }

    private static JSONObject parse(String raw) {
        if (raw == null) return new JSONObject();
        try {
            return new JSONObject(raw);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static synchronized void append(Context context, JSONObject item) throws Exception {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray queue = new JSONArray(prefs.getString(KEY_QUEUE, "[]"));
        queue.put(item);
        JSONArray kept = new JSONArray();
        for (int i = Math.max(0, queue.length() - MAX_QUEUE); i < queue.length(); i++) kept.put(queue.get(i));
        prefs.edit().putString(KEY_QUEUE, kept.toString()).apply();
    }

    /** Hand over and empty the queue. */
    static synchronized JSONArray drain(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_QUEUE, "[]");
        prefs.edit().remove(KEY_QUEUE).apply();
        try {
            return new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    /** The same snooze the app schedules (src/lib/reminders.ts), with the same id. */
    private static boolean snooze(Context context, String actionId, JSONObject notification, JSONObject extra) {
        try {
            int snoozeId;
            int minutes;
            if ("snooze_60".equals(actionId)) {
                Integer known = reminderSnoozeId(extra.optString("reminderKey", ""));
                if (known == null) return false;
                snoozeId = known;
                minutes = 60;
            } else {
                String reminderId = extra.optString("reminderId", "");
                if (reminderId.isEmpty()) return false;
                minutes = customSnoozeMinutes(extra.optInt("snoozeMinutes", 10));
                long fireAt = System.currentTimeMillis() + minutes * 60_000L;
                String owner = extra.optString("accountOwner", "local");
                String ownerPart = "local".equals(owner) ? "" : encodeURIComponent(owner) + ":";
                snoozeId = numericIdFor("cr:" + ownerPart + reminderId + ":" + fireAt);
            }
            JSObject copy = JSObject.fromJSONObject(notification);
            copy.put("id", snoozeId);
            copy.put("sound", "");
            JSObject schedule = new JSObject();
            schedule.put("at", utc(new Date(System.currentTimeMillis() + minutes * 60_000L)));
            schedule.put("allowWhileIdle", true);
            copy.put("schedule", schedule);
            LocalNotification snoozed = LocalNotification.Companion.buildNotificationFromJSObject(copy);
            NotificationStorage storage = new NotificationStorage(context);
            LocalNotificationManager manager = new LocalNotificationManager(storage, null, context, CapConfig.loadDefault(context));
            if (manager.schedule(null, Collections.singletonList(snoozed), false) == null) return false;
            storage.appendNotifications(Collections.singletonList(snoozed));
            return true;
        } catch (Exception e) {
            Log.w(TAG, "Could not snooze", e);
            return false;
        }
    }

    static Integer reminderSnoozeId(String key) {
        switch (key) {
            case "morning": return 9111;
            case "evening": return 9112;
            case "dailyWird": return 9113;
            case "khatma": return 9114;
            case "tasbeeh": return 9115;
            default: return null;
        }
    }

    static int customSnoozeMinutes(int wanted) {
        for (int allowed : CUSTOM_SNOOZE_MINUTES) if (allowed == wanted) return wanted;
        return 10;
    }

    /** numericIdFor() in src/lib/customReminderNotifications.ts: FNV-1a over UTF-16, 31 bits. */
    static int numericIdFor(String scheduleId) {
        long hash = 2166136261L;
        for (int i = 0; i < scheduleId.length(); i++) {
            hash ^= scheduleId.charAt(i);
            hash = (hash * 16777619L) & 0xffffffffL;
        }
        return (int) (hash % 0x7fffffffL);
    }

    /** JavaScript's encodeURIComponent for the account id. */
    static String encodeURIComponent(String value) {
        try {
            return URLEncoder.encode(value, "UTF-8")
                .replace("+", "%20")
                .replace("%21", "!")
                .replace("%27", "'")
                .replace("%28", "(")
                .replace("%29", ")")
                .replace("%7E", "~");
        } catch (Exception e) {
            return value;
        }
    }

    private static String utc(Date date) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(date);
    }
}
