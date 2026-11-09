package com.athar.adhkar;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Calendar;
import java.util.Date;

public class WidgetDayFreshnessTest {
    private static final String TODAY = "2026-11-10";

    @Test
    public void matchingLocalDayKeepsDailyValue() {
        assertTrue(WidgetDayFreshness.isCurrentDay(TODAY, TODAY));
        assertEquals(7, WidgetDayFreshness.valueForDay(TODAY, TODAY, 7));
    }

    @Test
    public void staleOrMissingDayHidesDailyValue() {
        assertFalse(WidgetDayFreshness.isCurrentDay("2026-11-09", TODAY));
        assertEquals(0, WidgetDayFreshness.valueForDay("2026-11-09", TODAY, 7));
        assertFalse(WidgetDayFreshness.isCurrentDay(null, TODAY));
        assertEquals(0, WidgetDayFreshness.valueForDay(null, TODAY, 7));
    }

    @Test
    public void ibadahDayChangesAtFajrWithoutRefreshingTheWidgetPayload() {
        String beforeFajr = WidgetDayFreshness.currentIbadahDayKey(localDate(4, 59), "05:00");
        String afterFajr = WidgetDayFreshness.currentIbadahDayKey(localDate(5, 0), "05:00");

        assertEquals("2026-11-09", beforeFajr);
        assertEquals(TODAY, afterFajr);
        assertEquals(0, WidgetDayFreshness.valueForDay(beforeFajr, afterFajr, 7));
    }

    private static Date localDate(int hour, int minute) {
        Calendar calendar = Calendar.getInstance();
        calendar.clear();
        calendar.set(2026, Calendar.NOVEMBER, 10, hour, minute, 0);
        return calendar.getTime();
    }
}
