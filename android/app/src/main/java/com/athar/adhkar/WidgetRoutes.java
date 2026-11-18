package com.athar.adhkar;

import android.content.Context;
import java.util.Calendar;
import org.json.JSONArray;
import org.json.JSONObject;

/** Where a widget tap lands, worked out at the moment of the tap. */
final class WidgetRoutes {
    private WidgetRoutes() {}

    /** The adhkar of this time of day: the adhkar widget's own route. */
    static final String ADHKAR_NOW = "/c/now";

    /** "/c/now" → morning adhkar from Fajr until Asr, evening adhkar from Asr. */
    static String resolve(Context context, String route) {
        if (!ADHKAR_NOW.equals(route)) return route;
        return eveningNow(context, Calendar.getInstance()) ? "/c/evening" : "/c/morning";
    }

    static boolean eveningNow(Context context, Calendar now) {
        int minutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        int fajr = -1;
        int asr = -1;
        try {
            String json = WidgetData.readJson(context, "noor_widget_prayer_v2");
            JSONArray prayers = json == null ? null : new JSONObject(json).optJSONArray("prayers");
            for (int i = 0; prayers != null && i < prayers.length(); i++) {
                JSONObject prayer = prayers.getJSONObject(i);
                int at = toMinutes(prayer.optString("time", ""));
                if ("Fajr".equals(prayer.optString("name"))) fajr = at;
                if ("Asr".equals(prayer.optString("name"))) asr = at;
            }
        } catch (Exception ignored) {
            // No prayer times saved yet: the clock decides below.
        }
        if (fajr < 0) fajr = 4 * 60;
        if (asr < 0) asr = 15 * 60;
        return minutes >= asr || minutes < fajr;
    }

    private static int toMinutes(String hhmm) {
        try {
            String[] parts = hhmm.trim().split(":");
            return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1].substring(0, 2));
        } catch (RuntimeException e) {
            return -1;
        }
    }
}
