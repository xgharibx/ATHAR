package com.athar.adhkar;

import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebView;

import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Assume;
import org.junit.Test;

import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Opt-in capture of the real app; does not change saved app data or production UI. */
public class ReleaseScreenshotCaptureTest {
    @Test
    public void captureRealScreenWithoutSystemBars() throws Exception {
        Bundle args = InstrumentationRegistry.getArguments();
        String output = args.getString("screenshotName");
        Assume.assumeTrue("Run only when a screenshot is explicitly requested", output != null);
        assertTrue("Invalid screenshot filename", output.matches("[a-z0-9_-]+\\.png"));
        Assume.assumeTrue(Build.VERSION.SDK_INT >= 30);
        String route = args.getString("screenshotRoute", "/");
        assertTrue("Invalid route", route.matches("/[a-zA-Z0-9/_-]*"));
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Intent intent = new Intent(context, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra(AtharWidgetProvider.EXTRA_ROUTE, route);
        Activity launched = InstrumentationRegistry.getInstrumentation().startActivitySync(intent);
        assertTrue(launched instanceof MainActivity);
        MainActivity activity = (MainActivity) launched;
        try {
            long deadline = SystemClock.uptimeMillis() + TimeUnit.SECONDS.toMillis(90);
            String ready = "";
            do {
                ready = evaluate(activity, "location.pathname===" + org.json.JSONObject.quote(route)
                    + "&&!!document.querySelector('main')&&document.fonts.status==='loaded'");
                if ("true".equals(ready)) break;
                SystemClock.sleep(250);
            } while (SystemClock.uptimeMillis() < deadline);
            assertTrue("App screen did not become ready: " + ready, "true".equals(ready));
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
                WindowInsetsController controller = activity.getWindow().getInsetsController();
                assertTrue(controller != null);
                controller.hide(WindowInsets.Type.systemBars());
            });
            SystemClock.sleep(1500);
            AtomicReference<Boolean> barsVisible = new AtomicReference<>(true);
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
                barsVisible.set(activity.getWindow().getDecorView().getRootWindowInsets()
                    .isVisible(WindowInsets.Type.systemBars())));
            assertTrue("System bars are still visible", !barsVisible.get());
            Bitmap screenshot = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
            assertTrue("Screenshot unavailable", screenshot != null);
            File directory = new File(context.getExternalFilesDir(null), "release-screenshots");
            assertTrue(directory.isDirectory() || directory.mkdirs());
            try (FileOutputStream stream = new FileOutputStream(new File(directory, output))) {
                assertTrue(screenshot.compress(Bitmap.CompressFormat.PNG, 100, stream));
            } finally {
                screenshot.recycle();
            }
        } finally {
            InstrumentationRegistry.getInstrumentation().runOnMainSync(activity::finishAndRemoveTask);
        }
    }

    private static String evaluate(MainActivity activity, String expression) throws Exception {
        CountDownLatch evaluated = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            WebView webView = activity.getBridge().getWebView();
            webView.evaluateJavascript(expression, value -> {
                result.set(value);
                evaluated.countDown();
            });
        });
        assertTrue("WebView evaluation timed out", evaluated.await(5, TimeUnit.SECONDS));
        return result.get();
    }
}
