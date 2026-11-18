package com.athar.adhkar;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * "You are in a new time zone — open Athar to update the prayer times." Shown
 * once per time zone when the phone's prayer plan belongs to another one, so
 * nobody is woken at the old city's Fajr.
 */
final class TravelNotice {
    private static final String CHANNEL_ID = "athar-travel-v1";
    private static final String PREFS = "athar_travel_notice";
    private static final String KEY_SHOWN_FOR = "shown_for";
    private static final int NOTIFICATION_ID = 7330;

    private TravelNotice() {}

    static void show(Context context, String planTimeZone) {
        String here = java.util.TimeZone.getDefault().getID();
        String key = planTimeZone + ">" + here;
        if (key.equals(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_SHOWN_FOR, ""))) return;
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager system = context.getSystemService(NotificationManager.class);
            if (system != null && system.getNotificationChannel(CHANNEL_ID) == null) {
                system.createNotificationChannel(new NotificationChannel(CHANNEL_ID,
                    context.getString(R.string.travel_channel), NotificationManager.IMPORTANCE_DEFAULT));
            }
        }
        Intent open = new Intent(context, AtharActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .putExtra(AtharWidgetProvider.EXTRA_ROUTE, "/prayer-times");
        PendingIntent tap = PendingIntent.getActivity(context, NOTIFICATION_ID, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            manager.notify(NOTIFICATION_ID, new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_athar_notification)
                .setContentTitle(context.getString(R.string.travel_title))
                .setContentText(context.getString(R.string.travel_text))
                .setStyle(new NotificationCompat.BigTextStyle().bigText(context.getString(R.string.travel_text)))
                .setContentIntent(tap)
                .setAutoCancel(true)
                .build());
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_SHOWN_FOR, key).apply();
        } catch (SecurityException ignored) {
            // Notifications not allowed.
        }
    }
}
