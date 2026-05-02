package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Prayer widget that reads live data from SharedPreferences.
 *
 * The web layer writes prayer data via @capacitor/preferences under:
 *   SharedPreferences file : "CapacitorStorage"
 *   Key                    : "CapacitorStorage.noor_widget_prayer_v2"
 *
 * Payload JSON shape (see src/lib/prayerWidget.ts):
 *   { nextPrayer: { nameAr, time } | null, prayers: [...], updatedAt }
 */
public class NoorPrayerWidgetProvider extends AtharWidgetProvider {

    private static final String PREFS_FILE = "CapacitorStorage";
    private static final String WIDGET_KEY = "CapacitorStorage.noor_widget_prayer_v2";

    @Override
    protected AtharWidgetSpec getSpec() {
        // Fallback spec used when live data is unavailable
        return new AtharWidgetSpec(
            R.layout.noor_widget_prayer,
            "الصلاة القادمة",
            new String[] {
                "استعد للصلاة قبل الأذان بدقائق",
                "الصلاة نور وراحة للقلب",
                "حي على الفلاح",
                "ثبت قلبك على الصلاة في وقتها"
            },
            "مواقيت الصلاة"
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            updateLive(context, manager, id);
        }
    }

    private void updateLive(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.noor_widget_prayer);

        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
            String json = prefs.getString(WIDGET_KEY, null);

            SimpleDateFormat dateFmt = new SimpleDateFormat("EEEE، d MMMM", new Locale("ar"));
            views.setTextViewText(R.id.noor_widget_date, dateFmt.format(new Date()));

            if (json != null) {
                JSONObject payload = new JSONObject(json);

                if (!payload.isNull("nextPrayer")) {
                    JSONObject next = payload.getJSONObject("nextPrayer");
                    String nameAr = next.getString("nameAr");
                    String time24 = next.getString("time");
                    String countdown = buildCountdown(time24);

                    views.setTextViewText(R.id.noor_widget_title, "الصلاة القادمة");
                    views.setTextViewText(R.id.noor_widget_phrase, nameAr + "   " + format12h(time24));
                    views.setTextViewText(R.id.noor_widget_action,
                        countdown.isEmpty() ? "مواقيت الصلاة" : countdown);
                } else {
                    views.setTextViewText(R.id.noor_widget_title, "صلوات اليوم");
                    views.setTextViewText(R.id.noor_widget_phrase, "اكتملت صلوات اليوم ✓");
                    views.setTextViewText(R.id.noor_widget_action, "مواقيت الصلاة");
                }
            } else {
                // App not opened yet — prompt user
                views.setTextViewText(R.id.noor_widget_title, "الصلاة القادمة");
                views.setTextViewText(R.id.noor_widget_phrase, "افتح التطبيق لتحميل المواقيت");
                views.setTextViewText(R.id.noor_widget_action, "فتح التطبيق");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.noor_widget_title, "الصلاة القادمة");
            views.setTextViewText(R.id.noor_widget_phrase, "افتح التطبيق");
            views.setTextViewText(R.id.noor_widget_action, "مواقيت الصلاة");
        }

        // Tap opens app
        Intent intent = new Intent(context, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, appWidgetId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.noor_widget_root, pi);
        views.setOnClickPendingIntent(R.id.noor_widget_action, pi);

        manager.updateAppWidget(appWidgetId, views);
    }

    /** Convert "HH:MM" to Arabic 12-hour format. */
    private String format12h(String time24) {
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

    /** Return human-readable countdown to "HH:MM", or "" if already passed. */
    private String buildCountdown(String time24) {
        try {
            String[] p = time24.split(":");
            int targetH = Integer.parseInt(p[0]);
            int targetM = Integer.parseInt(p[1]);
            Calendar cal = Calendar.getInstance();
            int diff = (targetH * 60 + targetM) - (cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE));
            if (diff <= 0) return "";
            if (diff < 60) return "بعد " + diff + " دقيقة";
            int h = diff / 60, min = diff % 60;
            return min == 0 ? "بعد " + h + " ساعة" : "بعد " + h + "س " + min + "د";
        } catch (Exception e) {
            return "";
        }
    }
}
