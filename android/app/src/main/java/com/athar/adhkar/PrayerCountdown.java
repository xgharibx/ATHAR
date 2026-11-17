package com.athar.adhkar;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.service.notification.StatusBarNotification;
import android.text.format.DateFormat;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import java.util.Date;

/**
 * The next prayer as an ongoing notification whose system timer counts down to
 * the adhan: Android's counterpart to the iPhone's Live Activity. It sits in
 * the notification shade and on the Lock Screen without the app running.
 *
 * At the adhan an alarm moves it on to the prayer after (PrayerCountdownReceiver),
 * so it keeps going even if the app stays closed. If the person swipes it
 * away, it stays away for that prayer and returns for the next one.
 */
final class PrayerCountdown {

    static final String CHANNEL = "athar-prayer-countdown";
    static final int NOTIFICATION_ID = 73010;
    private static final String PREFS = "athar_prayer_countdown";
    private static final String DISMISSED_AT = "dismissedAt";
    /** How long the last known prayer stays shown after its adhan. */
    private static final long LINGER_MS = 20 * 60 * 1000;

    static final class State {
        final String nameAr;
        final long at;
        @Nullable final String followingNameAr;
        final long followingAt;

        State(String nameAr, long at, @Nullable String followingNameAr, long followingAt) {
            this.nameAr = nameAr;
            this.at = at;
            boolean hasFollowing = followingNameAr != null && !followingNameAr.isEmpty() && followingAt > at;
            this.followingNameAr = hasFollowing ? followingNameAr : null;
            this.followingAt = hasFollowing ? followingAt : 0;
        }
    }

    private PrayerCountdown() {}

    static boolean notificationsAllowed(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = manager.getNotificationChannel(CHANNEL);
            return channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
        }
        return true;
    }

    static boolean isShowing(Context context) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return false;
        for (StatusBarNotification notification : manager.getActiveNotifications()) {
            if (notification.getId() == NOTIFICATION_ID) return true;
        }
        return false;
    }

    static boolean dismissedFor(Context context, long at) {
        return prefs(context).getLong(DISMISSED_AT, 0) == at;
    }

    static void markDismissed(Context context, long at) {
        prefs(context).edit().putLong(DISMISSED_AT, at).apply();
        cancelAlarm(context);
    }

    static void clearDismissed(Context context) {
        prefs(context).edit().remove(DISMISSED_AT).apply();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL, "عدّاد الصلاة القادمة", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("عدّ تنازلي صامت للصلاة القادمة");
        channel.setShowBadge(false);
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(channel);
    }

    /** Show (or update) the countdown, and move it on at the adhan. Returns false if it cannot be shown. */
    @SuppressLint("MissingPermission") // checked by notificationsAllowed()
    static boolean show(Context context, State state) {
        if (!notificationsAllowed(context)) return false;
        ensureChannel(context);
        long now = System.currentTimeMillis();
        String adhan = DateFormat.getTimeFormat(context).format(new Date(state.at));
        String text = state.followingNameAr != null
            ? "الأذان " + adhan + " · ثم " + state.followingNameAr
            : "الأذان " + adhan;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_athar_notification)
            .setContentTitle("الصلاة القادمة: " + state.nameAr)
            .setContentText(text)
            // The system's own timer counts down to the adhan; nothing needs to run.
            .setWhen(state.at)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(AtharWidgetProvider.openApp(context, NOTIFICATION_ID, "/prayer-times"))
            .setDeleteIntent(receiverIntent(context, PrayerCountdownReceiver.ACTION_DISMISSED, state, 1));
        if (state.followingNameAr == null) {
            // Nothing known after this prayer: clear it a little after the adhan.
            builder.setTimeoutAfter(Math.max(1, state.at - now + LINGER_MS));
        }
        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build());

        if (state.followingNameAr != null) scheduleAdvance(context, state);
        else cancelAlarm(context);
        return true;
    }

    static void hide(Context context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID);
        cancelAlarm(context);
    }

    private static PendingIntent receiverIntent(Context context, String action, State state, int requestCode) {
        Intent intent = new Intent(context, PrayerCountdownReceiver.class)
            .setAction(action)
            .putExtra(PrayerCountdownReceiver.EXTRA_AT, state.at)
            .putExtra(PrayerCountdownReceiver.EXTRA_FOLLOWING_NAME, state.followingNameAr)
            .putExtra(PrayerCountdownReceiver.EXTRA_FOLLOWING_AT, state.followingAt);
        return PendingIntent.getBroadcast(
            context,
            NOTIFICATION_ID + requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static void scheduleAdvance(Context context, State state) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        PendingIntent advance = receiverIntent(context, PrayerCountdownReceiver.ACTION_ADVANCE, state, 2);
        boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms();
        if (exact) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, state.at, advance);
        else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, state.at, advance);
    }

    private static void cancelAlarm(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        Intent intent = new Intent(context, PrayerCountdownReceiver.class).setAction(PrayerCountdownReceiver.ACTION_ADVANCE);
        PendingIntent existing = PendingIntent.getBroadcast(
            context,
            NOTIFICATION_ID + 2,
            intent,
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        if (existing != null) {
            alarms.cancel(existing);
            existing.cancel();
        }
    }
}
