package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * Daily Adhkar Progress Widget (4×2) — premium redesign.
 *
 * Live data from noor_widget_adhkar_v1 rendered as Canvas gradient bars:
 * sunrise gold for الصباح, dusk indigo for المساء, with soft glow.
 */
public class NoorAdhkarWidgetProvider extends AtharWidgetProvider {

    private static final String WIDGET_KEY = "noor_widget_adhkar_v1";

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.widget_adhkar_progress,
            "أذكاري اليوم",
            new String[] { "افتح التطبيق لمزامنة التقدم" },
            "افتح الأذكار",
            "/c/morning"
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
        RemoteViews views = new RemoteViews(
            context.getPackageName(), R.layout.widget_adhkar_progress);

        views.setTextViewText(R.id.adhkar_date, dateLine());

        float morningP = 0f;
        float eveningP = 0f;
        try {
            String json = WidgetData.readJson(context, WIDGET_KEY);
            if (json != null) {
                JSONObject payload  = new JSONObject(json);
                JSONObject morning  = payload.optJSONObject("morning");
                JSONObject evening  = payload.optJSONObject("evening");

                int morningDone  = morning  != null ? morning.optInt("done", 0)   : 0;
                int morningTotal = morning  != null ? morning.optInt("total", 31) : 31;
                int eveningDone  = evening  != null ? evening.optInt("done", 0)   : 0;
                int eveningTotal = evening  != null ? evening.optInt("total", 30) : 30;

                views.setTextViewText(R.id.adhkar_morning_count, morningDone + "/" + morningTotal);
                views.setTextViewText(R.id.adhkar_evening_count, eveningDone + "/" + eveningTotal);
                morningP = morningTotal > 0 ? morningDone / (float) morningTotal : 0f;
                eveningP = eveningTotal > 0 ? eveningDone / (float) eveningTotal : 0f;
            } else {
                views.setTextViewText(R.id.adhkar_morning_count, "افتح التطبيق");
                views.setTextViewText(R.id.adhkar_evening_count, "--");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.adhkar_morning_count, "--");
            views.setTextViewText(R.id.adhkar_evening_count, "--");
        }

        views.setImageViewBitmap(R.id.adhkar_morning_bar, WidgetCanvas.barGold(context, 300, 9, morningP));
        views.setImageViewBitmap(R.id.adhkar_evening_bar, WidgetCanvas.barDusk(context, 300, 9, eveningP));

        // Living sky: no prayer-schedule data here, so the mood is derived
        // purely from wall-clock time instead of the actual next prayer.
        boolean dark = WidgetCanvas.isDarkTheme(context);
        WidgetCanvas.ClockSky sky = WidgetCanvas.clockPhase();
        views.setImageViewBitmap(R.id.adhkar_sky,
            WidgetCanvas.sky(context, 250, 110, sky.fromPhase, sky.toPhase, sky.blend, 26f, dark));
        // Starfield only against the dark palette's actual night phases — the
        // light palette's night phases are soft twilight tones, not black.
        if (dark && sky.isNight()) {
            views.setViewVisibility(R.id.adhkar_stars, android.view.View.VISIBLE);
            views.setImageViewBitmap(R.id.adhkar_stars,
                WidgetCanvas.starfield(context, 250, 110, 26, System.currentTimeMillis() / 60000));
        } else {
            views.setViewVisibility(R.id.adhkar_stars, android.view.View.GONE);
        }

        PendingIntent morningPi = openApp(context, appWidgetId * 20, "/c/morning");
        views.setOnClickPendingIntent(R.id.adhkar_root, morningPi);
        views.setOnClickPendingIntent(R.id.adhkar_open_btn, morningPi);

        manager.updateAppWidget(appWidgetId, views);
    }
}
