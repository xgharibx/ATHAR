package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Daily Quran Wird Progress Widget (4×2)
 *
 * Reads Quran reading data written by widgetDataBridge.ts:
 *   SharedPreferences file : "CapacitorStorage"
 *   Key                    : "CapacitorStorage.noor_widget_wird_v1"
 *
 * Payload JSON shape:
 *   {
 *     "ayahsRead": 15,
 *     "dailyGoal": 20,
 *     "currentSurah": "البقرة",
 *     "currentAyah": 45,
 *     "updatedAt": "2024-01-15T09:30:00Z"
 *   }
 *
 * Shows:
 *   • Big count "15 آية" read today
 *   • Current surah name + ayah reference (Arabic)
 *   • Gold progress bar (ayahsRead / dailyGoal)
 *   • "متابعة القراءة" button to open the app
 */
public class NoorWirdWidgetProvider extends AtharWidgetProvider {

    private static final String PREFS_FILE = "CapacitorStorage";
    private static final String WIDGET_KEY = "CapacitorStorage.noor_widget_wird_v1";

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.widget_wird,
            "ورد القرآن",
            new String[] { "افتح التطبيق لمزامنة الورد" },
            "متابعة القراءة"
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            updateLive(context, manager, id);
        }
    }

    private void updateLive(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(
            context.getPackageName(), R.layout.widget_wird);

        // Date header
        SimpleDateFormat dateFmt = new SimpleDateFormat("EEEE، d MMMM", new Locale("ar"));
        views.setTextViewText(R.id.wird_date, dateFmt.format(new Date()));

        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
            String json = prefs.getString(WIDGET_KEY, null);

            if (json != null) {
                JSONObject payload    = new JSONObject(json);
                int ayahsRead         = payload.optInt("ayahsRead", 0);
                int dailyGoal         = payload.optInt("dailyGoal", 20);
                String currentSurah   = payload.optString("currentSurah", "");
                int currentAyah       = payload.optInt("currentAyah", 1);

                // Reading count
                views.setTextViewText(R.id.wird_ayahs_read, ayahsRead + " آية");
                views.setTextViewText(R.id.wird_goal_label,
                    "من " + dailyGoal + " الهدف اليومي");

                // Current position
                if (!currentSurah.isEmpty()) {
                    views.setTextViewText(R.id.wird_surah_name, "سورة " + currentSurah);
                    views.setTextViewText(R.id.wird_ayah_ref, "الآية " + toArabicNumerals(currentAyah));
                } else {
                    views.setTextViewText(R.id.wird_surah_name, "لم تبدأ بعد");
                    views.setTextViewText(R.id.wird_ayah_ref, "افتح المصحف");
                }

                // Progress bar
                int pct = dailyGoal > 0 ? Math.min(100, (ayahsRead * 100) / dailyGoal) : 0;
                setProgressBar(views, pct);

                // Progress label
                String label = pct >= 100
                    ? "أتممت ورد اليوم ✓"
                    : pct + "٪ من الهدف";
                views.setTextViewText(R.id.wird_progress_label, label);

            } else {
                views.setTextViewText(R.id.wird_ayahs_read, "—");
                views.setTextViewText(R.id.wird_goal_label, "");
                views.setTextViewText(R.id.wird_surah_name, "افتح التطبيق");
                views.setTextViewText(R.id.wird_ayah_ref, "لتحميل الورد");
                views.setTextViewText(R.id.wird_progress_label, "لا توجد بيانات");
                setProgressBar(views, 0);
            }

        } catch (Exception e) {
            views.setTextViewText(R.id.wird_ayahs_read, "—");
            views.setTextViewText(R.id.wird_surah_name, "تعذّر التحميل");
            views.setTextViewText(R.id.wird_ayah_ref, "");
            views.setTextViewText(R.id.wird_progress_label, "");
            setProgressBar(views, 0);
        }

        // Tap → open app
        Intent intent = new Intent(context, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            context, appWidgetId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.wird_root, pi);
        views.setOnClickPendingIntent(R.id.wird_open_btn, pi);

        manager.updateAppWidget(appWidgetId, views);
    }

    // ─────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────

    private void setProgressBar(RemoteViews views, int pct) {
        if (pct <= 0) {
            views.setViewVisibility(R.id.wird_progress_fill, View.INVISIBLE);
        } else {
            views.setViewVisibility(R.id.wird_progress_fill, View.VISIBLE);
            float scale = Math.min(1f, pct / 100f);
            views.setFloat(R.id.wird_progress_fill, "setScaleX", scale);
            views.setFloat(R.id.wird_progress_fill, "setPivotX", 0f);
        }
    }

    /** Convert an integer to Eastern Arabic (Indic) numerals used in Arabic text. */
    private String toArabicNumerals(int n) {
        String s = String.valueOf(n);
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (c >= '0' && c <= '9') {
                sb.append((char) ('\u0660' + (c - '0')));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
