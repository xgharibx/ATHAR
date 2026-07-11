package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * Daily Hadith Widget (4×2) — premium redesign.
 *
 * Shows the SAME real hadeethenc.com daily hadith as the home-page card:
 * text, attribution, and grade, synced from the web app the moment it
 * resolves there (widgetDataBridge.ts → syncSunnahWidget, called from
 * DailyCarousel's fetchDailyHadith effect). No AI text and nothing
 * invented on this path — every field is the value the web app itself
 * fetched from hadeethenc.com.
 *
 * Before the app has run once (no synced data yet), falls back to
 * AtharWidgetSpec's rotating real "forgotten sunnah" phrases rather than
 * showing a blank widget. Living-sky background, same treatment as the
 * other Canvas-rendered widgets.
 */
public class NoorSunnahWidgetProvider extends AtharWidgetProvider {

    private static final String WIDGET_KEY = "noor_widget_sunnah_v1";

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.noor_widget_sunnah,
            "حديث اليوم",
            new String[] {
                "أفشوا السلام بينكم",
                "السواك مطهرة للفم مرضاة للرب",
                "ادع لأخيك بظهر الغيب",
                "ابدأ باليمين في اللباس والطهور",
                "تبسمك في وجه أخيك صدقة"
            },
            "المصدر الكامل",
            "/library/sharh"
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
        AtharWidgetSpec spec = getSpec();
        RemoteViews views = new RemoteViews(context.getPackageName(), spec.layoutId);

        views.setTextViewText(R.id.noor_widget_title, spec.title);
        views.setTextViewText(R.id.noor_widget_date, dateLine());

        String route = spec.route;
        boolean hasRealHadith = false;
        try {
            String json = WidgetData.readJson(context, WIDGET_KEY);
            if (json != null) {
                JSONObject payload = new JSONObject(json);
                String hadeeth = payload.optString("hadeeth", "");
                String attribution = payload.optString("attribution", "");
                String grade = payload.optString("grade", "");
                String id = payload.optString("id", "");
                if (!hadeeth.isEmpty()) {
                    views.setTextViewText(R.id.noor_widget_phrase, hadeeth);
                    String attrLine = grade.isEmpty() ? attribution : attribution + " · " + grade;
                    if (!attrLine.isEmpty()) {
                        views.setTextViewText(R.id.sunnah_attribution, attrLine);
                        views.setViewVisibility(R.id.sunnah_attribution, android.view.View.VISIBLE);
                    } else {
                        views.setViewVisibility(R.id.sunnah_attribution, android.view.View.GONE);
                    }
                    views.setTextViewText(R.id.noor_widget_action, "المصدر الكامل");
                    if (!id.isEmpty()) route = "/library/sharh?h=" + id;
                    hasRealHadith = true;
                }
            }
        } catch (Exception ignored) {
            // fall through to the static-phrase fallback below
        }

        if (!hasRealHadith) {
            views.setTextViewText(R.id.noor_widget_phrase, spec.resolvePhrase());
            views.setTextViewText(R.id.noor_widget_action, "سنن اليوم");
            views.setViewVisibility(R.id.sunnah_attribution, android.view.View.GONE);
            route = "/library/hadith";
        }

        WidgetCanvas.ClockSky sky = WidgetCanvas.clockPhase();
        views.setImageViewBitmap(R.id.sunnah_sky,
            WidgetCanvas.sky(context, 250, 110, sky.fromPhase, sky.toPhase, sky.blend, 26f));
        if (sky.isNight()) {
            views.setViewVisibility(R.id.sunnah_stars, android.view.View.VISIBLE);
            views.setImageViewBitmap(R.id.sunnah_stars,
                WidgetCanvas.starfield(context, 250, 110, 26, System.currentTimeMillis() / 60000));
        } else {
            views.setViewVisibility(R.id.sunnah_stars, android.view.View.GONE);
        }

        PendingIntent pi = openApp(context, appWidgetId * 26, route);
        views.setOnClickPendingIntent(R.id.noor_widget_root, pi);
        views.setOnClickPendingIntent(R.id.noor_widget_action, pi);

        manager.updateAppWidget(appWidgetId, views);
    }
}
