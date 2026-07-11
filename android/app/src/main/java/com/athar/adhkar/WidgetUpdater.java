package com.athar.adhkar;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

/**
 * Pushes an ACTION_APPWIDGET_UPDATE broadcast to every Athar widget provider
 * that currently has at least one widget on the home screen.
 *
 * Called from:
 *  • WidgetRefreshPlugin — right after the web app syncs fresh data
 *  • MainActivity.onPause — the moment the user returns to the home screen
 */
public final class WidgetUpdater {

    private static final Class<?>[] PROVIDERS = {
        NoorWidgetProvider.class,
        NoorCompactWidgetProvider.class,
        NoorPrayerWidgetProvider.class,
        NoorPrayerFullWidgetProvider.class,
        NoorSunnahWidgetProvider.class,
        NoorTasbeehWidgetProvider.class,
        NoorAdhkarWidgetProvider.class,
        NoorWirdWidgetProvider.class,
        NoorDashboardWidgetProvider.class,
        NoorAsmaWidgetProvider.class,
        NoorQiblaWidgetProvider.class,
    };

    private WidgetUpdater() {}

    public static void updateAll(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            if (manager == null) return;
            for (Class<?> provider : PROVIDERS) {
                try {
                    int[] ids = manager.getAppWidgetIds(new ComponentName(context, provider));
                    if (ids == null || ids.length == 0) continue;
                    Intent intent = new Intent(context, provider)
                        .setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
                    context.sendBroadcast(intent);
                } catch (Throwable ignored) {
                    // One provider failing must never block the rest.
                }
            }
        } catch (Throwable ignored) {
            // Widget refresh is best-effort; never crash the caller.
        }
    }
}
