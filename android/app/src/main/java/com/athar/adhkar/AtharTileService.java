package com.athar.adhkar;

import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

/**
 * Quick Settings tiles: swipe down from anywhere and tap to land in Athar.
 * PrayerTileService shows the next prayer and opens the prayer times;
 * SebhaTileService opens the tasbeeh counter.
 */
public abstract class AtharTileService extends TileService {

    /** The in-app screen the tile opens. */
    protected abstract String route();

    /** Fill in the tile's label and subtitle; called whenever the shade opens. */
    protected abstract void describe(Tile tile);

    @Override
    public void onStartListening() {
        super.onStartListening();
        Tile tile = getQsTile();
        if (tile == null) return;
        describe(tile);
        tile.updateTile();
    }

    @Override
    public void onClick() {
        super.onClick();
        Intent intent = new Intent(this, AtharActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(AtharWidgetProvider.EXTRA_ROUTE, route());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            PendingIntent pending = PendingIntent.getActivity(
                this, route().hashCode(), intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            startActivityAndCollapse(pending);
        } else {
            startActivityAndCollapseCompat(intent);
        }
    }

    @SuppressWarnings("deprecation")
    private void startActivityAndCollapseCompat(Intent intent) {
        startActivityAndCollapse(intent);
    }
}
