package com.athar.adhkar;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** The app hands over its prayer plan here (src/lib/prayerTopUp.ts). */
@CapacitorPlugin(name = "PrayerTopUp")
public class PrayerTopUpPlugin extends Plugin {

    @PluginMethod
    public void configure(PluginCall call) {
        JSObject plan = call.getObject("plan");
        if (plan == null) {
            call.reject("plan is required");
            return;
        }
        PrayerTopUp.savePlan(getContext(), plan);
        PrayerTopUp.runSoon(getContext());
        JSObject result = new JSObject();
        result.put("queued", 0);
        call.resolve(result);
    }

    @PluginMethod
    public void clear(PluginCall call) {
        PrayerTopUp.clear(getContext());
        call.resolve();
    }
}
