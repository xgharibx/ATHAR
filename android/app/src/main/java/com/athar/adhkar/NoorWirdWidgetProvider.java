package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * Daily Quran Wird Widget (4×2) — premium redesign.
 *
 * Hero ayah count + current surah, emerald Canvas progress bar with glow.
 * Tap continues reading exactly where the user left off (/quran).
 */
public class NoorWirdWidgetProvider extends AtharWidgetProvider {

    private static final String WIDGET_KEY = "noor_widget_wird_v1";

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.widget_wird,
            "ورد القرآن",
            new String[] { "افتح التطبيق لمزامنة الورد" },
            "متابعة القراءة",
            "/quran"
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
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_wird);

        views.setTextViewText(R.id.wird_date, dateLine());

        float progress = 0f;
        try {
            String json = WidgetData.readJson(context, WIDGET_KEY);
            if (json != null) {
                JSONObject payload  = new JSONObject(json);
                int ayahsRead       = payload.optInt("ayahsRead", 0);
                int dailyGoal       = Math.max(1, payload.optInt("dailyGoal", 10));
                String currentSurah = payload.optString("currentSurah", "");
                int currentAyah     = payload.optInt("currentAyah", 1);

                progress = Math.min(1f, ayahsRead / (float) dailyGoal);
                int pct = Math.round(progress * 100);

                views.setTextViewText(R.id.wird_ayahs_read, ayahsRead + " آية");
                views.setTextViewText(R.id.wird_goal_label, "الهدف: " + dailyGoal + " آية");
                views.setTextViewText(R.id.wird_surah_name,
                    currentSurah.isEmpty() ? "ابدأ القراءة" : "سورة " + currentSurah);
                views.setTextViewText(R.id.wird_ayah_ref, "الآية " + currentAyah);
                views.setTextViewText(R.id.wird_progress_label,
                    pct >= 100 ? "اكتمل وردك اليوم ✓" : pct + "% من الهدف");
            } else {
                views.setTextViewText(R.id.wird_ayahs_read, "--");
                views.setTextViewText(R.id.wird_goal_label, "افتح التطبيق للمزامنة");
                views.setTextViewText(R.id.wird_surah_name, "ورد القرآن");
                views.setTextViewText(R.id.wird_ayah_ref, "");
                views.setTextViewText(R.id.wird_progress_label, "");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.wird_ayahs_read, "--");
            views.setTextViewText(R.id.wird_progress_label, "");
        }

        views.setImageViewBitmap(R.id.wird_bar, WidgetCanvas.barEmerald(context, 300, 10, progress));

        PendingIntent pi = openApp(context, appWidgetId * 21, "/quran");
        views.setOnClickPendingIntent(R.id.wird_root, pi);
        views.setOnClickPendingIntent(R.id.wird_open_btn, pi);

        manager.updateAppWidget(appWidgetId, views);
    }
}
