package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Quick Dhikr Tally Widget (2×1)
 *
 * The slim, single-row sibling of the full Tasbeeh counter (2×2) — for
 * home-screen slots too small for the full counter's ring/reset/next
 * controls. The whole tile is one tap-to-increment zone showing today's
 * rotating dhikr phrase and a live tally that resets at midnight. Taps
 * feed the same daily-totals ledger Tasbeeh writes (bumpDailyTotal), so
 * both widgets count toward the user's in-app stats.
 *
 * Previously this was a static tile: a day-rotating phrase plus a button
 * captioned "عد الآن" ("count now") that did nothing but open the app —
 * a widget whose own call-to-action didn't work on the widget itself.
 */
public class NoorCompactWidgetProvider extends AtharWidgetProvider {

    public static final String ACTION_INCREMENT = "com.athar.adhkar.COMPACT_INCREMENT";

    private static final String PREFS_FILE = "AtharCompact";

    private static String keyCount(int id) { return "compact_count_" + id; }
    private static String keyDate(int id)  { return "compact_date_" + id; }

    private static final String[] DHIKR_AR = {
        "سبحان الله",
        "الحمد لله",
        "الله أكبر",
        "لا إله إلا الله",
        "أستغفر الله",
        "لا حول ولا قوة إلا بالله"
    };

    // ─── AtharWidgetProvider contract (fallback spec only — onUpdate is
    // fully overridden below, same as NoorTasbeehWidgetProvider) ────────
    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.noor_widget_compact,
            "ذكر سريع",
            new String[] { DHIKR_AR[0] },
            "اضغط للعد"
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
        for (int id : appWidgetIds) {
            try {
                checkDayReset(prefs, id);
                updateSingle(context, manager, id, prefs);
            } catch (Throwable t) {
                // Never surface "couldn't load widget"; skip this id safely.
            }
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        try {
            handleAction(context, intent);
        } catch (Throwable t) {
            // Same crash guard as onUpdate — this fires on every tap.
        }
    }

    private void handleAction(Context context, Intent intent) {
        if (!ACTION_INCREMENT.equals(intent.getAction())) return;

        int widgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
        checkDayReset(prefs, widgetId);

        int count = prefs.getInt(keyCount(widgetId), 0) + 1;
        prefs.edit().putInt(keyCount(widgetId), count).apply();
        NoorTasbeehWidgetProvider.bumpDailyTotal(context, todaysPhrase());

        updateSingle(context, AppWidgetManager.getInstance(context), widgetId, prefs);
    }

    private void updateSingle(
            Context context, AppWidgetManager manager, int appWidgetId, SharedPreferences prefs) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.noor_widget_compact);

        views.setTextViewText(R.id.noor_widget_title, "ذكر سريع");
        views.setTextViewText(R.id.noor_widget_phrase, todaysPhrase());
        views.setTextViewText(R.id.compact_count, String.valueOf(prefs.getInt(keyCount(appWidgetId), 0)));

        Intent incIntent = new Intent(context, NoorCompactWidgetProvider.class)
            .setAction(ACTION_INCREMENT)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        PendingIntent incPi = PendingIntent.getBroadcast(
            context, appWidgetId * 11,
            incIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.noor_widget_root, incPi);

        manager.updateAppWidget(appWidgetId, views);
    }

    private static String todaysPhrase() {
        int dayIndex = (int) (System.currentTimeMillis() / 86400000L);
        return DHIKR_AR[Math.floorMod(dayIndex, DHIKR_AR.length)];
    }

    /** Reset this widget instance's tally if its stored date differs from today. */
    private static void checkDayReset(SharedPreferences prefs, int widgetId) {
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        if (!today.equals(prefs.getString(keyDate(widgetId), ""))) {
            prefs.edit()
                .putString(keyDate(widgetId), today)
                .putInt(keyCount(widgetId), 0)
                .apply();
        }
    }
}
