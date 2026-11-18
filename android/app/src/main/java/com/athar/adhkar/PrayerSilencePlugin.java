package com.athar.adhkar;

import android.content.Intent;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * «صامت أثناء الصلاة» from the app's settings (src/lib/prayerSilence.ts).
 * The silence itself follows the prayer plan (PrayerTopUp → PrayerSilence).
 *
 *   status() → { granted }
 *   requestAccess() → opens Android's Do Not Disturb access screen
 */
@CapacitorPlugin(name = "PrayerSilence")
public class PrayerSilencePlugin extends Plugin {
    private JSObject status() {
        JSObject result = new JSObject();
        result.put("granted", PrayerSilence.allowed(getContext()));
        return result;
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (!PrayerSilence.allowed(getContext())) {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(intent);
            } catch (RuntimeException ignored) {
                // No such settings screen on this phone.
            }
        }
        call.resolve(status());
    }
}
