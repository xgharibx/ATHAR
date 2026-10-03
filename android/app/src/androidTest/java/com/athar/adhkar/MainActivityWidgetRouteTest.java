package com.athar.adhkar;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.webkit.WebView;

import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

public class MainActivityWidgetRouteTest {
    private static final String ROUTE = "/settings";
    private static final String OLDER_ROUTE = "/quran";

    @Test
    public void coldStartWidgetRouteIsDeliveredAfterWebAppMounts() throws Exception {
        MainActivity activity = launchWithRoute(ROUTE);
        try {
            waitForPath(activity, ROUTE);
        } finally {
            finish(activity);
        }
    }

    @Test
    public void warmWidgetRouteIsDeliveredWithoutAnotherResume() throws Exception {
        MainActivity activity = launchWithRoute(null);
        try {
            waitForReady(activity);
            assertEquals("\"/\"", evaluate(activity, "location.pathname"));
            AtomicInteger resumeCount = new AtomicInteger();
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
                activity.getLifecycle().addObserver(new DefaultLifecycleObserver() {
                    @Override
                    public void onResume(LifecycleOwner owner) {
                        resumeCount.incrementAndGet();
                    }
                }));
            int resumesBeforeWidgetTap = resumeCount.get();

            // Exercise the actual callback while MainActivity stays resumed.
            Intent widgetIntent = widgetIntent(activity, ROUTE);
            InstrumentationRegistry.getInstrumentation().runOnMainSync(
                () -> activity.onNewIntent(widgetIntent));

            waitForPath(activity, ROUTE);
            assertEquals("Widget intent unexpectedly resumed MainActivity",
                resumesBeforeWidgetTap, resumeCount.get());
        } finally {
            finish(activity);
        }
    }

    @Test
    public void newestWarmWidgetRouteWinsWhileWebAppIsMounting() throws Exception {
        MainActivity activity = launchWithRoute(null);
        try {
            Intent olderIntent = widgetIntent(activity, OLDER_ROUTE);
            Intent newerIntent = widgetIntent(activity, ROUTE);
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
                activity.onNewIntent(olderIntent);
                activity.onNewIntent(newerIntent);
            });

            waitForPath(activity, ROUTE);
            SystemClock.sleep(600);
            assertEquals("An older retry overwrote the newer widget route",
                "\"" + ROUTE + "\"", evaluate(activity, "location.pathname"));
        } finally {
            finish(activity);
        }
    }

    @Test
    public void androidWidgetIntentUpdatesTheExistingSingleTaskActivity() throws Exception {
        MainActivity activity = launchWithRoute(null);
        try {
            waitForReady(activity);
            Intent intent = widgetIntent(activity, ROUTE)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .setAction("com.athar.adhkar.OPEN_" + ROUTE.hashCode());
            InstrumentationRegistry.getInstrumentation().runOnMainSync(
                () -> activity.startActivity(intent));

            waitForPath(activity, ROUTE);
            assertEquals("Android did not deliver the widget intent to this activity",
                ROUTE, activity.getIntent().getStringExtra(AtharWidgetProvider.EXTRA_ROUTE));
        } finally {
            finish(activity);
        }
    }

    private static Intent widgetIntent(MainActivity activity, String route) {
        return new Intent(activity, MainActivity.class)
            .putExtra(AtharWidgetProvider.EXTRA_ROUTE, route);
    }

    private static MainActivity launchWithRoute(String route) throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Intent intent = new Intent(context, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (route != null) intent.putExtra(AtharWidgetProvider.EXTRA_ROUTE, route);
        Activity activity = InstrumentationRegistry.getInstrumentation().startActivitySync(intent);
        assertTrue("MainActivity did not launch", activity instanceof MainActivity);
        return (MainActivity) activity;
    }

    private static void waitForReady(MainActivity activity) throws Exception {
        waitForJavaScriptResult(activity,
            "(function(){var r=document.querySelector('#root');return r&&r.firstChild?'ready':'wait';})()",
            "\"ready\"");
    }

    private static void waitForPath(MainActivity activity, String expectedPath) throws Exception {
        waitForJavaScriptResult(activity, "location.pathname", "\"" + expectedPath + "\"");
    }

    private static void waitForJavaScriptResult(
            MainActivity activity, String expression, String expected) throws Exception {
        long deadline = SystemClock.uptimeMillis() + TimeUnit.SECONDS.toMillis(12);
        String result = null;
        do {
            result = evaluate(activity, expression);
            if (expected.equals(result)) return;
            SystemClock.sleep(100);
        } while (SystemClock.uptimeMillis() < deadline);
        assertEquals("Timed out waiting for WebView JavaScript result", expected, result);
    }

    private static String evaluate(MainActivity activity, String expression) throws Exception {
        CountDownLatch evaluated = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            WebView webView = activity.getBridge() != null ? activity.getBridge().getWebView() : null;
            assertTrue("Capacitor WebView is unavailable", webView != null);
            webView.evaluateJavascript(expression, value -> {
                result.set(value);
                evaluated.countDown();
            });
        });
        assertTrue("WebView evaluation timed out", evaluated.await(3, TimeUnit.SECONDS));
        return result.get();
    }

    private static void finish(MainActivity activity) {
        InstrumentationRegistry.getInstrumentation().runOnMainSync(activity::finishAndRemoveTask);
    }
}
