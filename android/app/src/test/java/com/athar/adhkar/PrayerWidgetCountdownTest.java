package com.athar.adhkar;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

import java.util.Calendar;

public class PrayerWidgetCountdownTest {
    @Test
    public void returnsLiveDelayUntilUpcomingPrayerToday() throws Exception {
        Calendar now = Calendar.getInstance();
        now.set(2026, Calendar.OCTOBER, 3, 8, 15, 0);
        now.set(Calendar.MILLISECOND, 0);

        Calendar target = (Calendar) now.clone();
        target.set(Calendar.HOUR_OF_DAY, 8);
        target.set(Calendar.MINUTE, 16);
        target.set(Calendar.SECOND, 0);
        target.set(Calendar.MILLISECOND, 0);

        assertEquals(60_000L,
            PrayerWidgetCountdown.millisUntilToday("08:16", now.getTimeInMillis()));
        assertEquals(target.getTimeInMillis() - now.getTimeInMillis(),
            PrayerWidgetCountdown.millisUntilToday("08:16", now.getTimeInMillis()));
    }

    @Test
    public void doesNotRollAPassedPrayerIntoTomorrow() throws Exception {
        Calendar now = Calendar.getInstance();
        now.set(2026, Calendar.OCTOBER, 3, 8, 16, 0);
        now.set(Calendar.MILLISECOND, 0);

        assertEquals(0L,
            PrayerWidgetCountdown.millisUntilToday("08:16", now.getTimeInMillis()));
        assertEquals(0L,
            PrayerWidgetCountdown.millisUntilToday("08:15", now.getTimeInMillis()));
    }

    @Test
    public void rejectsMalformedPrayerTimes() throws Exception {
        assertEquals(-1L,
            PrayerWidgetCountdown.millisUntilToday("not-a-time", System.currentTimeMillis()));
        assertEquals(-1L,
            PrayerWidgetCountdown.millisUntilToday("24:00", System.currentTimeMillis()));
    }
}
