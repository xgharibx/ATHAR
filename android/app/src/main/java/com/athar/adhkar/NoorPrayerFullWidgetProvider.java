package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Full Prayer Times Widget (4×3)
 *
 * Reads live prayer data from the key written by prayerWidget.ts:
 *   SharedPreferences file : "CapacitorStorage"
 *   Key                    : "CapacitorStorage.noor_widget_prayer_v2"
 *
 * Features:
 *   • All 5 daily prayers in individual rows (Fajr, Dhuhr, Asr, Maghrib, Isha)
 *   • Passed prayers dimmed with ✓ marker
 *   • Next prayer highlighted (gold background row) with live countdown
 *   • Future prayers shown in neutral colours
 *   • Suhoor / Iftar rows auto-shown during Ramadan
 *   • Tap anywhere to open the app
 */
public class NoorPrayerFullWidgetProvider extends AtharWidgetProvider {

    private static final String WIDGET_KEY = "noor_widget_prayer_v2";

    // View IDs for the five prayer rows — must match widget_prayer_full.xml
    private static final int[] ROW_IDS    = {
        R.id.row_fajr,    R.id.row_dhuhr,    R.id.row_asr,
        R.id.row_maghrib, R.id.row_isha
    };
    private static final int[] NAME_IDS   = {
        R.id.name_fajr,   R.id.name_dhuhr,   R.id.name_asr,
        R.id.name_maghrib, R.id.name_isha
    };
    private static final int[] TIME_IDS   = {
        R.id.time_fajr,   R.id.time_dhuhr,   R.id.time_asr,
        R.id.time_maghrib, R.id.time_isha
    };
    private static final int[] STATUS_IDS = {
        R.id.status_fajr,   R.id.status_dhuhr,   R.id.status_asr,
        R.id.status_maghrib, R.id.status_isha
    };

    private static final String[] FALLBACK_NAMES = {
        "الفجر", "الظهر", "العصر", "المغرب", "العشاء"
    };

    // ─────────────────────────────────────────────────────
    // AtharWidgetProvider contract (fallback spec only)
    // ─────────────────────────────────────────────────────

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.widget_prayer_full,
            "مواقيت الصلاة",
            new String[] { "افتح التطبيق لتحميل المواقيت" },
            "مواقيت الصلاة"
        );
    }

    // ─────────────────────────────────────────────────────
    // Widget lifecycle
    // ─────────────────────────────────────────────────────

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

    // ─────────────────────────────────────────────────────
    // RemoteViews builder
    // ─────────────────────────────────────────────────────

    private void updateLive(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(
            context.getPackageName(), R.layout.widget_prayer_full);

        // Arabic date header — Gregorian + Hijri (umalqura)
        views.setTextViewText(R.id.prayer_full_date, dateLine());

        String skyName = null;
        int prevMin = 0, nextMin = -1;
        try {
            String json = WidgetData.readJson(context, WIDGET_KEY);

            if (json != null) {
                JSONObject payload  = new JSONObject(json);
                JSONArray  prayers  = payload.optJSONArray("prayers");

                // Recomputed live from the device's current time, NOT from
                // payload.nextPrayer / p.passed — those are a snapshot from
                // whenever the JS side last synced (at most once/day).
                // Trusting that snapshot directly made this widget keep
                // highlighting an already-passed prayer as "next" for hours.
                // See NoorPrayerWidgetProvider for the original fix.
                String nextNameAr = null;
                if (prayers != null) {
                    int nowMin = nowMinutes();
                    for (int i = 0; i < prayers.length(); i++) {
                        JSONObject p = prayers.getJSONObject(i);
                        if (toMinutesOfDay(p.optString("time", "0:0")) > nowMin) {
                            nextNameAr = p.optString("nameAr", null);
                            break;
                        }
                    }
                }

                // Ramadan rows
                boolean isRamadan = payload.optBoolean("isRamadan", false);
                views.setViewVisibility(R.id.row_suhoor,
                    isRamadan ? android.view.View.VISIBLE : android.view.View.GONE);
                views.setViewVisibility(R.id.row_iftar,
                    isRamadan ? android.view.View.VISIBLE : android.view.View.GONE);

                if (isRamadan) {
                    String suhoor = payload.optString("suhoor", "");
                    String iftar  = payload.optString("iftar", "");
                    if (!suhoor.isEmpty() && !"null".equals(suhoor)) {
                        views.setTextViewText(R.id.time_suhoor, format12h(suhoor));
                    }
                    if (!iftar.isEmpty() && !"null".equals(iftar)) {
                        views.setTextViewText(R.id.time_iftar, format12h(iftar));
                    }
                }

                // Populate 5 prayer rows
                int count = prayers != null ? Math.min(prayers.length(), ROW_IDS.length) : 0;
                int passedCount = 0;
                int nowMinForRows = nowMinutes();
                for (int i = 0; i < count; i++) {
                    JSONObject p     = prayers.getJSONObject(i);
                    String nameAr    = p.optString("nameAr", FALLBACK_NAMES[i]);
                    String time24    = p.optString("time", "--:--");
                    // Live, not the stale p.optBoolean("passed", false) snapshot.
                    boolean passed   = toMinutesOfDay(time24) <= nowMinForRows;
                    boolean isNext   = nameAr.equals(nextNameAr);
                    if (passed) { passedCount++; prevMin = Math.max(prevMin, toMinutesOfDay(time24)); }
                    if (isNext) nextMin = toMinutesOfDay(time24);

                    views.setTextViewText(NAME_IDS[i], nameAr);
                    views.setTextViewText(TIME_IDS[i], format12h(time24));

                    if (isNext) {
                        views.setInt(ROW_IDS[i], "setBackgroundResource",
                            R.drawable.widget_prayer_row_active);
                        views.setTextColor(NAME_IDS[i], ContextCompat.getColor(context, R.color.widget_row_active));
                        views.setTextColor(TIME_IDS[i], ContextCompat.getColor(context, R.color.widget_row_active_time));
                        String cd = buildCountdown(time24);
                        views.setTextViewText(STATUS_IDS[i], cd.isEmpty() ? "▶" : "");
                        views.setTextColor(STATUS_IDS[i], ContextCompat.getColor(context, R.color.widget_row_active));
                        // Show countdown in header
                        views.setTextViewText(R.id.prayer_full_countdown,
                            cd.isEmpty() ? "حان وقت " + nameAr : cd);

                    } else if (passed) {
                        views.setInt(ROW_IDS[i], "setBackgroundColor", Color.TRANSPARENT);
                        views.setTextColor(NAME_IDS[i], ContextCompat.getColor(context, R.color.widget_row_passed));
                        views.setTextColor(TIME_IDS[i], ContextCompat.getColor(context, R.color.widget_row_passed_time));
                        views.setTextViewText(STATUS_IDS[i], "✓");
                        views.setTextColor(STATUS_IDS[i], ContextCompat.getColor(context, R.color.widget_row_passed));

                    } else {
                        views.setInt(ROW_IDS[i], "setBackgroundColor", Color.TRANSPARENT);
                        views.setTextColor(NAME_IDS[i], ContextCompat.getColor(context, R.color.widget_row_future));
                        views.setTextColor(TIME_IDS[i], ContextCompat.getColor(context, R.color.widget_row_future_time));
                        views.setTextViewText(STATUS_IDS[i], "");
                    }
                }

                // Fill remaining rows with placeholders if fewer than 5 prayers returned
                for (int i = count; i < ROW_IDS.length; i++) {
                    views.setTextViewText(NAME_IDS[i], FALLBACK_NAMES[i]);
                    views.setTextViewText(TIME_IDS[i], "--:--");
                    views.setTextViewText(STATUS_IDS[i], "");
                    views.setInt(ROW_IDS[i], "setBackgroundColor", Color.TRANSPARENT);
                }

                if (nextNameAr == null) {
                    views.setTextViewText(R.id.prayer_full_countdown, "اكتملت صلوات اليوم ✓");
                }
                skyName = nextNameAr;

                // Gold sweep-gradient ring (WidgetCanvas) showing today's prayer
                // completion — matches the dashboard/tasbeeh widgets' visual
                // language instead of leaving this widget as flat text rows.
                if (count > 0) {
                    float ringProgress = passedCount / (float) count;
                    views.setImageViewBitmap(R.id.prayer_full_ring,
                        WidgetCanvas.ring(context, 34, 4f, ringProgress));
                    views.setTextViewText(R.id.prayer_full_ring_label,
                        toArabicNumerals(passedCount) + "/" + toArabicNumerals(count));
                }

            } else {
                // Data not synced yet
                showPlaceholders(views);
                views.setTextViewText(R.id.prayer_full_countdown,
                    "افتح التطبيق لتحميل المواقيت");
            }

        } catch (Exception e) {
            showPlaceholders(views);
            views.setTextViewText(R.id.prayer_full_countdown, "تعذّر تحميل المواقيت");
        }

        // Continuous sky — LERPs from the phase just passed toward the one
        // being counted down to, same fraction the header countdown uses,
        // instead of jumping between 5 fixed images.
        boolean dark = WidgetCanvas.isDarkTheme(context);
        int toPhase = NoorPrayerWidgetProvider.phaseFor(skyName);
        int fromPhase = NoorPrayerWidgetProvider.prevPhase(toPhase);
        float skyBlend = intervalProgressFor(prevMin, nextMin);
        views.setImageViewBitmap(R.id.prayer_full_sky,
            WidgetCanvas.sky(context, 250, 220, fromPhase, toPhase, skyBlend,
                WidgetCanvas.outerCornerRadiusDp(context), dark));

        // Starfield only against the dark palette's actual night phases —
        // the light palette's Isha is a soft twilight grey, not black, so
        // gold star specks would look like stray debris on it. (Previously
        // this rendered unconditionally, including during bright daytime
        // phases in dark mode too — also fixed here.)
        boolean nightPhase = toPhase == WidgetCanvas.PHASE_FAJR || toPhase == WidgetCanvas.PHASE_ISHA
            || fromPhase == WidgetCanvas.PHASE_FAJR || fromPhase == WidgetCanvas.PHASE_ISHA;
        if (dark && nightPhase) {
            views.setViewVisibility(R.id.prayer_full_stars, android.view.View.VISIBLE);
            views.setImageViewBitmap(R.id.prayer_full_stars,
                WidgetCanvas.starfield(context, 250, 220, 46, System.currentTimeMillis() / 60000));
        } else {
            views.setViewVisibility(R.id.prayer_full_stars, android.view.View.GONE);
        }

        // Tap → open prayer times directly
        PendingIntent pi = openApp(context, appWidgetId * 23, "/prayer-times");
        views.setOnClickPendingIntent(R.id.prayer_full_root, pi);

        manager.updateAppWidget(appWidgetId, views);
    }

    // ─────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────

    private void showPlaceholders(RemoteViews views) {
        views.setViewVisibility(R.id.row_suhoor, android.view.View.GONE);
        views.setViewVisibility(R.id.row_iftar, android.view.View.GONE);
        views.setTextViewText(R.id.prayer_full_ring_label, "");
        for (int i = 0; i < ROW_IDS.length; i++) {
            views.setTextViewText(NAME_IDS[i], FALLBACK_NAMES[i]);
            views.setTextViewText(TIME_IDS[i], "--:--");
            views.setTextViewText(STATUS_IDS[i], "");
            views.setInt(ROW_IDS[i], "setBackgroundColor", Color.TRANSPARENT);
        }
    }

    /** Convert "HH:MM" 24-hour time to Arabic 12-hour display. */
    private String format12h(String time24) {
        if (time24 == null || time24.isEmpty() || "--:--".equals(time24)) return "--:--";
        try {
            String[] p = time24.split(":");
            int h = Integer.parseInt(p[0]);
            int m = Integer.parseInt(p[1]);
            String suffix = h < 12 ? "ص" : "م";
            int h12 = h % 12;
            if (h12 == 0) h12 = 12;
            return String.format(Locale.US, "%d:%02d %s", h12, m, suffix);
        } catch (Exception e) {
            return time24;
        }
    }

    /** Return human-readable Arabic countdown to "HH:MM", or "" if already past. */
    private String buildCountdown(String time24) {
        if (time24 == null || time24.isEmpty() || "--:--".equals(time24)) return "";
        try {
            String[] p = time24.split(":");
            int targetH = Integer.parseInt(p[0]);
            int targetM = Integer.parseInt(p[1]);
            Calendar cal = Calendar.getInstance();
            int diff = (targetH * 60 + targetM)
                - (cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE));
            if (diff <= 0) return "";
            if (diff < 60) return "بعد " + diff + " دقيقة";
            int h = diff / 60, min = diff % 60;
            return min == 0
                ? "بعد " + h + " ساعة"
                : "بعد " + h + "س " + min + "د";
        } catch (Exception e) {
            return "";
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

    /** Elapsed fraction (0..1) of the way from prevMin to nextMin — the same
     *  quantity the countdown ring/sky use to agree on "how far through". */
    private static float intervalProgressFor(int prevMin, int nextMin) {
        if (nextMin < 0) return 1f; // all prayers passed — treat as "at" the next phase
        Calendar cal = Calendar.getInstance();
        int nowMin = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE);
        int span = Math.max(1, nextMin - prevMin);
        return Math.max(0f, Math.min(1f, (nowMin - prevMin) / (float) span));
    }

    /** Convert Latin digits to Arabic-Indic numerals. */
    private static String toArabicNumerals(int n) {
        return String.valueOf(n)
            .replace('0', '٠').replace('1', '١').replace('2', '٢')
            .replace('3', '٣').replace('4', '٤').replace('5', '٥')
            .replace('6', '٦').replace('7', '٧').replace('8', '٨')
            .replace('9', '٩');
    }
}
