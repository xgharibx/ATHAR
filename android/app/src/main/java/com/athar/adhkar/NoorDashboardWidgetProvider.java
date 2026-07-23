package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Ultimate Daily Dashboard Widget (4×4)
 *
 * All-in-one home-screen overview that merges every data source:
 *
 *   • Greeting (صباح الخير / مساء الخير / ليلة طيبة) + Hijri-style Gregorian date
 *   • Prayer status row — ✓ passed · ● next (gold) · ○ future + countdown to next prayer
 *   • Morning & Evening adhkar progress bars with X/Y counts
 *   • Quran wird progress bar + current surah/ayah + ayah count
 *   • Streak badge (consecutive active days) + user level label
 *   • "افتح أثر" button — opens the app
 *
 * SharedPreferences file : "CapacitorStorage"
 * Keys:
 *   noor_widget_prayer_v2    — prayer times (written by prayerWidget.ts)
 *   noor_widget_adhkar_v1    — morning/evening adhkar progress (widgetDataBridge.ts)
 *   noor_widget_wird_v1      — quran wird stats (widgetDataBridge.ts)
 *   noor_widget_dashboard_v1 — streak + score + level (widgetDataBridge.ts)
 */
public class NoorDashboardWidgetProvider extends AtharWidgetProvider {

    private static final String PREFS_FILE        = "CapacitorStorage";
    private static final String KEY_PRAYER        = "noor_widget_prayer_v2";
    private static final String KEY_ADHKAR        = "noor_widget_adhkar_v1";
    private static final String KEY_WIRD          = "noor_widget_wird_v1";
    private static final String KEY_DASHBOARD     = "noor_widget_dashboard_v1";

    /** Read raw key first (what @capacitor/preferences writes), then legacy prefixed key. */
    private static String readJson(SharedPreferences prefs, String key) {
        String raw = prefs.getString(key, null);
        if (raw != null && !raw.isEmpty()) return raw;
        return prefs.getString("CapacitorStorage." + key, null);
    }


    // ─── Prayer dot symbols ────────────────────────────────────────
    private static final String DOT_DONE   = "✓";
    private static final String DOT_NEXT   = "●";
    private static final String DOT_FUTURE = "○";

    // Dot view IDs — must match widget_dashboard.xml
    private static final int[] DOT_IDS = {
        R.id.dot_fajr, R.id.dot_dhuhr, R.id.dot_asr,
        R.id.dot_maghrib, R.id.dot_isha
    };

    // ─── AtharWidgetProvider contract ─────────────────────────────

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.widget_dashboard,
            "لوحة أثر اليومية",
            new String[] { "افتح التطبيق لمزامنة البيانات" },
            "افتح أثر"
        );
    }

    // ─── Widget lifecycle ──────────────────────────────────────────

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

    // ─── Main RemoteViews builder ──────────────────────────────────

    private void updateLive(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_dashboard);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);

        // ── 1. Header: greeting + Gregorian date ──────────────────
        views.setTextViewText(R.id.dash_greeting, resolveGreeting());
        views.setTextViewText(R.id.dash_date, dateLine());

        // Render the sky/stars at the widget's true on-screen size (not a
        // fixed 280dp then upscaled by fitXY — the source of the blur).
        int[] sz = WidgetCanvas.sizeDp(context, manager, appWidgetId, 280, 280);
        int theme = WidgetCanvas.widgetTheme(context, appWidgetId);
        boolean widgetDark = WidgetCanvas.isThemeDark(theme);

        // ── 2. Prayer dots & countdown (+ continuous sky, since this is
        //      the one section that actually knows what phase of the day
        //      it is) ──────────────────────────────────────────────────
        int nightPhase = applyPrayerSection(context, views, prefs, sz, theme);

        // ── 3. Adhkar progress bars ───────────────────────────────
        applyAdhkarSection(context, views, prefs);

        // ── 4. Quran wird progress ────────────────────────────────
        applyWirdSection(context, views, prefs);

        // ── 5. Streak + level ─────────────────────────────────────
        applyStreakSection(views, prefs);

        // ── 6. Starfield — only during the fajr/isha sky AND dark theme
        //      (the light palette's Isha is a soft twilight grey, not
        //      black, so gold star specks would look like stray debris on
        //      it); reseeds each real update. ─────────────
        if (nightPhase == 1 && widgetDark) {
            views.setViewVisibility(R.id.dashboard_stars, View.VISIBLE);
            views.setImageViewBitmap(R.id.dashboard_stars,
                WidgetCanvas.starfield(context, sz[0], sz[1], System.currentTimeMillis() / 60000));
        } else {
            views.setViewVisibility(R.id.dashboard_stars, View.GONE);
        }

        // ── 7. Tap → open app ─────────────────────────────────────
        PendingIntent pi = openApp(context, appWidgetId * 24, null);
        views.setOnClickPendingIntent(R.id.dashboard_root, pi);
        views.setOnClickPendingIntent(R.id.dash_open_btn, pi);

        manager.updateAppWidget(appWidgetId, views);
    }

    // ─── Prayer section ────────────────────────────────────────────

    /** @return 1 if the current/next phase pair includes fajr or isha (the
     *  starfield should show), 0 otherwise. */
    private int applyPrayerSection(Context context, RemoteViews views, SharedPreferences prefs, int[] sz,
                                   int theme) {
        try {
            String json = readJson(prefs, KEY_PRAYER);
            if (json == null) {
                setAllDotsFuture(context, views);
                views.setTextViewText(R.id.dash_next_countdown, "افتح التطبيق");
                views.setImageViewBitmap(R.id.dashboard_sky,
                    WidgetCanvas.sky(context, sz[0], sz[1], WidgetCanvas.PHASE_ISHA, WidgetCanvas.PHASE_ISHA, 0f,
                        WidgetCanvas.outerCornerRadiusDp(context), theme));
                return 1;
            }

            JSONObject payload = new JSONObject(json);
            JSONArray prayers  = payload.optJSONArray("prayers");

            // Map prayer names to dot indices: فجر=0, ظهر=1, عصر=2, مغرب=3, عشاء=4
            boolean[] passed = new boolean[5];
            boolean[] isNext = new boolean[5];
            int prevMin = 0, nextMin = -1, nextIdx = WidgetCanvas.PHASE_ISHA;
            String nextNameAr = null;

            if (prayers != null) {
                // Recomputed live from device time, NOT from the stale
                // payload.nextPrayer/p.passed snapshot (see
                // NoorPrayerWidgetProvider) — also, payload.nextPrayer never
                // actually carries a "countdownLabel" field (nothing on the
                // JS side writes one), so reading it here always produced an
                // empty countdown string; recomputing live fixes both at once.
                int nowMin = nowMinutes();
                for (int i = 0; i < prayers.length() && i < 5; i++) {
                    JSONObject p = prayers.getJSONObject(i);
                    int timeMin = toMinutesOfDay(p.optString("time", "0:0"));
                    passed[i] = timeMin <= nowMin;
                    if (passed[i]) prevMin = Math.max(prevMin, timeMin);
                    String nameAr = p.optString("nameAr", "");
                    if (nextNameAr == null && timeMin > nowMin) {
                        nextNameAr = nameAr;
                        isNext[i] = true;
                        nextMin = timeMin;
                        nextIdx = i;
                    }
                }
            }

            String countdown = nextMin >= 0 ? buildCountdown(nextMin) : "";
            views.setTextViewText(R.id.dash_next_countdown,
                countdown.isEmpty() || nextNameAr == null ? "" : nextNameAr + " خلال " + countdown);

            for (int i = 0; i < DOT_IDS.length; i++) {
                if (passed[i]) {
                    views.setTextViewText(DOT_IDS[i], DOT_DONE);
                    views.setTextColor(DOT_IDS[i], ContextCompat.getColor(context, R.color.widget_row_passed));
                } else if (isNext[i]) {
                    views.setTextViewText(DOT_IDS[i], DOT_NEXT);
                    views.setTextColor(DOT_IDS[i], ContextCompat.getColor(context, R.color.widget_row_active));
                } else {
                    views.setTextViewText(DOT_IDS[i], DOT_FUTURE);
                    views.setTextColor(DOT_IDS[i], ContextCompat.getColor(context, R.color.widget_row_future));
                }
            }

            // Continuous sky — same LERP-by-interval-fraction as the other
            // two prayer widgets, so all three widgets agree on the sky.
            int fromIdx = NoorPrayerWidgetProvider.prevPhase(nextIdx);
            float blend = intervalProgressFor(prevMin, nextMin);
            views.setImageViewBitmap(R.id.dashboard_sky,
                WidgetCanvas.sky(context, sz[0], sz[1], fromIdx, nextIdx, blend,
                    WidgetCanvas.outerCornerRadiusDp(context), theme));
            return (nextIdx == WidgetCanvas.PHASE_FAJR || nextIdx == WidgetCanvas.PHASE_ISHA
                || fromIdx == WidgetCanvas.PHASE_FAJR || fromIdx == WidgetCanvas.PHASE_ISHA) ? 1 : 0;

        } catch (Exception e) {
            setAllDotsFuture(context, views);
            views.setTextViewText(R.id.dash_next_countdown, "");
            views.setImageViewBitmap(R.id.dashboard_sky,
                WidgetCanvas.sky(context, sz[0], sz[1], WidgetCanvas.PHASE_ISHA, WidgetCanvas.PHASE_ISHA, 0f,
                    WidgetCanvas.outerCornerRadiusDp(context), theme));
            return 1;
        }
    }

    private static int toMinutesOfDay(String time24) {
        try {
            String[] p = time24.split(":");
            return Integer.parseInt(p[0].trim()) * 60 + Integer.parseInt(p[1].trim());
        } catch (Exception e) {
            return 0;
        }
    }

    private static int nowMinutes() {
        Calendar cal = Calendar.getInstance();
        return cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE);
    }

    /** "خلال ٤٥ دقيقة" / "خلال ٢س ١٠د" style label for the header countdown. */
    private static String buildCountdown(int nextMin) {
        int diff = nextMin - nowMinutes();
        if (diff <= 0) return "";
        if (diff < 60) return diff + " دقيقة";
        int h = diff / 60, m = diff % 60;
        return m == 0 ? h + " ساعة" : h + "س " + m + "د";
    }

    private static float intervalProgressFor(int prevMin, int nextMin) {
        if (nextMin < 0) return 1f;
        Calendar cal = Calendar.getInstance();
        int nowMin = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE);
        int span = Math.max(1, nextMin - prevMin);
        return Math.max(0f, Math.min(1f, (nowMin - prevMin) / (float) span));
    }

    private void setAllDotsFuture(Context context, RemoteViews views) {
        int color = ContextCompat.getColor(context, R.color.widget_row_future);
        for (int dotId : DOT_IDS) {
            views.setTextViewText(dotId, DOT_FUTURE);
            views.setTextColor(dotId, color);
        }
    }

    // ─── Adhkar section ───────────────────────────────────────────

    private void applyAdhkarSection(Context context, RemoteViews views, SharedPreferences prefs) {
        try {
            String json = readJson(prefs, KEY_ADHKAR);
            if (json == null) {
                views.setTextViewText(R.id.dash_morning_count, "--");
                views.setTextViewText(R.id.dash_evening_count, "--");
                views.setImageViewBitmap(R.id.dash_morning_bar, WidgetCanvas.barGold(context, 280, 7, 0f));
                views.setImageViewBitmap(R.id.dash_evening_bar, WidgetCanvas.barDusk(context, 280, 7, 0f));
                return;
            }

            JSONObject payload  = new JSONObject(json);
            JSONObject morning  = payload.optJSONObject("morning");
            JSONObject evening  = payload.optJSONObject("evening");

            int mDone  = morning != null ? morning.optInt("done",  0)  : 0;
            int mTotal = morning != null ? morning.optInt("total", 14) : 14;
            int eDone  = evening != null ? evening.optInt("done",  0)  : 0;
            int eTotal = evening != null ? evening.optInt("total", 14) : 14;

            views.setTextViewText(R.id.dash_morning_count, mDone + "/" + mTotal);
            views.setTextViewText(R.id.dash_evening_count, eDone + "/" + eTotal);
            views.setImageViewBitmap(R.id.dash_morning_bar,
                WidgetCanvas.barGold(context, 280, 7, mTotal > 0 ? mDone / (float) mTotal : 0f));
            views.setImageViewBitmap(R.id.dash_evening_bar,
                WidgetCanvas.barDusk(context, 280, 7, eTotal > 0 ? eDone / (float) eTotal : 0f));

        } catch (Exception e) {
            views.setTextViewText(R.id.dash_morning_count, "--");
            views.setTextViewText(R.id.dash_evening_count, "--");
            views.setImageViewBitmap(R.id.dash_morning_bar, WidgetCanvas.barGold(context, 280, 7, 0f));
            views.setImageViewBitmap(R.id.dash_evening_bar, WidgetCanvas.barDusk(context, 280, 7, 0f));
        }
    }

    // ─── Wird section ─────────────────────────────────────────────

    private void applyWirdSection(Context context, RemoteViews views, SharedPreferences prefs) {
        try {
            String json = readJson(prefs, KEY_WIRD);
            if (json == null) {
                views.setTextViewText(R.id.dash_wird_count, "--");
                views.setTextViewText(R.id.dash_wird_surah, "ابدأ المصحف");
                views.setImageViewBitmap(R.id.dash_wird_bar, WidgetCanvas.barEmerald(context, 280, 7, 0f));
                return;
            }

            JSONObject payload    = new JSONObject(json);
            int ayahsRead         = payload.optInt("ayahsRead", 0);
            int dailyGoal         = payload.optInt("dailyGoal", 10);
            String currentSurah   = payload.optString("currentSurah", "");
            int currentAyah       = payload.optInt("currentAyah", 1);

            views.setTextViewText(R.id.dash_wird_count, ayahsRead + "/" + dailyGoal);
            views.setTextViewText(R.id.dash_wird_surah,
                currentSurah.isEmpty() ? "ابدأ المصحف"
                    : "سورة " + currentSurah + " ‧ الآية " + toArabicNumerals(currentAyah));
            views.setImageViewBitmap(R.id.dash_wird_bar,
                WidgetCanvas.barEmerald(context, 280, 7, dailyGoal > 0 ? Math.min(1f, ayahsRead / (float) dailyGoal) : 0f));

        } catch (Exception e) {
            views.setTextViewText(R.id.dash_wird_count, "--");
            views.setTextViewText(R.id.dash_wird_surah, "");
            views.setImageViewBitmap(R.id.dash_wird_bar, WidgetCanvas.barEmerald(context, 280, 7, 0f));
        }
    }

    // ─── Streak section ───────────────────────────────────────────

    private void applyStreakSection(RemoteViews views, SharedPreferences prefs) {
        try {
            String json = readJson(prefs, KEY_DASHBOARD);
            if (json == null) {
                views.setTextViewText(R.id.dash_streak_days, "١ يوم");
                views.setTextViewText(R.id.dash_streak_emoji, "🌱");
                views.setTextViewText(R.id.dash_level, "مبتدئ");
                return;
            }

            JSONObject payload  = new JSONObject(json);
            int streakDays      = payload.optInt("streakDays", 1);
            String levelAr      = payload.optString("levelAr", "مبتدئ");
            String levelEmoji   = payload.optString("levelEmoji", "🌱");

            views.setTextViewText(R.id.dash_streak_days, toArabicNumerals(streakDays) + " يوم");
            views.setTextViewText(R.id.dash_streak_emoji, levelEmoji);
            views.setTextViewText(R.id.dash_level, levelAr);

        } catch (Exception e) {
            views.setTextViewText(R.id.dash_streak_days, "١ يوم");
            views.setTextViewText(R.id.dash_streak_emoji, "🌱");
            views.setTextViewText(R.id.dash_level, "مبتدئ");
        }
    }


    // ─── Utilities ────────────────────────────────────────────────

    /** Time-aware Arabic greeting. */
    private static String resolveGreeting() {
        int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        if (hour >= 5  && hour < 12) return "صباح الخير ☀";
        if (hour >= 12 && hour < 18) return "نهارك طيب 🌤";
        if (hour >= 18 && hour < 21) return "مساء الخير 🌅";
        return "ليلة طيبة 🌙";
    }

    /** Convert Latin digits to Arabic-Indic numerals. */
    private static String toArabicNumerals(int n) {
        return String.valueOf(n)
            .replace('0', '\u0660').replace('1', '\u0661').replace('2', '\u0662')
            .replace('3', '\u0663').replace('4', '\u0664').replace('5', '\u0665')
            .replace('6', '\u0666').replace('7', '\u0667').replace('8', '\u0668')
            .replace('9', '\u0669');
    }
}
