package com.athar.adhkar;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 11C: Install AndroidX SplashScreen compat — required for Android 12+ splash
        //      to transition correctly (prevents black flash and respects postSplashScreenTheme)
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleAtharBackPressed();
            }
        });
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
