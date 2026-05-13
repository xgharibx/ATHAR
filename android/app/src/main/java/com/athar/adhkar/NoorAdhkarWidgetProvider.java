package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Daily Adhkar Progress Widget (4×2)
 *
 * Reads morning + evening adhkar completion data written by widgetDataBridge.ts:
 *   SharedPreferences file : "CapacitorStorage"
 *   Key                    : "CapacitorStorage.noor_widget_adhkar_v1"
 *
 * Payload JSON shape:
 *   {
 *     "morning": { "done": 5,  "total": 14 },
 *     "evening": { "done": 2,  "total": 14 },
 *     "updatedAt": "2024-01-15T09:30:00Z"
 *   }
 *
 * Shows:
 *   • "الأذكار الصباحية ☀"  — X/Y + progress bar  (gold)
 *   • "الأذكار المسائية 🌙" — X/Y + progress bar  (blue)
 *   • "افتح الأذكار" pill button
 */
public class NoorAdhkarWidgetProvider extends AtharWidgetProvider {

    private static final String PREFS_FILE = "CapacitorStorage";
    private static final String WIDGET_KEY = "CapacitorStorage.noor_widget_adhkar_v1";

    // Progress bar max width in dp; approximated via layout_weight manipulation
    // For RemoteViews we use setInt to set layout weight (only works on LinearLayout children)
    private static final int BAR_TOTAL_WEIGHT = 1000;

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.widget_adhkar_progress,
            "أذكاري اليوم",
            new String[] { "افتح التطبيق لمزامنة التقدم" },
            "افتح الأذكار"
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            updateLive(context, manager, id);
        }
    }

    private void updateLive(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(
            context.getPackageName(), R.layout.widget_adhkar_progress);

        // Date header
        SimpleDateFormat dateFmt = new SimpleDateFormat("EEEE، d MMMM", new Locale("ar"));
        views.setTextViewText(R.id.adhkar_date, dateFmt.format(new Date()));

        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
            String json = prefs.getString(WIDGET_KEY, null);

            if (json != null) {
                JSONObject payload  = new JSONObject(json);
                JSONObject morning  = payload.optJSONObject("morning");
                JSONObject evening  = payload.optJSONObject("evening");

                int morningDone  = morning  != null ? morning.optInt("done", 0)  : 0;
                int morningTotal = morning  != null ? morning.optInt("total", 14) : 14;
                int eveningDone  = evening  != null ? evening.optInt("done", 0)  : 0;
                int eveningTotal = evening  != null ? evening.optInt("total", 14) : 14;

                // Morning
                views.setTextViewText(R.id.adhkar_morning_count,
                    morningDone + "/" + morningTotal);
                applyProgressBar(views,
                    R.id.adhkar_morning_fill,
                    morningDone, morningTotal);

                // Evening
                views.setTextViewText(R.id.adhkar_evening_count,
                    eveningDone + "/" + eveningTotal);
                applyProgressBar(views,
                    R.id.adhkar_evening_fill,
                    eveningDone, eveningTotal);

            } else {
                views.setTextViewText(R.id.adhkar_morning_count, "افتح التطبيق");
                views.setTextViewText(R.id.adhkar_evening_count, "--");
                setProgressWidth(views, R.id.adhkar_morning_fill, 0);
                setProgressWidth(views, R.id.adhkar_evening_fill, 0);
            }

        } catch (Exception e) {
            views.setTextViewText(R.id.adhkar_morning_count, "--");
            views.setTextViewText(R.id.adhkar_evening_count, "--");
            setProgressWidth(views, R.id.adhkar_morning_fill, 0);
            setProgressWidth(views, R.id.adhkar_evening_fill, 0);
        }

        // Tap → open app
        Intent intent = new Intent(context, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            context, appWidgetId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.adhkar_root, pi);
        views.setOnClickPendingIntent(R.id.adhkar_open_btn, pi);

        manager.updateAppWidget(appWidgetId, views);
    }

    /**
     * Set the width of a progress fill view as a percentage of its parent.
     * RemoteViews cannot set layout_weight directly, so we use setViewVisibility
     * toggling: the fill view has layout_width="0dp" by default; we set its
     * width via setInt with "setLayoutParams" workaround using a fixed pixel width
     * proportional to the container.  For simplicity we use a fixed 240dp total
     * and scale it.
     */
    private void applyProgressBar(RemoteViews views, int fillId, int done, int total) {
        if (total <= 0) {
            setProgressWidth(views, fillId, 0);
            return;
        }
        int pct = Math.min(100, (done * 100) / total);
        setProgressWidth(views, fillId, pct);
    }

    /**
     * Set fill view width to (pct/100) of parent by toggling visibility.
     * Since RemoteViews doesn't support setLayoutParams directly for fill bars,
     * we approximate by using a weighted layout: the fill view starts as 0dp
     * and we set its weight.  Note: setLayoutParams via reflection is unavailable
     * in RemoteViews, so we use a FrameLayout overlay approach with the fill View
     * having a fixed percentage width set via android:layout_width in XML anchored
     * to a FrameLayout.  We control it with setViewVisibility thresholds (10 buckets).
     *
     * For precision: we use setInt(viewId, "setVisibility", ...) and pre-baked
     * 10 fill-level drawables.  Instead here we use a simpler but effective approach:
     * We show/hide the fill completely if 0 or 100%, otherwise we use setScaleX.
     */
    private void setProgressWidth(RemoteViews views, int fillId, int pct) {
        if (pct <= 0) {
            views.setViewVisibility(fillId, View.INVISIBLE);
        } else {
            views.setViewVisibility(fillId, View.VISIBLE);
            // Scale the fill bar horizontally from its left edge
            float scale = pct / 100f;
            views.setFloat(fillId, "setScaleX", scale);
            // Pivot to left so it grows left→right
            views.setFloat(fillId, "setPivotX", 0f);
        }
    }
}
