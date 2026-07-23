package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.util.Locale;

/**
 * Qibla Direction Widget (2×2) — a static bearing + distance tile.
 *
 * Deliberately NOT a live compass (that needs the magnetometer running
 * continuously, which a home-screen widget can't do). Reads the same
 * last-known coordinates the app's own prayer-time calculation already
 * caches (synced via widgetDataBridge.ts → syncQiblaWidget) and computes
 * the great-circle bearing to the Kaaba with the identical formula used
 * in src/pages/Qibla.tsx, so the number always matches what the live
 * compass screen would show. Tapping opens that live screen.
 */
public class NoorQiblaWidgetProvider extends AtharWidgetProvider {

    private static final String WIDGET_KEY = "noor_widget_qibla_v1";

    // Kaaba coordinates — same authoritative values as Qibla.tsx.
    private static final double MECCA_LAT = 21.4225241;
    private static final double MECCA_LNG = 39.8261818;
    private static final double EARTH_RADIUS_KM = 6371.0;

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.widget_qibla,
            "القبلة",
            new String[] { "افتح التطبيق لتحديد موقعك" },
            "افتح البوصلة",
            "/qibla"
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            try {
                updateLive(context, manager, id);
            } catch (Throwable t) {
                // Never surface "couldn't load widget"; skip this id safely.
            }
        }
    }

    private void updateLive(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_qibla);

        boolean hasLocation = false;
        try {
            String json = WidgetData.readJson(context, WIDGET_KEY);
            if (json != null) {
                JSONObject payload = new JSONObject(json);
                double lat = payload.optDouble("lat", Double.NaN);
                double lng = payload.optDouble("lng", Double.NaN);
                if (!Double.isNaN(lat) && !Double.isNaN(lng)) {
                    double bearing = bearingTo(lat, lng);
                    double distanceKm = haversineKm(lat, lng);
                    views.setTextViewText(R.id.qibla_bearing, Math.round(bearing) + "°");
                    views.setTextViewText(R.id.qibla_direction, directionLabel(bearing));
                    views.setTextViewText(R.id.qibla_distance, formatDistance(distanceKm));
                    views.setImageViewBitmap(R.id.qibla_arrow, WidgetCanvas.compassArrow(context, 90, (float) bearing));
                    hasLocation = true;
                }
            }
        } catch (Exception ignored) {
            // fall through to placeholder state
        }

        if (!hasLocation) {
            views.setTextViewText(R.id.qibla_bearing, "--°");
            views.setTextViewText(R.id.qibla_direction, "افتح التطبيق");
            views.setTextViewText(R.id.qibla_distance, "لتحديد موقعك");
            views.setImageViewBitmap(R.id.qibla_arrow, WidgetCanvas.compassArrow(context, 90, 0f));
        }

        boolean dark = WidgetCanvas.isDarkTheme(context);
        int[] sz = WidgetCanvas.sizeDp(context, manager, appWidgetId, 150, 150);
        WidgetCanvas.ClockSky sky = WidgetCanvas.clockPhase();
        views.setImageViewBitmap(R.id.qibla_sky,
            WidgetCanvas.sky(context, sz[0], sz[1], sky.fromPhase, sky.toPhase, sky.blend,
                WidgetCanvas.outerCornerRadiusDp(context), dark));
        // Starfield only against the dark palette's actual night phases — the
        // light palette's night phases are soft twilight tones, not black.
        if (dark && sky.isNight()) {
            views.setViewVisibility(R.id.qibla_stars, android.view.View.VISIBLE);
            views.setImageViewBitmap(R.id.qibla_stars,
                WidgetCanvas.starfield(context, sz[0], sz[1], System.currentTimeMillis() / 60000));
        } else {
            views.setViewVisibility(R.id.qibla_stars, android.view.View.GONE);
        }

        PendingIntent pi = openApp(context, appWidgetId * 25, "/qibla");
        views.setOnClickPendingIntent(R.id.qibla_root, pi);

        manager.updateAppWidget(appWidgetId, views);
    }

    /** Great-circle initial bearing from (lat, lng) to the Kaaba, 0-360°. */
    private static double bearingTo(double lat, double lng) {
        double lat1 = Math.toRadians(lat);
        double lat2 = Math.toRadians(MECCA_LAT);
        double dLng = Math.toRadians(MECCA_LNG - lng);
        double y = Math.sin(dLng) * Math.cos(lat2);
        double x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        double bearing = Math.toDegrees(Math.atan2(y, x));
        return ((bearing % 360) + 360) % 360;
    }

    /** Great-circle distance from (lat, lng) to the Kaaba, in kilometers. */
    private static double haversineKm(double lat, double lng) {
        double lat1 = Math.toRadians(lat);
        double lat2 = Math.toRadians(MECCA_LAT);
        double dLat = Math.toRadians(MECCA_LAT - lat);
        double dLng = Math.toRadians(MECCA_LNG - lng);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }

    private static String directionLabel(double bearing) {
        String[] dirs = { "شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب" };
        int idx = ((int) Math.round(bearing / 45.0)) % 8;
        if (idx < 0) idx += 8;
        return dirs[idx];
    }

    private static String formatDistance(double km) {
        if (km >= 1000) return String.format(Locale.US, "%,.0f كم", km);
        return String.format(Locale.US, "%.0f كم", km);
    }
}
