package com.athar.adhkar;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Single source of truth for reading widget payloads written by the web app.
 *
 * The @capacitor/preferences plugin persists to the SharedPreferences file
 * "CapacitorStorage" using the RAW key name (e.g. "noor_widget_prayer_v2").
 * Earlier widget code expected a "CapacitorStorage."-prefixed key, which the
 * plugin never writes — so widgets always fell back to placeholders. This
 * helper reads the correct raw key first and keeps the legacy prefixed key
 * as a fallback for safety.
 */
public final class WidgetData {

    static final String PREFS_FILE = "CapacitorStorage";

    private WidgetData() {}

    /** Read a widget JSON payload by its raw key (preferred) or legacy prefixed key. */
    public static String readJson(Context context, String key) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
        String raw = prefs.getString(key, null);
        if (raw != null && !raw.isEmpty()) return raw;
        return prefs.getString("CapacitorStorage." + key, null);
    }

    /** SharedPreferences handle for widget code that needs to WRITE app-readable data. */
    public static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
    }
}
