package com.athar.adhkar;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Which app store this build belongs to, and how to open its listing.
 *
 * The same source ships to Google Play and to Huawei AppGallery. The one thing
 * that must differ is where "a new version is out" leads: a Huawei phone has no
 * Play Store, so a Play link there is a dead end. The build is told which store
 * it is for (-Pstore=huawei, see app/build.gradle) and reports it here, so the
 * web layer never has to guess from the device — guessing from the manufacturer
 * would be wrong for anyone who sideloaded, or installed Play on a Huawei phone.
 *
 * Opening is done natively with the store's own deep link, which lands on the
 * listing inside the store app. window.open from the WebView is far less
 * reliable for a non-http scheme, and an update prompt that does nothing when
 * tapped is worse than none.
 */
@CapacitorPlugin(name = "StoreInfo")
public class StoreInfoPlugin extends Plugin {

    static String storeName(Context context) {
        try {
            return context.getString(R.string.athar_store);
        } catch (Throwable t) {
            return "play";
        }
    }

    @PluginMethod
    public void get(PluginCall call) {
        JSObject out = new JSObject();
        out.put("store", storeName(getContext()));
        call.resolve(out);
    }

    /**
     * Open this app's listing in the store app, falling back to the https page.
     * `webUrl` is supplied by the caller because the AppGallery page needs the
     * app id assigned when the listing is created, which only the web layer's
     * config knows.
     */
    @PluginMethod
    public void open(PluginCall call) {
        String webUrl = call.getString("webUrl");
        String store = storeName(getContext());
        String pkg = getContext().getPackageName();

        String deepLink = "huawei".equals(store)
            ? "appmarket://details?id=" + pkg
            : "market://details?id=" + pkg;

        if (launch(deepLink)) {
            call.resolve();
            return;
        }
        if (webUrl != null && !webUrl.isEmpty() && launch(webUrl)) {
            call.resolve();
            return;
        }
        call.reject("no handler for the store listing");
    }

    private boolean launch(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            return true;
        } catch (Throwable t) {
            return false;
        }
    }
}
