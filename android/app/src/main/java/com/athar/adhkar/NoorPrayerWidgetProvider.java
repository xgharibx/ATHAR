package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.os.Build;
import android.os.SystemClock;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Locale;

/**
 * Prayer Countdown Widget (4×2) — premium redesign.
 *
 * The background is a sky that follows the day: dawn indigo before الفجر,
 * bright emerald at الظهر, golden العصر, ember المغرب, deep-night العشاء.
 * A Canvas ring shows how far along the current prayer interval is, with a
 * hero countdown to the next prayer.
 */
public class NoorPrayerWidgetProvider extends AtharWidgetProvider {

    private static final String WIDGET_KEY = "noor_widget_prayer_v2";

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.noor_widget_prayer,
            "الصلاة القادمة",
            new String[] { "افتح التطبيق لتحميل المواقيت" },
            "المواقيت",
            "/prayer-times"
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
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.noor_widget_prayer);
        views.setTextViewText(R.id.noor_widget_date, dateLine());

        int theme = WidgetCanvas.widgetTheme(context, appWidgetId);

        String nextName = null;
        String nextTime = null;
        float intervalProgress = 0f;

        try {
            String json = WidgetData.readJson(context, WIDGET_KEY);
            if (json != null) {
                JSONObject payload = new JSONObject(json);
                JSONArray prayers  = payload.optJSONArray("prayers");

                // Recomputed live from the device's current time on every
                // onUpdate — NOT read from payload.nextPrayer / p.passed,
                // which are a snapshot from whenever the JS side last synced
                // (at most once/day). Trusting that snapshot directly made
                // the widget keep showing an already-passed prayer for hours,
                // rolling straight to tomorrow instead of the next real
                // prayer of the day.
                if (prayers != null && prayers.length() > 0) {
                    int nowMin = nowMinutes();
                    int prevMin = 0;
                    for (int i = 0; i < prayers.length(); i++) {
                        JSONObject p = prayers.getJSONObject(i);
                        int pMin = toMinutes(p.optString("time", "0:0"));
                        if (pMin > nowMin) {
                            nextName = p.optString("nameAr", null);
                            nextTime = p.optString("time", null);
                            int span = Math.max(1, pMin - prevMin);
                            intervalProgress = Math.max(0f, Math.min(1f, (nowMin - prevMin) / (float) span));
                            break;
                        }
                        prevMin = pMin;
                    }
                    if (nextTime == null) {
                        // All of today's prayers have passed — show tomorrow's Fajr, ring full.
                        JSONObject fajr = prayers.getJSONObject(0);
                        nextName = fajr.optString("nameAr", "الفجر") + " غدًا";
                        nextTime = fajr.optString("time", null);
                        intervalProgress = 1f;
                    }
                }
            }
        } catch (Exception ignored) {
            // fall through to placeholder state
        }

        if (nextName != null && nextTime != null) {
            views.setTextViewText(R.id.noor_widget_title, "الصلاة القادمة");
            views.setTextViewText(R.id.noor_widget_phrase, nextName);
            views.setTextViewText(R.id.prayer_ring_time, format12hTime(nextTime));
            views.setTextViewText(R.id.prayer_ring_ampm, amPmArabic(nextTime));

            // Continuous sky: LERPs from the current phase toward the one
            // we're counting down to, using the same fraction as the ring —
            // the sky and the ring always agree on "how far through" we are.
            int toPhase = phaseFor(nextName);
            int fromPhase = prevPhase(toPhase);
            int[] sz = WidgetCanvas.sizeDp(context, manager, appWidgetId, 250, 110);
            boolean widgetDark = WidgetCanvas.isThemeDark(theme);
            views.setImageViewBitmap(R.id.prayer_sky,
                WidgetCanvas.sky(context, sz[0], sz[1], fromPhase, toPhase, intervalProgress,
                    WidgetCanvas.outerCornerRadiusDp(context), theme));
            boolean nightPhase = toPhase == WidgetCanvas.PHASE_FAJR || toPhase == WidgetCanvas.PHASE_ISHA
                || fromPhase == WidgetCanvas.PHASE_FAJR || fromPhase == WidgetCanvas.PHASE_ISHA;
            // Stars only make sense against a dark theme's night sky — the
            // light theme's Isha is a soft twilight grey, not black, so gold
            // star specks would look like stray debris on it.
            if (widgetDark && nightPhase) {
                views.setViewVisibility(R.id.prayer_stars, android.view.View.VISIBLE);
                views.setImageViewBitmap(R.id.prayer_stars,
                    WidgetCanvas.starfield(context, sz[0], sz[1], System.currentTimeMillis() / 60000));
            } else {
                views.setViewVisibility(R.id.prayer_stars, android.view.View.GONE);
            }

            // Genuinely live countdown: the OS ticks a real Chronometer view
            // in the launcher's own process, second by second, whether or
            // not this app is even running — not a string re-rendered on
            // whatever schedule the widget's own update job happens to fire.
            // setChronometerCountDown (the count-DOWN mode) needs API 24; on
            // older devices we fall back to the pre-computed static string.
            long untilMs = millisUntilNext(nextTime);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && untilMs > 0) {
                views.setViewVisibility(R.id.prayer_countdown, android.view.View.VISIBLE);
                views.setViewVisibility(R.id.prayer_countdown_static, android.view.View.GONE);
                views.setChronometerCountDown(R.id.prayer_countdown, true);
                long base = SystemClock.elapsedRealtime() + untilMs;
                views.setChronometer(R.id.prayer_countdown, base, "بعد %s", true);
            } else {
                views.setViewVisibility(R.id.prayer_countdown, android.view.View.GONE);
                views.setViewVisibility(R.id.prayer_countdown_static, android.view.View.VISIBLE);
                String cd = buildCountdown(nextTime);
                views.setTextViewText(R.id.prayer_countdown_static, cd.isEmpty() ? "حان الوقت 🕌" : "بعد " + cd);
            }
        } else {
            views.setTextViewText(R.id.noor_widget_title, "مواقيت الصلاة");
            views.setTextViewText(R.id.noor_widget_phrase, "افتح التطبيق");
            views.setTextViewText(R.id.prayer_ring_time, "--:--");
            views.setTextViewText(R.id.prayer_ring_ampm, "");
            views.setViewVisibility(R.id.prayer_countdown, android.view.View.GONE);
            views.setViewVisibility(R.id.prayer_countdown_static, android.view.View.VISIBLE);
            views.setTextViewText(R.id.prayer_countdown_static, "لتحميل المواقيت");
            views.setViewVisibility(R.id.prayer_stars, android.view.View.GONE);
            views.setInt(R.id.noor_widget_root, "setBackgroundResource", R.drawable.noor_widget_background);
        }

        views.setImageViewBitmap(R.id.prayer_ring,
            WidgetCanvas.ring(context, 120, 8, intervalProgress));

        PendingIntent pi = openApp(context, appWidgetId * 22, "/prayer-times");
        views.setOnClickPendingIntent(R.id.noor_widget_root, pi);

        // LIGHT theme needs dark ink (dark themes keep the light XML tokens).
        WidgetInk.applyLight(context, views, theme,
            new int[]{ R.id.prayer_ring_time, R.id.noor_widget_phrase },
            new int[]{ R.id.prayer_ring_ampm, R.id.noor_widget_title, R.id.noor_widget_date },
            new int[]{ R.id.prayer_countdown, R.id.prayer_countdown_static });

        manager.updateAppWidget(appWidgetId, views);
    }

    /** Maps a prayer's Arabic name to a WidgetCanvas.PHASE_*
     *  index for the continuous LERP renderer instead of a static drawable. */
    static int phaseFor(String nameAr) {
        if (nameAr == null) return WidgetCanvas.PHASE_ISHA;
        if (nameAr.contains("الفجر"))   return WidgetCanvas.PHASE_FAJR;
        if (nameAr.contains("الظهر") || nameAr.contains("الجمعة")) return WidgetCanvas.PHASE_DHUHR;
        if (nameAr.contains("العصر"))   return WidgetCanvas.PHASE_ASR;
        if (nameAr.contains("المغرب"))  return WidgetCanvas.PHASE_MAGHRIB;
        if (nameAr.contains("العشاء"))  return WidgetCanvas.PHASE_ISHA;
        return WidgetCanvas.PHASE_ISHA;
    }

    /** The phase immediately before `toPhase` in the fixed daily cycle
     *  (fajr → dhuhr → asr → maghrib → isha → fajr…) — prayer phases always
     *  occur in this order, so "the phase we're currently in" is always
     *  knowable from "the phase we're counting down to" alone. */
    static int prevPhase(int toPhase) {
        return (toPhase + 4) % 5; // +4 mod 5 == -1 mod 5, without a negative index
    }

    private static int toMinutes(String hhmm) {
        try {
            String[] p = hhmm.split(":");
            return Integer.parseInt(p[0].trim()) * 60 + Integer.parseInt(p[1].trim());
        } catch (Exception e) {
            return 0;
        }
    }

    private static int nowMinutes() {
        Calendar cal = Calendar.getInstance();
        return cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE);
    }

    private static String format12hTime(String time24) {
        try {
            String[] p = time24.split(":");
            int h = Integer.parseInt(p[0].trim());
            int m = Integer.parseInt(p[1].trim());
            int h12 = h % 12;
            if (h12 == 0) h12 = 12;
            return String.format(Locale.US, "%d:%02d", h12, m);
        } catch (Exception e) {
            return time24;
        }
    }

    private static String amPmArabic(String time24) {
        try {
            int h = Integer.parseInt(time24.split(":")[0].trim());
            return h < 12 ? "صباحًا" : "مساءً";
        } catch (Exception e) {
            return "";
        }
    }

    private static String buildCountdown(String time24) {
        int target = toMinutes(time24);
        int diff = target - nowMinutes();
        if (diff <= 0) return "";
        if (diff < 60) return diff + " دقيقة";
        int h = diff / 60, m = diff % 60;
        return m == 0 ? h + " ساعة" : h + "س " + m + "د";
    }

    /** Milliseconds from now until the next occurrence of time24 (HH:MM),
     *  rolling to tomorrow if that time-of-day has already passed today. */
    private static long millisUntilNext(String time24) {
        try {
            String[] p = time24.split(":");
            int targetH = Integer.parseInt(p[0].trim());
            int targetM = Integer.parseInt(p[1].trim());
            Calendar target = Calendar.getInstance();
            target.set(Calendar.HOUR_OF_DAY, targetH);
            target.set(Calendar.MINUTE, targetM);
            target.set(Calendar.SECOND, 0);
            target.set(Calendar.MILLISECOND, 0);
            long now = System.currentTimeMillis();
            if (target.getTimeInMillis() <= now) {
                target.add(Calendar.DAY_OF_YEAR, 1);
            }
            return target.getTimeInMillis() - now;
        } catch (Exception e) {
            return -1;
        }
    }
}
