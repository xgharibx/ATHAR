package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

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
    private static final String KEY_PRAYER        = "CapacitorStorage.noor_widget_prayer_v2";
    private static final String KEY_ADHKAR        = "CapacitorStorage.noor_widget_adhkar_v1";
    private static final String KEY_WIRD          = "CapacitorStorage.noor_widget_wird_v1";
    private static final String KEY_DASHBOARD     = "CapacitorStorage.noor_widget_dashboard_v1";


    // ─── Prayer dot symbols ────────────────────────────────────────
    private static final String DOT_DONE   = "✓";
    private static final String DOT_NEXT   = "●";
    private static final String DOT_FUTURE = "○";

    // Dot view IDs — must match widget_dashboard.xml
    private static final int[] DOT_IDS = {
        R.id.dot_fajr, R.id.dot_dhuhr, R.id.dot_asr,
        R.id.dot_maghrib, R.id.dot_isha
    };
    private static final int[] MORNING_SEGMENTS = {
        R.id.dash_morning_seg_01, R.id.dash_morning_seg_02,
        R.id.dash_morning_seg_03, R.id.dash_morning_seg_04,
        R.id.dash_morning_seg_05, R.id.dash_morning_seg_06,
        R.id.dash_morning_seg_07, R.id.dash_morning_seg_08,
        R.id.dash_morning_seg_09, R.id.dash_morning_seg_10
    };
    private static final int[] EVENING_SEGMENTS = {
        R.id.dash_evening_seg_01, R.id.dash_evening_seg_02,
        R.id.dash_evening_seg_03, R.id.dash_evening_seg_04,
        R.id.dash_evening_seg_05, R.id.dash_evening_seg_06,
        R.id.dash_evening_seg_07, R.id.dash_evening_seg_08,
        R.id.dash_evening_seg_09, R.id.dash_evening_seg_10
    };
    private static final int[] WIRD_SEGMENTS = {
        R.id.dash_wird_seg_01, R.id.dash_wird_seg_02,
        R.id.dash_wird_seg_03, R.id.dash_wird_seg_04,
        R.id.dash_wird_seg_05, R.id.dash_wird_seg_06,
        R.id.dash_wird_seg_07, R.id.dash_wird_seg_08,
        R.id.dash_wird_seg_09, R.id.dash_wird_seg_10
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
        SimpleDateFormat dateFmt = new SimpleDateFormat("EEEE، d MMMM", new Locale("ar"));
        views.setTextViewText(R.id.dash_date, dateFmt.format(new Date()));

        // ── 2. Prayer dots & countdown ────────────────────────────
        applyPrayerSection(views, prefs);

        // ── 3. Adhkar progress bars ───────────────────────────────
        applyAdhkarSection(views, prefs);

        // ── 4. Quran wird progress ────────────────────────────────
        applyWirdSection(views, prefs);

        // ── 5. Streak + level ─────────────────────────────────────
        applyStreakSection(views, prefs);

        // ── 6. Tap → open app ─────────────────────────────────────
        Intent intent = new Intent(context, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            context, appWidgetId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.dashboard_root, pi);
        views.setOnClickPendingIntent(R.id.dash_open_btn, pi);

        manager.updateAppWidget(appWidgetId, views);
    }

    // ─── Prayer section ────────────────────────────────────────────

    private void applyPrayerSection(RemoteViews views, SharedPreferences prefs) {
        try {
            String json = prefs.getString(KEY_PRAYER, null);
            if (json == null) {
                setAllDotsFuture(views);
                views.setTextViewText(R.id.dash_next_countdown, "افتح التطبيق");
                return;
            }

            JSONObject payload = new JSONObject(json);
            JSONArray prayers  = payload.optJSONArray("prayers");

            String nextNameAr = null;
            String countdown  = "";
            if (!payload.isNull("nextPrayer")) {
                JSONObject next = payload.getJSONObject("nextPrayer");
                nextNameAr = next.optString("nameAr", null);
                countdown  = next.optString("countdownLabel", "");
            }
            views.setTextViewText(R.id.dash_next_countdown,
                countdown.isEmpty() ? "" : nextNameAr + " خلال " + countdown);

            // Map prayer names to dot indices: فجر=0, ظهر=1, عصر=2, مغرب=3, عشاء=4
            boolean[] passed = new boolean[5];
            boolean[] isNext = new boolean[5];

            if (prayers != null) {
                for (int i = 0; i < prayers.length() && i < 5; i++) {
                    JSONObject p = prayers.getJSONObject(i);
                    passed[i] = p.optBoolean("passed", false);
                    String nameAr = p.optString("nameAr", "");
                    if (nextNameAr != null && nextNameAr.equals(nameAr)) {
                        isNext[i] = true;
                    }
                }
            }

            for (int i = 0; i < DOT_IDS.length; i++) {
                if (passed[i]) {
                    views.setTextViewText(DOT_IDS[i], DOT_DONE);
                    views.setTextColor(DOT_IDS[i], 0xFF3EBB70); // green
                } else if (isNext[i]) {
                    views.setTextViewText(DOT_IDS[i], DOT_NEXT);
                    views.setTextColor(DOT_IDS[i], 0xFFEAD58D); // gold
                } else {
                    views.setTextViewText(DOT_IDS[i], DOT_FUTURE);
                    views.setTextColor(DOT_IDS[i], 0xFFAAAAAA); // grey
                }
            }

        } catch (Exception e) {
            setAllDotsFuture(views);
            views.setTextViewText(R.id.dash_next_countdown, "");
        }
    }

    private void setAllDotsFuture(RemoteViews views) {
        for (int dotId : DOT_IDS) {
            views.setTextViewText(dotId, DOT_FUTURE);
            views.setTextColor(dotId, 0xFFAAAAAA);
        }
    }

    // ─── Adhkar section ───────────────────────────────────────────

    private void applyAdhkarSection(RemoteViews views, SharedPreferences prefs) {
        try {
            String json = prefs.getString(KEY_ADHKAR, null);
            if (json == null) {
                views.setTextViewText(R.id.dash_morning_count, "--");
                views.setTextViewText(R.id.dash_evening_count, "--");
                setBarSegments(views, MORNING_SEGMENTS, 0);
                setBarSegments(views, EVENING_SEGMENTS, 0);
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
            applyBar(views, MORNING_SEGMENTS, mDone, mTotal);
            applyBar(views, EVENING_SEGMENTS, eDone, eTotal);

        } catch (Exception e) {
            views.setTextViewText(R.id.dash_morning_count, "--");
            views.setTextViewText(R.id.dash_evening_count, "--");
            setBarSegments(views, MORNING_SEGMENTS, 0);
            setBarSegments(views, EVENING_SEGMENTS, 0);
        }
    }

    // ─── Wird section ─────────────────────────────────────────────

    private void applyWirdSection(RemoteViews views, SharedPreferences prefs) {
        try {
            String json = prefs.getString(KEY_WIRD, null);
            if (json == null) {
                views.setTextViewText(R.id.dash_wird_count, "--");
                views.setTextViewText(R.id.dash_wird_surah, "ابدأ المصحف");
                setBarSegments(views, WIRD_SEGMENTS, 0);
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
            applyBar(views, WIRD_SEGMENTS, ayahsRead, dailyGoal);

        } catch (Exception e) {
            views.setTextViewText(R.id.dash_wird_count, "--");
            views.setTextViewText(R.id.dash_wird_surah, "");
            setBarSegments(views, WIRD_SEGMENTS, 0);
        }
    }

    // ─── Streak section ───────────────────────────────────────────

    private void applyStreakSection(RemoteViews views, SharedPreferences prefs) {
        try {
            String json = prefs.getString(KEY_DASHBOARD, null);
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

    // ─── Progress bar helpers ──────────────────────────────────────

    private void applyBar(RemoteViews views, int[] segmentIds, int done, int total) {
        int active = total > 0
            ? Math.min(segmentIds.length, Math.max(0, (done * segmentIds.length + total - 1) / total))
            : 0;
        setBarSegments(views, segmentIds, active);
    }

    private void setBarSegments(RemoteViews views, int[] segmentIds, int activeCount) {
        for (int i = 0; i < segmentIds.length; i++) {
            views.setViewVisibility(segmentIds[i], i < activeCount ? View.VISIBLE : View.INVISIBLE);
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
