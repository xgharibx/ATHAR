package com.athar.adhkar;

import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;

/**
 * Counts made on the watch join the phone's tasbeeh statistics, through the
 * same per-day ledger the home-screen tasbeeh widget keeps
 * (noor_widget_tasbeeh_totals_v1, merged by src/lib/tasbeehWidgetSync.ts).
 *
 * Message from the watch: { "YYYY-MM-DD|phrase": count, ... }.
 */
public class WearTasbeehService extends WearableListenerService {
    @Override
    public void onMessageReceived(MessageEvent event) {
        if (!WearSync.TASBEEH_PATH.equals(event.getPath())) return;
        try {
            JSONObject counts = new JSONObject(new String(event.getData(), StandardCharsets.UTF_8));
            JSONArray keys = counts.names();
            for (int i = 0; keys != null && i < keys.length(); i++) {
                String key = keys.getString(i);
                int bar = key.indexOf('|');
                if (bar != 10) continue;
                String day = key.substring(0, bar);
                String phrase = key.substring(bar + 1);
                int n = Math.max(0, Math.min(10_000, counts.optInt(key, 0)));
                for (int j = 0; j < n; j++) NoorTasbeehWidgetProvider.bumpDailyTotal(this, phrase, day);
            }
        } catch (Exception ignored) {
            // A malformed message is dropped.
        }
    }
}
