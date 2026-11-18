package com.athar.adhkar.wear;

import androidx.annotation.NonNull;
import androidx.concurrent.futures.CallbackToFutureAdapter;
import androidx.wear.protolayout.ActionBuilders;
import androidx.wear.protolayout.ColorBuilders;
import androidx.wear.protolayout.DimensionBuilders;
import androidx.wear.protolayout.LayoutElementBuilders;
import androidx.wear.protolayout.ModifiersBuilders;
import androidx.wear.protolayout.ResourceBuilders;
import androidx.wear.protolayout.TimelineBuilders;
import androidx.wear.tiles.RequestBuilders;
import androidx.wear.tiles.TileBuilders;
import androidx.wear.tiles.TileService;

import com.google.common.util.concurrent.ListenableFuture;

/**
 * A tile with the next prayer and its time: swipe from the watch face to see
 * it, tap to open the tasbeeh. Redrawn when the phone sends new times and
 * every ten minutes, so it moves on after each adhan.
 */
public class PrayerTileService extends TileService {
    private static final String RESOURCES_VERSION = "1";
    private static final long REFRESH_MS = 10 * 60 * 1000L;

    private static LayoutElementBuilders.Text text(String value, float size, int color) {
        return new LayoutElementBuilders.Text.Builder()
            .setText(value)
            .setFontStyle(new LayoutElementBuilders.FontStyle.Builder()
                .setSize(DimensionBuilders.sp(size))
                .setColor(ColorBuilders.argb(color))
                .build())
            .build();
    }

    @NonNull
    @Override
    protected ListenableFuture<TileBuilders.Tile> onTileRequest(@NonNull RequestBuilders.TileRequest request) {
        String[] next = NextPrayer.find(PrayerStore.load(this));
        LayoutElementBuilders.Column.Builder column = new LayoutElementBuilders.Column.Builder()
            .addContent(text("الصلاة القادمة", 13, 0xB3FFFFFF));
        if (next != null) {
            column.addContent(text(next[0], 24, 0xFFE2BD6B));
            column.addContent(text(next[1], 30, 0xFFFFFFFF));
        } else {
            column.addContent(text("افتح أثر على الهاتف", 14, 0xFFFFFFFF));
        }
        ModifiersBuilders.Clickable open = new ModifiersBuilders.Clickable.Builder()
            .setId("open")
            .setOnClick(new ActionBuilders.LaunchAction.Builder()
                .setAndroidActivity(new ActionBuilders.AndroidActivity.Builder()
                    .setPackageName(getPackageName())
                    .setClassName(TasbeehActivity.class.getName())
                    .build())
                .build())
            .build();
        LayoutElementBuilders.Box root = new LayoutElementBuilders.Box.Builder()
            .setModifiers(new ModifiersBuilders.Modifiers.Builder().setClickable(open).build())
            .addContent(column.build())
            .build();
        TileBuilders.Tile tile = new TileBuilders.Tile.Builder()
            .setResourcesVersion(RESOURCES_VERSION)
            .setFreshnessIntervalMillis(REFRESH_MS)
            .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(root))
            .build();
        return CallbackToFutureAdapter.getFuture(completer -> completer.set(tile));
    }

    @NonNull
    @Override
    protected ListenableFuture<ResourceBuilders.Resources> onTileResourcesRequest(@NonNull RequestBuilders.ResourcesRequest request) {
        ResourceBuilders.Resources resources = new ResourceBuilders.Resources.Builder().setVersion(RESOURCES_VERSION).build();
        return CallbackToFutureAdapter.getFuture(completer -> completer.set(resources));
    }
}
