package com.athar.adhkar;

import android.content.Context;

import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;

/**
 * Hands the prayer times to Athar on a Wear OS watch (the wear module), where
 * the next prayer shows above the tasbeeh. Phones without Google Play
 * services (Huawei) have no watch link; nothing happens there.
 */
final class WearSync {
    static final String PRAYER_PATH = "/athar/prayer";
    static final String TASBEEH_PATH = "/athar/tasbeeh";
    private static final String PRAYER_KEY = "noor_widget_prayer_v2";

    private WearSync() {}

    static void sendPrayer(Context context) {
        try {
            String json = WidgetData.readJson(context, PRAYER_KEY);
            if (json == null) return;
            PutDataMapRequest request = PutDataMapRequest.create(PRAYER_PATH);
            request.getDataMap().putString("json", json);
            PutDataRequest data = request.asPutDataRequest().setUrgent();
            Wearable.getDataClient(context).putDataItem(data);
        } catch (RuntimeException ignored) {
            // No Google Play services, or no watch.
        }
    }
}
