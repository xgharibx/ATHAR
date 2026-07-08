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

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 11C: Install AndroidX SplashScreen compat — required for Android 12+ splash
        //      to transition correctly (prevents black flash and respects postSplashScreenTheme)
        SplashScreen.installSplashScreen(this);
        registerPlugin(WidgetRefreshPlugin.class);
        super.onCreate(savedInstanceState);

        pendingRoute = readRoute(getIntent());

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
        pendingRoute = readRoute(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        injectPendingRoute();
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

    /**
     * Navigate the SPA to the widget-requested route once React has mounted.
     * Retries briefly on cold start until the app shell is on screen.
     */
    private void injectPendingRoute() {
        final String route = pendingRoute;
        if (route == null) return;
        pendingRoute = null;

        final Handler handler = new Handler(Looper.getMainLooper());
        final int[] attempts = {0};

        Runnable attempt = new Runnable() {
            @Override
            public void run() {
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
