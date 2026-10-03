package com.athar.adhkar;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import android.content.Context;
import android.os.SystemClock;
import android.view.View;
import android.widget.Chronometer;
import android.widget.FrameLayout;
import android.widget.RemoteViews;
import android.widget.TextView;

import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;

import java.util.Calendar;
import java.util.concurrent.atomic.AtomicReference;

public class PrayerFullWidgetCountdownViewTest {
    @Test
    public void upcomingPrayerUsesLiveChronometerOnSupportedAndroid() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Calendar now = fixedTime(8, 15);
        long elapsedNow = SystemClock.elapsedRealtime();

        View root = renderCountdown(context, "08:16", now.getTimeInMillis(), elapsedNow, 24);
        Chronometer countdown = root.findViewById(R.id.prayer_full_countdown);
        TextView fallback = root.findViewById(R.id.prayer_full_countdown_static);

        assertNotNull(countdown);
        assertNotNull(fallback);
        assertEquals(View.VISIBLE, countdown.getVisibility());
        assertEquals(View.GONE, fallback.getVisibility());
        assertEquals(elapsedNow + 60_000L, countdown.getBase());
    }

    @Test
    public void olderAndroidUsesStaticArabicFallback() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Calendar now = fixedTime(8, 15);
        String fallbackText = "بعد دقيقة";

        View root = renderCountdown(context, "08:16", now.getTimeInMillis(),
            SystemClock.elapsedRealtime(), 23, fallbackText);
        Chronometer countdown = root.findViewById(R.id.prayer_full_countdown);
        TextView fallback = root.findViewById(R.id.prayer_full_countdown_static);

        assertNotNull(countdown);
        assertNotNull(fallback);
        assertEquals(View.GONE, countdown.getVisibility());
        assertEquals(View.VISIBLE, fallback.getVisibility());
        assertEquals(fallbackText, fallback.getText().toString());
    }

    private static View renderCountdown(Context context, String time24, long nowMillis,
            long elapsedNow, int sdkInt) throws Exception {
        return renderCountdown(context, time24, nowMillis, elapsedNow, sdkInt, "بعد 1 دقيقة");
    }

    private static View renderCountdown(Context context, String time24, long nowMillis,
            long elapsedNow, int sdkInt, String fallbackText) throws Exception {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_prayer_full);
        NoorPrayerFullWidgetProvider.applyCountdown(
            views, time24, fallbackText, nowMillis, elapsedNow, sdkInt);

        AtomicReference<View> result = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
            result.set(views.apply(context, new FrameLayout(context))));
        return result.get();
    }

    private static Calendar fixedTime(int hour, int minute) {
        Calendar value = Calendar.getInstance();
        value.set(2026, Calendar.OCTOBER, 3, hour, minute, 0);
        value.set(Calendar.MILLISECOND, 0);
        return value;
    }
}
