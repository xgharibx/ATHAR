package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * Qadaa Widget (4×2).
 *
 * Shows what is left of the missed prayers, today's share of the plan and a
 * progress bar. It is read-only on purpose: the numbers live in the app and
 * merge across devices there, and a counter that could also be bumped from the
 * launcher would need its own ledger to avoid losing taps. Tapping opens the
 * Qadaa page, where logging is one tap.
 */
public class NoorQadaaWidgetProvider extends AtharWidgetProvider {

    private static final String WIDGET_KEY = "noor_widget_qadaa_v1";

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.widget_qadaa,
            "قضاء الفوائت",
            new String[] { "افتح التطبيق لمزامنة القضاء" },
            "سجّل قضاء",
            "/qadaa"
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
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_qadaa);

        // No date line: it wraps to two lines and squeezes the count out at the default size.
        views.setTextViewText(R.id.qadaa_date, "");

        float progress = 0f;
        try {
            String json = WidgetData.readJson(context, WIDGET_KEY);
            JSONObject payload = json != null ? new JSONObject(json) : null;
            if (payload != null && payload.optBoolean("configured", false)) {
                int remaining = Math.max(0, payload.optInt("remaining", 0));
                int percent = Math.max(0, Math.min(100, payload.optInt("percent", 0)));
                int quotaTotal = Math.max(0, payload.optInt("quotaTotal", 0));
                int quotaLeft = Math.max(0, payload.optInt("quotaLeft", 0));
                int streak = Math.max(0, payload.optInt("streak", 0));
                int fastRemaining = Math.max(0, payload.optInt("fastRemaining", 0));

                progress = percent / 100f;
                if (remaining == 0 && payload.optInt("owed", 0) > 0) {
                    views.setTextViewText(R.id.qadaa_ayahs_read, "✓");
                    views.setTextViewText(R.id.qadaa_goal_label, "أتممتَ قضاء الصلوات");
                } else {
                    views.setTextViewText(R.id.qadaa_ayahs_read, arabicDigits(remaining) + " صلاة");
                    views.setTextViewText(R.id.qadaa_goal_label, "صلاة متبقية");
                }

                if (quotaTotal > 0) {
                    views.setTextViewText(R.id.qadaa_surah_name,
                        quotaLeft == 0 ? "أتممتَ حصة اليوم"
                            : "اليوم " + arabicDigits(quotaTotal - quotaLeft) + "/" + arabicDigits(quotaTotal));
                } else {
                    views.setTextViewText(R.id.qadaa_surah_name, "لا حصة اليوم");
                }
                views.setTextViewText(R.id.qadaa_ayah_ref,
                    fastRemaining > 0 ? arabicDigits(fastRemaining) + " صيام متبقٍ" : "");
                views.setTextViewText(R.id.qadaa_progress_label,
                    arabicDigits(percent) + "٪ مكتمل"
                        + (streak > 1 ? " · " + arabicDigits(streak) + " أيام متتابعة" : ""));
            } else {
                views.setTextViewText(R.id.qadaa_ayahs_read, "--");
                views.setTextViewText(R.id.qadaa_goal_label, "ابدأ خطة القضاء من التطبيق");
                views.setTextViewText(R.id.qadaa_surah_name, "قضاء الفوائت");
                views.setTextViewText(R.id.qadaa_ayah_ref, "");
                views.setTextViewText(R.id.qadaa_progress_label, "");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.qadaa_ayahs_read, "--");
            views.setTextViewText(R.id.qadaa_progress_label, "");
        }

        views.setImageViewBitmap(R.id.qadaa_bar, WidgetCanvas.barEmerald(context, 300, 10, progress));

        // Sizes come from the real widget box, never a literal dp: a bitmap drawn
        // at a fixed size and stretched is what made earlier widgets blurry.
        int theme = WidgetCanvas.widgetTheme(context, appWidgetId);
        boolean widgetDark = WidgetCanvas.isThemeDark(theme);
        int[] sz = WidgetCanvas.sizeDp(context, manager, appWidgetId, 250, 110);
        WidgetCanvas.ClockSky sky = WidgetCanvas.clockPhase();
        views.setImageViewBitmap(R.id.qadaa_sky,
            WidgetCanvas.sky(context, sz[0], sz[1], sky.fromPhase, sky.toPhase, sky.blend,
                WidgetCanvas.outerCornerRadiusDp(context), theme));
        WidgetStars.apply(context, views, R.id.qadaa_stars_flipper,
            new int[]{ R.id.qadaa_stars, R.id.qadaa_stars_2, R.id.qadaa_stars_3 },
            widgetDark, sz[0], sz[1], System.currentTimeMillis() / 60000);

        PendingIntent pi = openApp(context, appWidgetId * 23, "/qadaa");
        views.setOnClickPendingIntent(R.id.qadaa_root, pi);
        views.setOnClickPendingIntent(R.id.qadaa_open_btn, pi);

        WidgetInk.applyLight(context, views, theme,
            new int[]{ R.id.qadaa_ayahs_read },
            new int[]{ R.id.qadaa_date, R.id.qadaa_goal_label, R.id.qadaa_ayah_ref, R.id.qadaa_progress_label },
            new int[]{ R.id.qadaa_title, R.id.qadaa_surah_name });

        manager.updateAppWidget(appWidgetId, views);
    }

    /** The app shows Arabic-Indic digits everywhere; a widget should not be the odd one out. */
    private static String arabicDigits(int n) {
        String s = Integer.toString(n);
        StringBuilder out = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            out.append(c >= '0' && c <= '9' ? (char) ('٠' + (c - '0')) : c);
        }
        return out.toString();
    }
}
