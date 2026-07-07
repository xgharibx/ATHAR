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
    static final String KEY_INDEX  = "dhikr_index";
    static final String KEY_COUNT  = "dhikr_count";
    static final String KEY_DATE   = "dhikr_date";

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
            checkDayReset(prefs);
            for (int id : appWidgetIds) {
                try {
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
        checkDayReset(prefs);

        int index = prefs.getInt(KEY_INDEX, 0);
        int count = prefs.getInt(KEY_COUNT, 0);

        if (ACTION_INCREMENT.equals(action)) {
            count++;
            bumpDailyTotal(context, DHIKR_AR[index]);
            SharedPreferences.Editor ed = prefs.edit();
            if (count >= DHIKR_TARGET[index]) {
                // Auto-advance to next dhikr
                index = (index + 1) % DHIKR_AR.length;
                ed.putInt(KEY_INDEX, index).putInt(KEY_COUNT, 0);
            } else {
                ed.putInt(KEY_COUNT, count);
            }
            ed.apply();

        } else if (ACTION_RESET.equals(action)) {
            prefs.edit().putInt(KEY_COUNT, 0).apply();

        } else { // ACTION_NEXT
            prefs.edit()
                .putInt(KEY_INDEX, (index + 1) % DHIKR_AR.length)
                .putInt(KEY_COUNT, 0)
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

        final int index   = prefs.getInt(KEY_INDEX, 0);
        final int count   = prefs.getInt(KEY_COUNT, 0);
        final int target  = DHIKR_TARGET[index];
        final String dhikrAr = DHIKR_AR[index];

        RemoteViews views = new RemoteViews(
            context.getPackageName(), R.layout.widget_tasbeeh_counter);

        views.setTextViewText(R.id.tasbeeh_dhikr_text, dhikrAr);
        views.setTextViewText(R.id.tasbeeh_count, String.valueOf(count));
        views.setTextViewText(R.id.tasbeeh_progress_text, count + " / " + target);

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
        views.setOnClickPendingIntent(R.id.tasbeeh_btn_reset, resetPi);

        // Next dhikr button
        Intent nextIntent = new Intent(context, NoorTasbeehWidgetProvider.class)
            .setAction(ACTION_NEXT)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        PendingIntent nextPi = PendingIntent.getBroadcast(
            context, appWidgetId * 10 + 2,
            nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.tasbeeh_btn_next, nextPi);

        // Root tap → open app
        Intent openIntent = new Intent(context, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(
            context, appWidgetId * 10 + 3,
            openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
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
    private static void bumpDailyTotal(Context context, String phrase) {
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

    /** Reset counters and index if the stored date differs from today. */
    private static void checkDayReset(SharedPreferences prefs) {
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        if (!today.equals(prefs.getString(KEY_DATE, ""))) {
            prefs.edit()
                .putString(KEY_DATE, today)
                .putInt(KEY_COUNT, 0)
                .putInt(KEY_INDEX, 0)
                .apply();
        }
    }
}