package com.athar.adhkar;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** Route requested by a widget tap, injected once the web app is ready. */
    private String pendingRoute;
    /** Invalidates retries queued for an older widget tap. */
    private long routeDeliveryGeneration;

    /** OAuth callback URL (app.athar://auth?...) captured from the intent that
     *  brought us back from the system browser, handed to JS once it's ready. */
    private String pendingAuthUrl;

    /** Skip the cold-start onResume; React's initial effects already sync schedules. */
    private boolean hasResumed;
    private boolean authDeliveryInProgress;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 11C: Install AndroidX SplashScreen compat — required for Android 12+ splash
        //      to transition correctly (prevents black flash and respects postSplashScreenTheme)
        SplashScreen.installSplashScreen(this);
        registerPlugin(WidgetRefreshPlugin.class);
        registerPlugin(AuthBridgePlugin.class);
        registerPlugin(ShareBridgePlugin.class);
        registerPlugin(QuietChannelPlugin.class);
        super.onCreate(savedInstanceState);

        // Ask once a day, in the background, whether a newer version has been
        // published — the people who need telling are the ones not opening the
        // app, so an in-app check alone never reaches them.
        UpdateCheckWorker.schedule(this);

        pendingRoute = readRoute(getIntent());
        pendingAuthUrl = readAuthUrl(getIntent());

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleAtharBackPressed();
            }
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWidgetRoute(intent);
        String authUrl = readAuthUrl(intent);
        if (authUrl != null) {
            pendingAuthUrl = authUrl;
            // Warm start: the WebView already exists, so hand it over now.
            deliverPendingAuthUrl();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        injectPendingRoute();
        deliverPendingAuthUrl();
        if (hasResumed) dispatchReminderScheduleResume();
        hasResumed = true;
    }

    /**
     * Android does not include Capacitor's App plugin in this build. Notify the
     * web layer on each warm resume so it can re-check OS permissions and rebuild
     * enabled reminder schedules without requesting permission in the background.
     */
    private void dispatchReminderScheduleResume() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;
        webView.evaluateJavascript(
            "window.dispatchEvent(new Event('athar-app-resume'))",
            null
        );
    }

    /** The OAuth callback, or null for any other intent. */
    private static String readAuthUrl(Intent intent) {
        if (intent == null) return null;
        android.net.Uri data = intent.getData();
        if (data == null) return null;
        String path = data.getPath();
        if (!"app.athar".equals(data.getScheme()) || !"auth".equals(data.getHost())
                || data.getPort() != -1 || data.getUserInfo() != null
                || (path != null && !path.isEmpty() && !"/".equals(path))) return null;
        return data.toString();
    }

    /**
     * Hand the OAuth callback to the web layer as a DOM event. Retries briefly
     * because on a cold start the browser can return before React has mounted;
     * without that the user would sign in successfully and land back signed out.
     */
    private void deliverPendingAuthUrl() {
        final String url = pendingAuthUrl;
        if (url == null || authDeliveryInProgress) return;
        authDeliveryInProgress = true;

        final Handler handler = new Handler(Looper.getMainLooper());
        final int[] attempts = {0};
        final String quotedUrl = org.json.JSONObject.quote(url);

        Runnable attempt = new Runnable() {
            @Override
            public void run() {
                if (!url.equals(pendingAuthUrl)) {
                    authDeliveryInProgress = false;
                    deliverPendingAuthUrl();
                    return;
                }
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) {
                    if (attempts[0]++ < 25) handler.postDelayed(this, 400);
                    else authDeliveryInProgress = false;
                    return;
                }
                webView.evaluateJavascript(
                    "(function(){" +
                        "if(!window.__atharAuthCallbackReady){" +
                            "window.__atharPendingAuthUrl=" + quotedUrl + ";return 'wait';}" +
                        "delete window.__atharPendingAuthUrl;" +
                        "window.dispatchEvent(new CustomEvent('athar-auth-callback',{detail:{url:" + quotedUrl + "}}));" +
                        "return 'ok';" +
                    "})()",
                    value -> {
                        if ("\"ok\"".equals(value)) {
                            if (url.equals(pendingAuthUrl)) pendingAuthUrl = null;
                            authDeliveryInProgress = false;
                            deliverPendingAuthUrl();
                        } else if (attempts[0]++ < 25) {
                            handler.postDelayed(this, 400);
                        } else authDeliveryInProgress = false;
                    }
                );
            }
        };
        handler.post(attempt);
    }

    @Override
    public void onPause() {
        super.onPause();
        // The user is likely heading to the home screen — make sure every
        // widget repaints with the freshest data the web app just synced.
        WidgetUpdater.updateAll(this);
    }

    private static String readRoute(Intent intent) {
        if (intent == null) return null;
        String route = intent.getStringExtra(AtharWidgetProvider.EXTRA_ROUTE);
        // Only accept simple absolute in-app paths (defense in depth — the
        // extra is only ever set by our own widgets).
        if (route != null && route.matches("/[a-zA-Z0-9/_-]*")) return route;
        return null;
    }

    /** Capture and deliver a widget route immediately when a warm intent arrives. */
    void handleWidgetRoute(Intent intent) {
        routeDeliveryGeneration++;
        pendingRoute = readRoute(intent);
        injectPendingRoute();
    }

    /**
     * Navigate the SPA to the widget-requested route once React has mounted.
     * Retries briefly on cold start until the app shell is on screen.
     */
    private void injectPendingRoute() {
        final String route = pendingRoute;
        if (route == null) return;
        pendingRoute = null;
        final long generation = routeDeliveryGeneration;

        final Handler handler = new Handler(Looper.getMainLooper());
        final int[] attempts = {0};

        Runnable attempt = new Runnable() {
            @Override
            public void run() {
                if (generation != routeDeliveryGeneration) return;
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) {
                    if (attempts[0]++ < 20) handler.postDelayed(this, 400);
                    return;
                }
                webView.evaluateJavascript(
                    "(function(){" +
                        "var r=document.querySelector('#root');" +
                        "if(!r||!r.firstChild){return 'wait';}" +
                        "if(location.pathname==='" + route + "'){return 'ok';}" +
                        "history.pushState({},'','" + route + "');" +
                        "window.dispatchEvent(new PopStateEvent('popstate'));" +
                        "return 'ok';" +
                    "})()",
                    value -> {
                        if (generation != routeDeliveryGeneration) return;
                        if (!"\"ok\"".equals(value) && attempts[0]++ < 20) {
                            handler.postDelayed(this, 400);
                        }
                    }
                );
            }
        };
        handler.post(attempt);
    }

    private void handleAtharBackPressed() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) {
            moveTaskToBack(true);
            return;
        }

        webView.evaluateJavascript(
            "(function(){" +
                "var path=location.pathname||'/';" +
                "var search=location.search||'';" +
                "var hash=location.hash||'';" +
                "if(path==='/'&&!search&&!hash){return 'root';}" +
                "if(history.length>1){history.back();return 'back';}" +
                "history.replaceState({},'', '/');" +
                "window.dispatchEvent(new PopStateEvent('popstate'));" +
                "return 'home';" +
            "})()",
            value -> {
                if ("\"root\"".equals(value)) {
                    moveTaskToBack(true);
                }
            }
        );
    }
}
