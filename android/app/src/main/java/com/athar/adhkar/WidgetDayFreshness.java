package com.athar.adhkar;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/** Small, Android-free helpers for hiding stale daily widget values at their local day boundary. */
final class WidgetDayFreshness {
    private WidgetDayFreshness() {}

    /** Returns today's date in the device's current local timezone. */
    static String localDayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    /** Calculates the current Fajr-based ibadah day from the device clock and last known Fajr. */
    static String currentIbadahDayKey(Date now, String fajrTime) {
        Calendar current = Calendar.getInstance();
        current.setTime(now != null ? now : new Date());
        Calendar fajr = (Calendar) current.clone();
        String clock = fajrTime == null ? "" : fajrTime.trim().split("\\s+", 2)[0];
        String[] parts = clock.split(":", -1);
        if (parts.length != 2) return formatDay(current.getTime());

        try {
            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1]);
            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return formatDay(current.getTime());
            fajr.set(Calendar.HOUR_OF_DAY, hour);
            fajr.set(Calendar.MINUTE, minute);
            fajr.set(Calendar.SECOND, 0);
            fajr.set(Calendar.MILLISECOND, 0);
        } catch (NumberFormatException ignored) {
            return formatDay(current.getTime());
        }

        if (current.before(fajr)) current.add(Calendar.DAY_OF_MONTH, -1);
        return formatDay(current.getTime());
    }

    static boolean isCurrentDay(String storedDay, String localDay) {
        return storedDay != null
            && storedDay.matches("\\d{4}-\\d{2}-\\d{2}")
            && storedDay.equals(localDay);
    }

    /** Keeps a daily value only when its snapshot belongs to the device's current local day. */
    static int valueForDay(String storedDay, String localDay, int value) {
        return isCurrentDay(storedDay, localDay) ? value : 0;
    }

    private static String formatDay(Date date) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(date);
    }
}
