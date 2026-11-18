package com.athar.adhkar;

import android.app.NotificationManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The Adhan alarm from the app's settings (src/lib/adhanAlarm.ts). The alarms
 * themselves follow the prayer plan (PrayerTopUp → AdhanAlarm.sync).
 *
 *   status() → { available, authorized, fullScreen }
 *   requestPermission() → opens the "Alarms & reminders" setting when needed
 *   test({ title }) → rings now
 */
@CapacitorPlugin(name = "AdhanAlarm")
public class AdhanAlarmPlugin extends Plugin {

    private JSObject status() {
        JSObject result = new JSObject();
        result.put("available", true);
        result.put("authorized", AdhanAlarm.canRingExactly(getContext()));
        boolean fullScreen = true;
        if (Build.VERSION.SDK_INT >= 34) {
            NotificationManager manager = getContext().getSystemService(NotificationManager.class);
            fullScreen = manager != null && manager.canUseFullScreenIntent();
        }
        result.put("fullScreen", fullScreen);
        return result;
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (!AdhanAlarm.canRingExactly(getContext()) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(intent);
            } catch (RuntimeException ignored) {
                // No such settings screen on this phone.
            }
        }
        call.resolve(status());
    }

    @PluginMethod
    public void test(PluginCall call) {
        Intent ring = new Intent(getContext(), AdhanAlarmService.class)
            .setAction(AdhanAlarmService.ACTION_START)
            .putExtra(AdhanAlarm.EXTRA_TITLE, call.getString("title", "تجربة منبّه الأذان"));
        ContextCompat.startForegroundService(getContext(), ring);
        call.resolve();
    }
}
