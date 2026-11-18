package com.athar.adhkar;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsIntent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Web pages opened inside Athar (src/lib/inAppBrowser.ts): a Custom Tab of
 * the phone's own browser, with its sign-ins and a close button back to the
 * app, instead of leaving for the browser. A phone whose browser has no
 * Custom Tabs gets the browser as before.
 *
 * JS side: registerPlugin("InAppBrowser").open({ url, color })
 */
@CapacitorPlugin(name = "InAppBrowser")
public class InAppBrowserPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        String raw = call.getString("url", "");
        Uri uri = raw == null ? null : Uri.parse(raw);
        String scheme = uri == null || uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(java.util.Locale.ROOT);
        if (!"https".equals(scheme) && !"http".equals(scheme)) {
            call.reject("a web address is required");
            return;
        }
        Context context = getActivity() != null ? getActivity() : getContext();
        CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder()
            .setShowTitle(true)
            .setUrlBarHidingEnabled(true)
            .setShareState(CustomTabsIntent.SHARE_STATE_ON);
        Integer color = parseColor(call.getString("color"));
        if (color != null) {
            builder.setDefaultColorSchemeParams(new CustomTabColorSchemeParams.Builder().setToolbarColor(color).build());
        }
        CustomTabsIntent tab = builder.build();
        if (getActivity() == null) tab.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            tab.launchUrl(context, uri);
            call.resolve();
        } catch (ActivityNotFoundException noTabs) {
            try {
                Intent view = new Intent(Intent.ACTION_VIEW, uri);
                if (getActivity() == null) view.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(view);
                call.resolve();
            } catch (ActivityNotFoundException noBrowser) {
                call.reject("no browser");
            }
        }
    }

    private static Integer parseColor(String value) {
        if (value == null || !value.matches("#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})")) return null;
        String hex = value.length() == 4
            ? "#" + value.charAt(1) + value.charAt(1) + value.charAt(2) + value.charAt(2) + value.charAt(3) + value.charAt(3)
            : value;
        try {
            return Color.parseColor(hex);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
