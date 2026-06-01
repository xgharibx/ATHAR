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

    private static final int[] MORNING_SEGMENTS = {
        R.id.adhkar_morning_seg_01, R.id.adhkar_morning_seg_02,
        R.id.adhkar_morning_seg_03, R.id.adhkar_morning_seg_04,
        R.id.adhkar_morning_seg_05, R.id.adhkar_morning_seg_06,
        R.id.adhkar_morning_seg_07, R.id.adhkar_morning_seg_08,
        R.id.adhkar_morning_seg_09, R.id.adhkar_morning_seg_10
    };
    private static final int[] EVENING_SEGMENTS = {
        R.id.adhkar_evening_seg_01, R.id.adhkar_evening_seg_02,
        R.id.adhkar_evening_seg_03, R.id.adhkar_evening_seg_04,
        R.id.adhkar_evening_seg_05, R.id.adhkar_evening_seg_06,
        R.id.adhkar_evening_seg_07, R.id.adhkar_evening_seg_08,
        R.id.adhkar_evening_seg_09, R.id.adhkar_evening_seg_10
    };

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
            try {
                updateLive(context, manager, id);
            } catch (Throwable t) {
                // Never surface "couldn't load widget"; skip this id safely.
            }
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
                applyProgressBar(views, MORNING_SEGMENTS, morningDone, morningTotal);

                // Evening
                views.setTextViewText(R.id.adhkar_evening_count,
                    eveningDone + "/" + eveningTotal);
                applyProgressBar(views, EVENING_SEGMENTS, eveningDone, eveningTotal);

            } else {
                views.setTextViewText(R.id.adhkar_morning_count, "افتح التطبيق");
                views.setTextViewText(R.id.adhkar_evening_count, "--");
                setProgressSegments(views, MORNING_SEGMENTS, 0);
                setProgressSegments(views, EVENING_SEGMENTS, 0);
            }

        } catch (Exception e) {
            views.setTextViewText(R.id.adhkar_morning_count, "--");
            views.setTextViewText(R.id.adhkar_evening_count, "--");
            setProgressSegments(views, MORNING_SEGMENTS, 0);
            setProgressSegments(views, EVENING_SEGMENTS, 0);
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

    private void applyProgressBar(RemoteViews views, int[] segmentIds, int done, int total) {
        if (total <= 0) {
            setProgressSegments(views, segmentIds, 0);
            return;
        }
        int active = Math.min(segmentIds.length, Math.max(0, (done * segmentIds.length + total - 1) / total));
        setProgressSegments(views, segmentIds, active);
    }

    private void setProgressSegments(RemoteViews views, int[] segmentIds, int activeCount) {
        for (int i = 0; i < segmentIds.length; i++) {
            views.setViewVisibility(segmentIds[i], i < activeCount ? View.VISIBLE : View.INVISIBLE);
        }
    }
}
