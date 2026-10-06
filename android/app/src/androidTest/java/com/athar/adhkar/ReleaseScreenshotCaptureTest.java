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
        String readyText = args.getString("screenshotReadyText");
        boolean waitForMainContent = args.getBoolean("screenshotWaitForMainContent", false);
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
            String readyTextCheck = readyText == null ? "" : "&&document.body.innerText.includes("
                + org.json.JSONObject.quote(readyText) + ")";
            String mainContentCheck = waitForMainContent
                ? "&&!document.querySelector('#main-content [role=status][aria-label^=\"جارٍ التحميل\"]')"
                : "";
            do {
                ready = evaluate(activity, "location.pathname===" + org.json.JSONObject.quote(route)
                    + "&&!!document.querySelector('#root')?.firstChild"
                    + readyTextCheck + mainContentCheck);
                if ("true".equals(ready)) break;
                SystemClock.sleep(250);
            } while (SystemClock.uptimeMillis() < deadline);
            assertTrue("App screen did not become ready: " + ready, "true".equals(ready));

            // Release captures should show the real app, not the first-run welcome overlay.
            String onboarding = "";
            boolean onboardingDismissed = false;
            for (int attempt = 0; attempt < 4; attempt++) {
                onboarding = evaluate(activity,
                    "(function(){var dialog=document.querySelector('.onboarding-overlay');"
                        + "if(!dialog)return 'none';"
                        + "var button=Array.from(dialog.querySelectorAll('button'))"
                        + ".find(function(candidate){return candidate.textContent.trim()==='تخطي';});"
                        + "if(!button)return 'missing-skip';button.click();return 'dismissed';})()");
                SystemClock.sleep(300);
                String overlayVisible = evaluate(activity,
                    "!!document.querySelector('.onboarding-overlay')");
                if ("false".equals(overlayVisible)) {
                    onboardingDismissed = true;
                    break;
                }
                if ("\"missing-skip\"".equals(onboarding)) break;
            }
            assertTrue("Could not dismiss first-run onboarding: " + onboarding,
                onboardingDismissed);
            SystemClock.sleep(500);

            String scrollSelector = args.getString("screenshotScrollSelector");
            String clickSelector = args.getString("screenshotClickSelector");
            String clickText = args.getString("screenshotClickText");
            String readyTextAfterActions = args.getString("screenshotReadyTextAfterActions");
            int clickCount = Math.max(1, Math.min(20, args.getInt("screenshotClickCount", 1)));
            if (scrollSelector != null || clickSelector != null || clickText != null
                || readyTextAfterActions != null) {
                String scrollArg = org.json.JSONObject.quote(scrollSelector == null ? "" : scrollSelector);
                String clickArg = org.json.JSONObject.quote(clickSelector == null ? "" : clickSelector);
                if (scrollSelector != null) {
                    String scrollScript = "__bottom__".equals(scrollSelector)
                        ? "(function(){var root=document.scrollingElement||document.documentElement;"
                            + "root.scrollTop=root.scrollHeight;window.scrollTo(0,root.scrollHeight);return 'scrolled';})()"
                        : "(function(){var target=document.querySelector(" + scrollArg + ");"
                            + "if(!target)return 'missing-scroll';"
                            + "target.scrollIntoView({block:'start',behavior:'auto'});"
                            + "var top=Math.max(0,window.scrollY+target.getBoundingClientRect().top-100);"
                            + "window.scrollTo(0,top);var root=document.scrollingElement||document.documentElement;"
                            + "root.scrollTop=top;return 'scrolled:'+Math.round(window.scrollY)+':'"
                            + "+Math.round(target.getBoundingClientRect().top);})()";
                    String scrolled = evaluate(activity, scrollScript);
                    assertTrue("Could not scroll screenshot content: " + scrolled,
                        scrolled != null && scrolled.startsWith("\"scrolled"));
                    SystemClock.sleep(500);
                }
                if (clickSelector != null) {
                    for (int click = 0; click < clickCount; click++) {
                        String clicked = evaluate(activity,
                            "(function(){var button=document.querySelector(" + clickArg + ");"
                                + "if(!button)return 'missing-click';button.click();return 'clicked';})()");
                        assertTrue("Could not reveal screenshot content: " + clicked,
                            "\"clicked\"".equals(clicked));
                        if (clickCount > 1) SystemClock.sleep(120);
                    }
                }
                if (scrollSelector != null && !"__bottom__".equals(scrollSelector)) {
                    evaluate(activity,
                        "(function(){var target=document.querySelector(" + scrollArg + ");"
                            + "if(!target)return 'missing-scroll';target.scrollIntoView({block:'start',behavior:'auto'});"
                            + "var top=Math.max(0,window.scrollY+target.getBoundingClientRect().top-100);"
                            + "window.scrollTo(0,top);var root=document.scrollingElement||document.documentElement;"
                            + "root.scrollTop=top;return 'scrolled';})()");
                    SystemClock.sleep(300);
                }
                if (clickText != null) {
                    String clickTextArg = org.json.JSONObject.quote(clickText);
                    String clicked = evaluate(activity,
                        "(function(){var button=Array.from(document.querySelectorAll('button'))"
                            + ".find(function(candidate){return candidate.textContent.includes("
                            + clickTextArg + ");});if(!button)return 'missing-click';button.click();return 'clicked';})()");
                    assertTrue("Could not reveal screenshot content: " + clicked,
                        "\"clicked\"".equals(clicked));
                }
                if (readyTextAfterActions != null) {
                    String expected = org.json.JSONObject.quote(readyTextAfterActions);
                    long actionDeadline = SystemClock.uptimeMillis() + TimeUnit.SECONDS.toMillis(25);
                    String readyAfterActions = "false";
                    do {
                        readyAfterActions = evaluate(activity,
                            "document.body.innerText.includes(" + expected + ")");
                        if ("true".equals(readyAfterActions)) break;
                        SystemClock.sleep(250);
                    } while (SystemClock.uptimeMillis() < actionDeadline);
                    assertTrue("Screenshot state did not become ready: " + readyTextAfterActions,
                        "true".equals(readyAfterActions));
                }
                SystemClock.sleep(900);
            }
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
        assertTrue("WebView evaluation timed out", evaluated.await(15, TimeUnit.SECONDS));
        return result.get();
    }
}
