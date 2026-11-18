package com.athar.adhkar;

import android.app.Activity;
import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Keeps the screen on while the Mushaf, the tasbeeh counter or the recitation
 * check is open (src/lib/screenAwake.ts). The flag belongs to Athar's window,
 * so Android drops it as soon as the app leaves the screen.
 *
 * JS side: registerPlugin("ScreenAwake").keepAwake() / .allowSleep()
 */
@CapacitorPlugin(name = "ScreenAwake")
public class ScreenAwakePlugin extends Plugin {

    @PluginMethod
    public void keepAwake(PluginCall call) {
        setKeepOn(call, true);
    }

    @PluginMethod
    public void allowSleep(PluginCall call) {
        setKeepOn(call, false);
    }

    private void setKeepOn(PluginCall call, boolean on) {
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }
        activity.runOnUiThread(() -> {
            if (on) activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }
}
