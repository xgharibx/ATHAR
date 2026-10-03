package com.athar.adhkar;

import java.util.Calendar;

/** Clock calculations shared by the prayer widget countdowns. */
final class PrayerWidgetCountdown {
    private PrayerWidgetCountdown() {}

    /**
     * Returns the milliseconds until a prayer time later today, 0 when it has
     * arrived or passed, and -1 when the time is invalid. It deliberately
     * does not roll a passed prayer into tomorrow: callers first select the
     * next prayer from today's schedule.
     */
    static long millisUntilToday(String time24, long nowMillis) {
        if (time24 == null) return -1;
        try {
            String[] parts = time24.split(":", -1);
            if (parts.length != 2) return -1;
            int hour = Integer.parseInt(parts[0].trim());
            int minute = Integer.parseInt(parts[1].trim());
            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return -1;

            Calendar now = Calendar.getInstance();
            now.setTimeInMillis(nowMillis);
            Calendar target = (Calendar) now.clone();
            target.set(Calendar.HOUR_OF_DAY, hour);
            target.set(Calendar.MINUTE, minute);
            target.set(Calendar.SECOND, 0);
            target.set(Calendar.MILLISECOND, 0);
            long targetMillis = target.getTimeInMillis();
            return targetMillis > nowMillis ? targetMillis - nowMillis : 0;
        } catch (RuntimeException exception) {
            return -1;
        }
    }
}
