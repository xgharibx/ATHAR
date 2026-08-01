package com.athar.adhkar;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opens a URL in the SYSTEM browser, for the Google sign-in round-trip.
 *
 * Google refuses to render its OAuth consent screen inside an app WebView
 * ("disallowed_useragent"), so sign-in has to leave the app and come back via
 * the app.athar://auth scheme (see MainActivity + AndroidManifest).
 *
 * This exists instead of @capacitor/browser because that plugin (and
 * @capacitor/app) still ship `getDefaultProguardFile('proguard-android.txt')`
 * in their build.gradle, which current Android Gradle Plugin versions reject
 * outright — it fails the whole build. Patching node_modules would not survive
 * an npm install, so the few lines we actually need live here instead, next to
 * the existing WidgetRefresh plugin.
 *
 * JS side: registerPlugin("AuthBridge").openExternal({ url })
 */
@CapacitorPlugin(name = "AuthBridge")
public class AuthBridgePlugin extends Plugin {

    @PluginMethod
    public void openExternal(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.trim().isEmpty()) {
            call.reject("missing url");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            // Launched from a plugin context rather than an Activity stack we
            // own, so this flag is required or the launch throws.
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Throwable t) {
            call.reject("could not open browser");
        }
    }
}
