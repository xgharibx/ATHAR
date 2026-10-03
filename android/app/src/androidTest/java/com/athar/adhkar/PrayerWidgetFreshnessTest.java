package com.athar.adhkar;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.webkit.WebView;

import androidx.test.platform.app.InstrumentationRegistry;

import org.json.JSONObject;
import org.junit.Test;

import java.util.TimeZone;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

public class PrayerWidgetFreshnessTest {
    private static final String TODAY = "2026-10-03";
    private static final String CAIRO = "Africa/Cairo";

    @Test
    public void acceptsOnlyMatchingDateTimezoneAndOffset() throws Exception {
        JSONObject current = payload(TODAY, CAIRO, 180);
        assertTrue(PrayerWidgetFreshness.isCurrent(current, TODAY, CAIRO, 180));
        assertFalse(PrayerWidgetFreshness.isCurrent(current, "2026-10-04", CAIRO, 180));
        assertFalse(PrayerWidgetFreshness.isCurrent(current, TODAY, "America/New_York", -240));
        assertFalse(PrayerWidgetFreshness.isCurrent(current, TODAY, CAIRO, 120));
    }

    @Test
    public void rejectsLegacyPayloadsWithoutFreshnessMetadata() throws Exception {
        JSONObject legacy = new JSONObject()
            .put("updatedAt", "2026-10-03T12:00:00.000Z")
            .put("prayers", new org.json.JSONArray());

        assertFalse(PrayerWidgetFreshness.isCurrent(legacy, TODAY, CAIRO, 180));
    }

    @Test
    public void webViewAndNativeClockContextUseTheSameTimezoneIdAndOffset() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        CountDownLatch finished = new CountDownLatch(1);
        AtomicReference<JSONObject> webClock = new AtomicReference<>();
        AtomicReference<Exception> failure = new AtomicReference<>();

        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            WebView webView = new WebView(context);
            webView.getSettings().setJavaScriptEnabled(true);
            webView.evaluateJavascript(
                "({timeZoneId:Intl.DateTimeFormat().resolvedOptions().timeZone," +
                    "utcOffsetMinutes:-new Date().getTimezoneOffset()})",
                value -> {
                    try {
                        webClock.set(new JSONObject(value));
                    } catch (Exception exception) {
                        failure.set(exception);
                    } finally {
                        webView.destroy();
                        finished.countDown();
                    }
                });
        });

        assertTrue("WebView timezone probe timed out", finished.await(10, TimeUnit.SECONDS));
        if (failure.get() != null) throw failure.get();
        JSONObject web = webClock.get();
        assertTrue("WebView did not return its timezone", web != null);

        TimeZone nativeZone = TimeZone.getDefault();
        assertEquals(nativeZone.getID(), web.optString("timeZoneId"));
        assertEquals(
            nativeZone.getOffset(System.currentTimeMillis()) / 60000,
            web.optInt("utcOffsetMinutes"));
    }

    private static JSONObject payload(String date, String timeZone, int offset) throws Exception {
        return new JSONObject()
            .put("dateKey", date)
            .put("timeZoneId", timeZone)
            .put("utcOffsetMinutes", offset);
    }
}
