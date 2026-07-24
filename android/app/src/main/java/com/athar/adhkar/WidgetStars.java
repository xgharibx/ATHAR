package com.athar.adhkar;

import android.content.Context;
import android.graphics.Bitmap;
import android.view.View;
import android.widget.RemoteViews;

/**
 * Binds the animated starfield onto a widget's ViewFlipper.
 *
 * A home-screen widget can't animate itself: there is no
 * requestAnimationFrame, and the platform floors widget updates at 30 minutes,
 * so nothing the app process does can move a pixel between updates. The way
 * around it is to hand the motion to a view the LAUNCHER owns and animates —
 * exactly what already makes the prayer countdown Chronometer tick live.
 *
 * A ViewFlipper with autoStart cross-fades its children forever inside the
 * launcher's process. Give it a few independently-generated star frames and
 * the sky twinkles (stars differ per frame) and drifts (the flipper's
 * translate animation slides each frame), with zero broadcasts, zero wakeups,
 * and no battery cost while the home screen isn't showing — ViewFlipper stops
 * its own ticker when the window goes invisible.
 */
final class WidgetStars {
    private WidgetStars() {}

    /**
     * Fill a widget's star flipper and show it, or hide it entirely.
     *
     * @param flipperId  the ViewFlipper's id
     * @param frameIds   its ImageView children, in order — must be
     *                   {@link WidgetCanvas#STAR_FRAMES} of them
     * @param show       false for the LIGHT theme (a bright day sky gets no stars)
     */
    static void apply(Context ctx, RemoteViews views, int flipperId, int[] frameIds,
                      boolean show, int wDp, int hDp, long seed) {
        if (!show) {
            views.setViewVisibility(flipperId, View.GONE);
            return;
        }
        views.setViewVisibility(flipperId, View.VISIBLE);
        Bitmap[] frames = WidgetCanvas.starfieldFrames(ctx, wDp, hDp, seed);
        for (int i = 0; i < frameIds.length && i < frames.length; i++) {
            views.setImageViewBitmap(frameIds[i], frames[i]);
        }
    }
}
