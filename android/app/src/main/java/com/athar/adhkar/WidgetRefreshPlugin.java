package com.athar.adhkar;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Tiny bridge so the web app can refresh home-screen widgets the instant it
 * writes fresh data via @capacitor/preferences (instead of waiting for the
 * 30-minute updatePeriodMillis cycle).
 *
 * JS side: registerPlugin("WidgetRefresh").refresh()
 */
@CapacitorPlugin(name = "WidgetRefresh")
public class WidgetRefreshPlugin extends Plugin {

    @PluginMethod
    public void refresh(PluginCall call) {
        WidgetUpdater.updateAll(getContext());
        call.resolve();
    }
}
