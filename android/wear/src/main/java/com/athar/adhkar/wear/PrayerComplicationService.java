package com.athar.adhkar.wear;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.wear.watchface.complications.data.ComplicationData;
import androidx.wear.watchface.complications.data.ComplicationType;
import androidx.wear.watchface.complications.data.LongTextComplicationData;
import androidx.wear.watchface.complications.data.PlainComplicationText;
import androidx.wear.watchface.complications.data.ShortTextComplicationData;
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService;
import androidx.wear.watchface.complications.datasource.ComplicationRequest;

/**
 * The next prayer on the watch face: short («العصر ٣:١٥») or long
 * («العصر · ٣:١٥»). The watch asks again every ten minutes (manifest), so it
 * moves on after each adhan.
 */
public class PrayerComplicationService extends ComplicationDataSourceService {

    private static PlainComplicationText plain(String text) {
        return new PlainComplicationText.Builder(text).build();
    }

    @Nullable
    private static ComplicationData build(ComplicationType type, @Nullable String[] next) {
        String name = next == null ? "أثر" : next[0];
        String time = next == null ? "--" : next[1];
        if (type == ComplicationType.SHORT_TEXT) {
            return new ShortTextComplicationData.Builder(plain(time), plain("الصلاة القادمة " + name))
                .setTitle(plain(name))
                .build();
        }
        if (type == ComplicationType.LONG_TEXT) {
            return new LongTextComplicationData.Builder(plain(name + " · " + time), plain("الصلاة القادمة " + name))
                .setTitle(plain("الصلاة القادمة"))
                .build();
        }
        return null;
    }

    @Override
    public void onComplicationRequest(@NonNull ComplicationRequest request, @NonNull ComplicationRequestListener listener) {
        try {
            listener.onComplicationData(build(request.getComplicationType(), NextPrayer.find(PrayerStore.load(this))));
        } catch (Exception ignored) {
            // The watch asks again later.
        }
    }

    @Nullable
    @Override
    public ComplicationData getPreviewData(@NonNull ComplicationType type) {
        return build(type, new String[] {"العصر", "٣:١٥"});
    }
}
