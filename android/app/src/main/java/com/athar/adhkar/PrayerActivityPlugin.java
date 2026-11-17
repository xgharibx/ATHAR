package com.athar.adhkar;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Android side of the next-prayer countdown, to the same contract as the iOS
 * Live Activity plugin (PrayerActivityPlugin.swift), so the web app drives both
 * the same way:
 *   sync({ prayerKey, nameAr, at, startAt?, followingNameAr?, followingAt? })
 *   end()
 *   status() → { enabled, active }
 */
@CapacitorPlugin(name = "PrayerActivity")
public class PrayerActivityPlugin extends Plugin {

    @PluginMethod
    public void sync(PluginCall call) {
        String name = call.getString("nameAr");
        Double at = call.getDouble("at");
        if (name == null || name.isEmpty() || at == null || at.isNaN()) {
            call.reject("nameAr and at are required");
            return;
        }
        Context context = getContext();
        long prayerAt = at.longValue();
        JSObject result = new JSObject();
        if (prayerAt <= System.currentTimeMillis()) {
            PrayerCountdown.hide(context);
            result.put("active", false);
            call.resolve(result);
            return;
        }
        if (PrayerCountdown.dismissedFor(context, prayerAt)) {
            PrayerCountdown.hide(context);
            result.put("active", false);
            result.put("reason", "dismissed");
            call.resolve(result);
            return;
        }
        Double followingAt = call.getDouble("followingAt");
        PrayerCountdown.State state = new PrayerCountdown.State(
            name,
            prayerAt,
            call.getString("followingNameAr"),
            followingAt == null || followingAt.isNaN() ? 0 : followingAt.longValue()
        );
        boolean shown = PrayerCountdown.show(context, state);
        result.put("active", shown);
        if (!shown) result.put("reason", "disabled");
        call.resolve(result);
    }

    @PluginMethod
    public void end(PluginCall call) {
        Context context = getContext();
        PrayerCountdown.clearDismissed(context);
        PrayerCountdown.hide(context);
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        Context context = getContext();
        JSObject result = new JSObject();
        result.put("enabled", PrayerCountdown.notificationsAllowed(context));
        result.put("active", PrayerCountdown.isShowing(context));
        call.resolve(result);
    }
}
