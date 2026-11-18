package com.athar.adhkar.wear;

import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.WearableListenerService;

/** New prayer times from the phone, received even when the watch app is closed. */
public class PhoneDataService extends WearableListenerService {
    @Override
    public void onDataChanged(DataEventBuffer events) {
        for (DataEvent event : events) {
            if (event.getType() != DataEvent.TYPE_CHANGED) continue;
            if (!TasbeehActivity.PRAYER_PATH.equals(event.getDataItem().getUri().getPath())) continue;
            String json = DataMapItem.fromDataItem(event.getDataItem()).getDataMap().getString("json");
            if (json != null) PrayerStore.save(this, json);
        }
    }
}
