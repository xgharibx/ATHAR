package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Ultimate Interactive Tasbeeh Counter Widget
 *
 * A fully live, interactive home-screen counter.  No app open required:
 *   • Tap the central zone → increments count in SharedPreferences → widget refreshes instantly
 *   • "إعادة" button → resets count to 0 for the current dhikr
 *   • "التالي" button → advances to the next dhikr phrase
 *   • Auto-advances when the target count (e.g. 33) is reached
 *   • Resets all counts at midnight (checked on each interaction)
 *
 * SharedPreferences file : "AtharTasbeeh"
 * Keys                   : dhikr_index, dhikr_count, dhikr_date
 */
public class NoorTasbeehWidgetProvider extends AtharWidgetProvider {

    // Broadcast actions — also declared as intent-filter actions in AndroidManifest
    public static final String ACTION_INCREMENT = "com.athar.adhkar.TASBEEH_INCREMENT";
    public static final String ACTION_RESET     = "com.athar.adhkar.TASBEEH_RESET";
    public static final String ACTION_NEXT      = "com.athar.adhkar.TASBEEH_NEXT";

    static final String PREFS_FILE = "AtharTasbeeh";

    // Keyed per appWidgetId — two Tasbeeh widgets placed side by side on the
    // same home screen used to share one global "dhikr_index"/"dhikr_count",
    // so tapping one silently incremented the other's counter too and the
    // two visually desynced. Each widget instance now owns its own count.
    private static String keyIndex(int id) { return "dhikr_index_" + id; }
    private static String keyCount(int id) { return "dhikr_count_" + id; }
    private static String keyDate(int id)  { return "dhikr_date_" + id; }

    /**
     * Daily totals mirrored into the app-readable "CapacitorStorage" prefs so
     * home-screen tasbeeh counts toward the user's in-app stats (streak,
     * weekly charts, lifetime counters). Read by src/lib/tasbeehWidgetSync.ts.
     */
    static final String TOTALS_KEY = "noor_widget_tasbeeh_totals_v1";

    // Dhikr names (Arabic) and per-phrase target counts
    private static final String[] DHIKR_AR = {
        "سُبْحَانَ اللَّهِ",
        "الحَمْدُ لِلَّهِ",
        "اللَّهُ أَكْبَر",
        "لا إِلَهَ إِلَّا اللَّه"
    };
    private static final int[] DHIKR_TARGET = { 33, 33, 33, 100 };

    // ─────────────────────────────────────────────────────
    // AtharWidgetProvider contract (fallback spec only)
    // ─────────────────────────────────────────────────────

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.widget_tasbeeh_counter,
            "السبحة",
            new String[] { "سُبْحَانَ اللَّهِ" },
            "اضغط للتسبيح"
        );
    }

    // ─────────────────────────────────────────────────────
    // Widget lifecycle
    // ─────────────────────────────────────────────────────

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
            for (int id : appWidgetIds) {
                try {
                    checkDayReset(prefs, id);
                    updateSingle(context, manager, id, prefs);
                } catch (Throwable t) {
                    // Never surface "couldn't load widget"; skip this id safely.
                }
            }
        } catch (Throwable t) {
            // Guard the whole update path.
        }
    }

    // ─────────────────────────────────────────────────────
    // Broadcast receiver — handles button taps
    // ─────────────────────────────────────────────────────

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        try {
            handleAction(context, intent);
        } catch (Throwable t) {
            // Same "never surface couldn't load widget" contract as
            // onUpdate — this is the most frequently invoked path (every
            // tap), so it needs the same crash guard, not just the passive
            // update path.
        }
    }

    private void handleAction(Context context, Intent intent) {
        final String action = intent.getAction();
        if (!ACTION_INCREMENT.equals(action)
                && !ACTION_RESET.equals(action)
                && !ACTION_NEXT.equals(action)) {
            return;
        }

        int widgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        );
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
        checkDayReset(prefs, widgetId);

        int index = prefs.getInt(keyIndex(widgetId), 0);
        int count = prefs.getInt(keyCount(widgetId), 0);

        if (ACTION_INCREMENT.equals(action)) {
            count++;
            bumpDailyTotal(context, DHIKR_AR[index]);
            SharedPreferences.Editor ed = prefs.edit();
            if (count >= DHIKR_TARGET[index]) {
                // Auto-advance to next dhikr
                index = (index + 1) % DHIKR_AR.length;
                ed.putInt(keyIndex(widgetId), index).putInt(keyCount(widgetId), 0);
            } else {
                ed.putInt(keyCount(widgetId), count);
            }
            ed.apply();

        } else if (ACTION_RESET.equals(action)) {
            prefs.edit().putInt(keyCount(widgetId), 0).apply();

        } else { // ACTION_NEXT
            prefs.edit()
                .putInt(keyIndex(widgetId), (index + 1) % DHIKR_AR.length)
                .putInt(keyCount(widgetId), 0)
                .apply();
        }

        // Re-read after changes and push RemoteViews update
        prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        updateSingle(context, mgr, widgetId, prefs);
    }

    // ─────────────────────────────────────────────────────
    // RemoteViews builder
    // ─────────────────────────────────────────────────────

    static void updateSingle(
            Context context,
            AppWidgetManager manager,
            int appWidgetId,
            SharedPreferences prefs) {

        final int index   = prefs.getInt(keyIndex(appWidgetId), 0);
        final int count   = prefs.getInt(keyCount(appWidgetId), 0);
        final int target  = DHIKR_TARGET[index];
        final String dhikrAr = DHIKR_AR[index];

        RemoteViews views = new RemoteViews(
            context.getPackageName(), R.layout.widget_tasbeeh_counter);

        views.setTextViewText(R.id.tasbeeh_dhikr_text, dhikrAr);
        views.setTextViewText(R.id.tasbeeh_count, String.valueOf(count));
        views.setTextViewText(R.id.tasbeeh_progress_text, count + " / " + target);

        // Glowing gold progress ring around the count
        views.setImageViewBitmap(R.id.tasbeeh_ring,
            WidgetCanvas.ring(context, 150, 9, target > 0 ? count / (float) target : 0f));

        // Living sky: no prayer-schedule data here, so the mood is derived
        // purely from wall-clock time instead of the actual next prayer.
        boolean dark = WidgetCanvas.isDarkTheme(context);
        int[] sz = WidgetCanvas.sizeDp(context, manager, appWidgetId, 150, 150);
        WidgetCanvas.ClockSky sky = WidgetCanvas.clockPhase();
        views.setImageViewBitmap(R.id.tasbeeh_sky,
            WidgetCanvas.sky(context, sz[0], sz[1], sky.fromPhase, sky.toPhase, sky.blend,
                WidgetCanvas.outerCornerRadiusDp(context), dark));
        // Starfield only against the dark palette's actual night phases — the
        // light palette's night phases are soft twilight tones, not black.
        if (dark && sky.isNight()) {
            views.setViewVisibility(R.id.tasbeeh_stars, android.view.View.VISIBLE);
            views.setImageViewBitmap(R.id.tasbeeh_stars,
                WidgetCanvas.starfield(context, sz[0], sz[1], System.currentTimeMillis() / 60000));
        } else {
            views.setViewVisibility(R.id.tasbeeh_stars, android.view.View.GONE);
        }

        // Central tap zone → increment
        Intent incIntent = new Intent(context, NoorTasbeehWidgetProvider.class)
            .setAction(ACTION_INCREMENT)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        PendingIntent incPi = PendingIntent.getBroadcast(
            context, appWidgetId * 10,
            incIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.tasbeeh_tap_zone, incPi);

        // Reset button
        Intent resetIntent = new Intent(context, NoorTasbeehWidgetProvider.class)
            .setAction(ACTION_RESET)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        PendingIntent resetPi = PendingIntent.getBroadcast(
            context, appWidgetId * 10 + 1,
            resetIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.tasbeeh_reset_zone, resetPi);

        // Next dhikr button
        Intent nextIntent = new Intent(context, NoorTasbeehWidgetProvider.class)
            .setAction(ACTION_NEXT)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        PendingIntent nextPi = PendingIntent.getBroadcast(
            context, appWidgetId * 10 + 2,
            nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.tasbeeh_next_zone, nextPi);

        // Root tap → open the Sebha screen directly
        PendingIntent openPi = openApp(context, appWidgetId * 10 + 3, "/sebha");
        views.setOnClickPendingIntent(R.id.tasbeeh_root, openPi);

        manager.updateAppWidget(appWidgetId, views);
    }

    // ─────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────

    /**
     * Mirror each home-screen tap into an app-readable daily-totals JSON:
     *   { "date": "YYYY-MM-DD", "counts": { "<phrase>": n, ... }, "total": N }
     * Stored in the "CapacitorStorage" prefs file so the web app can merge it
     * into the user's stats via @capacitor/preferences.
     */
    static void bumpDailyTotal(Context context, String phrase) {
        try {
            SharedPreferences appPrefs = WidgetData.prefs(context);
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
            String existing = appPrefs.getString(TOTALS_KEY, null);
            JSONObject payload = existing != null ? new JSONObject(existing) : new JSONObject();
            if (!today.equals(payload.optString("date"))) {
                payload = new JSONObject();
                payload.put("date", today);
            }
            JSONObject counts = payload.optJSONObject("counts");
            if (counts == null) {
                counts = new JSONObject();
                payload.put("counts", counts);
            }
            counts.put(phrase, counts.optInt(phrase, 0) + 1);
            payload.put("total", payload.optInt("total", 0) + 1);
            appPrefs.edit().putString(TOTALS_KEY, payload.toString()).apply();
        } catch (Throwable ignored) {
            // Totals mirroring is best-effort; the widget counter itself is source of truth.
        }
    }

    /** Reset this widget instance's counter and index if its stored date differs from today. */
    private static void checkDayReset(SharedPreferences prefs, int widgetId) {
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        if (!today.equals(prefs.getString(keyDate(widgetId), ""))) {
            prefs.edit()
                .putString(keyDate(widgetId), today)
                .putInt(keyCount(widgetId), 0)
                .putInt(keyIndex(widgetId), 0)
                .apply();
        }
    }
}