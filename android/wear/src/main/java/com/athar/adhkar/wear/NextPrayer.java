package com.athar.adhkar.wear;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/** The next prayer from the phone's prayer times (the widgets' payload). */
final class NextPrayer {
    private NextPrayer() {}

    /** { name, "h:mm" } or null. */
    static String[] find(String json) {
        if (json == null) return null;
        try {
            JSONArray prayers = new JSONObject(json).optJSONArray("prayers");
            if (prayers == null || prayers.length() == 0) return null;
            Calendar now = Calendar.getInstance();
            int nowMin = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
            for (int i = 0; i < prayers.length(); i++) {
                JSONObject prayer = prayers.getJSONObject(i);
                String time = prayer.optString("time", "");
                if (minutes(time) > nowMin) return new String[] { prayer.optString("nameAr", ""), clock(time) };
            }
            JSONObject fajr = prayers.getJSONObject(0);
            return new String[] { fajr.optString("nameAr", "الفجر"), clock(fajr.optString("time", "")) };
        } catch (Exception e) {
            return null;
        }
    }

    static int minutes(String hhmm) {
        try {
            String[] parts = hhmm.split(":");
            return Integer.parseInt(parts[0].trim()) * 60 + Integer.parseInt(parts[1].trim().substring(0, 2));
        } catch (RuntimeException e) {
            return -1;
        }
    }

    /** "15:05" → "٣:٠٥". */
    static String clock(String hhmm) {
        int total = minutes(hhmm);
        if (total < 0) return hhmm;
        int hour = total / 60 % 12 == 0 ? 12 : total / 60 % 12;
        return TasbeehActivity.arabicDigits(hour + ":" + String.format(java.util.Locale.US, "%02d", total % 60));
    }
}
