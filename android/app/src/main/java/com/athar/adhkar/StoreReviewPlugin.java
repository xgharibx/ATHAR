package com.athar.adhkar;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

/**
 * Google Play's own in-app rating sheet. Google decides whether it actually
 * appears (it enforces its own quota), and never says whether it did.
 * Builds for Huawei AppGallery skip it: those phones have no Play Store.
 *
 * JS side: registerPlugin("StoreReview").request() → { requested }
 */
@CapacitorPlugin(name = "StoreReview")
public class StoreReviewPlugin extends Plugin {

    @PluginMethod
    public void request(PluginCall call) {
        JSObject result = new JSObject();
        Activity activity = getActivity();
        if (!"play".equals(StoreInfoPlugin.storeName(getContext())) || activity == null) {
            result.put("requested", false);
            call.resolve(result);
            return;
        }
        ReviewManager manager = ReviewManagerFactory.create(getContext());
        manager.requestReviewFlow().addOnCompleteListener((request) -> {
            if (!request.isSuccessful()) {
                result.put("requested", false);
                call.resolve(result);
                return;
            }
            ReviewInfo info = request.getResult();
            manager.launchReviewFlow(activity, info).addOnCompleteListener((flow) -> {
                result.put("requested", true);
                call.resolve(result);
            });
        });
    }
}
