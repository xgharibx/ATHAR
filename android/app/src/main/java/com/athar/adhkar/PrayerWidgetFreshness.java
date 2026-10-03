package com.athar.adhkar;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/** Shared validation for the date and device-clock context on prayer schedules. */
final class PrayerWidgetFreshness {
    private PrayerWidgetFreshness() {}

    static boolean isCurrent(JSONObject payload) {
        TimeZone zone = TimeZone.getDefault();
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        int offsetMinutes = zone.getOffset(System.currentTimeMillis()) / 60000;
        return isCurrent(payload, today, zone.getID(), offsetMinutes);
    }

    static boolean isCurrent(
            JSONObject payload, String today, String timeZoneId, int utcOffsetMinutes) {
        return payload != null
            && today != null
            && !today.isEmpty()
            && timeZoneId != null
            && !timeZoneId.isEmpty()
            && today.equals(payload.optString("dateKey", ""))
            && timeZoneId.equals(payload.optString("timeZoneId", ""))
            && utcOffsetMinutes == payload.optInt("utcOffsetMinutes", Integer.MIN_VALUE);
    }
}
