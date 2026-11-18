package com.athar.adhkar;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

/** Rings the Adhan alarm, and sets it again after a reboot or a clock change. */
public class AdhanAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (AdhanAlarm.ACTION_RING.equals(intent.getAction())) {
            Intent ring = new Intent(context, AdhanAlarmService.class)
                .setAction(AdhanAlarmService.ACTION_START)
                .putExtra(AdhanAlarm.EXTRA_TITLE, intent.getStringExtra(AdhanAlarm.EXTRA_TITLE))
                .putExtra(AdhanAlarm.EXTRA_SOUND, intent.getStringExtra(AdhanAlarm.EXTRA_SOUND));
            // An alarm clock may start a foreground service from the background.
            try {
                ContextCompat.startForegroundService(context, ring);
            } catch (RuntimeException e) {
                // Android refused (no exact-alarm permission): nothing can ring now.
            }
        }
        // The next prayer's alarm, also after boot, clock or time-zone changes;
        // the prayer silence re-arms on the same events.
        AdhanAlarm.sync(context);
        if (!AdhanAlarm.ACTION_RING.equals(intent.getAction())) {
            PrayerSilence.sync(context);
            // A new time zone: check the plan now (TravelNotice).
            PrayerTopUp.runSoon(context);
        }
    }
}
