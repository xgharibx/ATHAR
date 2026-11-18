package com.athar.adhkar.wear;

import android.content.ComponentName;
import android.content.Context;

import androidx.wear.tiles.TileService;
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester;

/**
 * The prayer times the phone last sent, kept on the watch, so the tile and the
 * watch-face complication can show the next prayer without the app open.
 */
final class PrayerStore {
    private static final String PREFS = "athar_wear_prayer";
    private static final String KEY = "json";

    private PrayerStore() {}

    static String load(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
    }

    /** Save new times and redraw the tile and the complication. */
    static void save(Context context, String json) {
        if (json == null || json.equals(load(context))) return;
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply();
        refresh(context);
    }

    static void refresh(Context context) {
        try {
            TileService.getUpdater(context).requestUpdate(PrayerTileService.class);
            ComplicationDataSourceUpdateRequester
                .create(context, new ComponentName(context, PrayerComplicationService.class))
                .requestUpdateAll();
        } catch (RuntimeException ignored) {
            // Nothing on the watch face uses them yet.
        }
    }
}
