package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * Wird table widget (4×2): how many of today's awrad are done, the next one still
 * waiting, and a bar. Read-only: the table lives in the app and merges across
 * devices there; tapping opens it.
 */
public class NoorWirdTableWidgetProvider extends AtharWidgetProvider {

    private static final String WIDGET_KEY = "noor_widget_wirdtable_v1";

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.widget_wirdtable,
            "جدول الورد",
            new String[] { "افتح التطبيق لمزامنة أورادك" },
            "افتح الجدول",
            "/wird"
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            try {
                updateLive(context, manager, id);
            } catch (Throwable t) {
                android.util.Log.e("WirdTable", "render failed", t);
            }
        }
    }

    private void updateLive(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_wirdtable);
        views.setTextViewText(R.id.wt_date, "");

        float progress = 0f;
        try {
            String json = WidgetData.readJson(context, WIDGET_KEY);
            JSONObject p = json != null ? new JSONObject(json) : null;
            if (p != null && p.optBoolean("configured", false)) {
                int total = Math.max(0, p.optInt("total", 0));
                int done = Math.max(0, Math.min(total, p.optInt("done", 0)));
                progress = total > 0 ? done / (float) total : 0f;
                if (total == 0) {
                    views.setTextViewText(R.id.wt_ayahs_read, "—");
                    views.setTextViewText(R.id.wt_goal_label, "لا ورد مستحقّ اليوم");
                } else if (done >= total) {
                    views.setTextViewText(R.id.wt_ayahs_read, "✓");
                    views.setTextViewText(R.id.wt_goal_label, "أتممتَ أوراد اليوم");
                } else {
                    views.setTextViewText(R.id.wt_ayahs_read, ar(done) + "/" + ar(total) + " اليوم");
                    views.setTextViewText(R.id.wt_goal_label, "من أوراد اليوم");
                }
                JSONObject next = p.optJSONObject("next");
                if (next != null) {
                    // One line: a second row does not fit at the default 4x2 height.
                    views.setTextViewText(R.id.wt_surah_name, next.optString("title", "")
                        + " · " + ar(next.optInt("count", 0)) + "/" + ar(next.optInt("target", 1)));
                    views.setViewVisibility(R.id.wt_ayah_ref, android.view.View.GONE);
                } else {
                    views.setTextViewText(R.id.wt_surah_name, total > 0 ? "بارك الله فيك" : "");
                    views.setViewVisibility(R.id.wt_ayah_ref, android.view.View.GONE);
                }
                int streak = Math.max(0, p.optInt("streak", 0));
                views.setTextViewText(R.id.wt_progress_label,
                    streak > 1 ? ar(streak) + " أيام متتابعة" : "");
            } else {
                views.setTextViewText(R.id.wt_ayahs_read, "--");
                views.setTextViewText(R.id.wt_goal_label, "أنشئ أورادك من التطبيق");
                views.setTextViewText(R.id.wt_surah_name, "جدول الورد");
                views.setViewVisibility(R.id.wt_ayah_ref, android.view.View.GONE);
                views.setTextViewText(R.id.wt_progress_label, "");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.wt_ayahs_read, "--");
            views.setTextViewText(R.id.wt_progress_label, "");
        }

        views.setImageViewBitmap(R.id.wt_bar, WidgetCanvas.barEmerald(context, 300, 10, progress));

        int theme = WidgetCanvas.widgetTheme(context, appWidgetId);
        boolean widgetDark = WidgetCanvas.isThemeDark(theme);
        int[] sz = WidgetCanvas.sizeDp(context, manager, appWidgetId, 250, 110);
        WidgetCanvas.ClockSky sky = WidgetCanvas.clockPhase();
        views.setImageViewBitmap(R.id.wt_sky,
            WidgetCanvas.sky(context, sz[0], sz[1], sky.fromPhase, sky.toPhase, sky.blend,
                WidgetCanvas.outerCornerRadiusDp(context), theme));
        WidgetStars.apply(context, views, R.id.wt_stars_flipper,
            new int[]{ R.id.wt_stars, R.id.wt_stars_2, R.id.wt_stars_3 },
            widgetDark, sz[0], sz[1], System.currentTimeMillis() / 60000);

        PendingIntent pi = openApp(context, appWidgetId * 29, "/wird");
        views.setOnClickPendingIntent(R.id.wt_root, pi);
        views.setOnClickPendingIntent(R.id.wt_open_btn, pi);

        WidgetInk.applyLight(context, views, theme,
            new int[]{ R.id.wt_ayahs_read },
            new int[]{ R.id.wt_date, R.id.wt_goal_label, R.id.wt_ayah_ref, R.id.wt_progress_label },
            new int[]{ R.id.wt_title, R.id.wt_surah_name });

        manager.updateAppWidget(appWidgetId, views);
    }

    private static String ar(int n) {
        String s = Integer.toString(n);
        StringBuilder out = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            out.append(c >= '0' && c <= '9' ? (char) ('٠' + (c - '0')) : c);
        }
        return out.toString();
    }
}
