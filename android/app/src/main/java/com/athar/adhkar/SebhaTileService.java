package com.athar.adhkar;

import android.os.Build;
import android.service.quicksettings.Tile;

/** The tasbeeh counter, one swipe away. */
public class SebhaTileService extends AtharTileService {
    @Override
    protected String route() {
        return "/sebha";
    }

    @Override
    protected void describe(Tile tile) {
        tile.setLabel(getString(R.string.tile_sebha_label));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) tile.setSubtitle(getString(R.string.tile_sebha_subtitle));
        tile.setState(Tile.STATE_INACTIVE);
    }
}
