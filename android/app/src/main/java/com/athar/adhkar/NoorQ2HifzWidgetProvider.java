package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Locale;

/**
 * «القرآن الكريم» memorisation widget (4×2): how many pages today's session holds
 * (new lesson, near review, far review), how much of the mushaf is memorised,
 * and a bar.
 *
 * The app writes noor_widget_q2_hifz_v1 (src/quran2/native/widget.ts) with the
 * due date of every older page, so the far-review count here is worked out on
 * the day the widget draws, even when the app has not run since.
 */
public class NoorQ2HifzWidgetProvider extends AtharWidgetProvider {

    private static final String WIDGET_KEY = "noor_widget_q2_hifz_v1";
    private static final int TOTAL_PAGES = 604;

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.widget_q2_hifz,
            "حفظك اليوم",
            new String[] { "افتح القرآن الكريم لتبدأ الحفظ" },
            "ابدأ الجلسة",
            "/quran/hifz"
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

    private static String todayKey() {
        Calendar now = Calendar.getInstance();
        return String.format(Locale.US, "%04d-%02d-%02d",
            now.get(Calendar.YEAR), now.get(Calendar.MONTH) + 1, now.get(Calendar.DAY_OF_MONTH));
    }

    private static long endOfToday() {
        Calendar end = Calendar.getInstance();
        end.set(Calendar.HOUR_OF_DAY, 23);
        end.set(Calendar.MINUTE, 59);
        end.set(Calendar.SECOND, 59);
        end.set(Calendar.MILLISECOND, 999);
        return end.getTimeInMillis();
    }

    private void updateLive(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_q2_hifz);
        views.setTextViewText(R.id.q2hifz_date, "");

        float progress = 0f;
        String sessionRoute = "/quran/hifz";
        try {
            String json = WidgetData.readJson(context, WIDGET_KEY);
            JSONObject payload = json != null ? new JSONObject(json) : null;
            int memorised = payload != null ? Math.max(0, payload.optInt("memorised", 0)) : 0;
            if (payload != null && memorised > 0) {
                boolean sameDay = todayKey().equals(payload.optString("day", ""));
                int fresh = Math.max(0, sameDay ? payload.optInt("newToday", 0) : payload.optInt("newLater", 0));
                int near = Math.max(0, sameDay ? payload.optInt("near", 0) : payload.optInt("nearLater", payload.optInt("near", 0)));
                int far = 0;
                long end = endOfToday();
                JSONArray dues = payload.optJSONArray("dues");
                for (int i = 0; dues != null && i < dues.length(); i++) {
                    if (dues.optLong(i, Long.MAX_VALUE) <= end) far++;
                }
                // The app revises at most twenty far pages a day.
                far = Math.min(far, 20);
                int total = fresh + near + far;

                progress = Math.min(1f, memorised / (float) TOTAL_PAGES);
                if (total == 0) {
                    views.setTextViewText(R.id.q2hifz_ayahs_read, "✓");
                    views.setTextViewText(R.id.q2hifz_goal_label, "لا مراجعة اليوم");
                } else {
                    views.setTextViewText(R.id.q2hifz_ayahs_read, arabicDigits(total) + (total == 1 ? " صفحة" : " صفحات"));
                    views.setTextViewText(R.id.q2hifz_goal_label, "في جلسة اليوم");
                    sessionRoute = "/quran/hifz/session";
                }
                views.setTextViewText(R.id.q2hifz_surah_name, arabicDigits(memorised) + " صفحة محفوظة");
                views.setTextViewText(R.id.q2hifz_ayah_ref,
                    "جديد " + arabicDigits(fresh) + "، قريب " + arabicDigits(near) + "، بعيد " + arabicDigits(far));
                views.setTextViewText(R.id.q2hifz_progress_label,
                    arabicDigits(Math.round(progress * 100)) + "٪ من المصحف");
            } else {
                views.setTextViewText(R.id.q2hifz_ayahs_read, "--");
                views.setTextViewText(R.id.q2hifz_goal_label, "ابدأ الحفظ من «القرآن الكريم»");
                views.setTextViewText(R.id.q2hifz_surah_name, "حفظك اليوم");
                views.setTextViewText(R.id.q2hifz_ayah_ref, "");
                views.setTextViewText(R.id.q2hifz_progress_label, "");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.q2hifz_ayahs_read, "--");
            views.setTextViewText(R.id.q2hifz_progress_label, "");
        }

        views.setImageViewBitmap(R.id.q2hifz_bar, WidgetCanvas.barEmerald(context, 300, 10, progress));

        int theme = WidgetCanvas.widgetTheme(context, appWidgetId);
        boolean widgetDark = WidgetCanvas.isThemeDark(theme);
        int[] sz = WidgetCanvas.sizeDp(context, manager, appWidgetId, 250, 110);
        WidgetCanvas.ClockSky sky = WidgetCanvas.clockPhase();
        views.setImageViewBitmap(R.id.q2hifz_sky,
            WidgetCanvas.sky(context, sz[0], sz[1], sky.fromPhase, sky.toPhase, sky.blend,
                WidgetCanvas.outerCornerRadiusDp(context), theme));
        WidgetStars.apply(context, views, R.id.q2hifz_stars_flipper,
            new int[]{ R.id.q2hifz_stars, R.id.q2hifz_stars_2, R.id.q2hifz_stars_3 },
            widgetDark, sz[0], sz[1], System.currentTimeMillis() / 60000);

        views.setOnClickPendingIntent(R.id.q2hifz_root, openApp(context, appWidgetId * 29, "/quran/hifz"));
        PendingIntent session = openApp(context, appWidgetId * 29 + 1, sessionRoute);
        views.setOnClickPendingIntent(R.id.q2hifz_open_btn, session);

        WidgetInk.applyLight(context, views, theme,
            new int[]{ R.id.q2hifz_ayahs_read },
            new int[]{ R.id.q2hifz_date, R.id.q2hifz_goal_label, R.id.q2hifz_ayah_ref, R.id.q2hifz_progress_label },
            new int[]{ R.id.q2hifz_title, R.id.q2hifz_surah_name });

        manager.updateAppWidget(appWidgetId, views);
    }

    /** Arabic-Indic digits, as everywhere in the app. */
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
