package com.athar.adhkar;

import android.content.Context;
import android.widget.RemoteViews;

import androidx.core.content.ContextCompat;

/**
 * Text-ink helper for the theme-authoritative widget system.
 *
 * COSMIC and EMERALD are dark backgrounds, so their text uses the
 * always-light @color/widget_text_* / widget_row_* tokens straight from XML
 * with no code. The opt-in LIGHT theme has a bright background and needs dark
 * ink — but the chosen theme is independent of the system light/dark mode, so
 * the ink can't come from a -night resource qualifier. It's therefore applied
 * here at render time, only when the widget's theme is THEME_LIGHT.
 */
final class WidgetInk {
    private WidgetInk() {}

    /** Set the light-theme dark ink on the given text views, grouped by role.
     *  No-op for the dark themes (they keep the light XML tokens). Any array
     *  may be null. */
    static void applyLight(Context ctx, RemoteViews v, int theme,
                           int[] primary, int[] secondary, int[] accent) {
        if (theme != WidgetCanvas.THEME_LIGHT) return;
        set(ctx, v, primary,   R.color.widget_l_text_primary);
        set(ctx, v, secondary, R.color.widget_l_text_secondary);
        set(ctx, v, accent,    R.color.widget_l_text_accent);
    }

    /** Extra accent roles (blue / dusk) some widgets use, same LIGHT-only rule. */
    static void applyLightAccents(Context ctx, RemoteViews v, int theme,
                                  int[] accentBlue, int[] accentDusk) {
        if (theme != WidgetCanvas.THEME_LIGHT) return;
        set(ctx, v, accentBlue, R.color.widget_l_accent_blue);
        set(ctx, v, accentDusk, R.color.widget_l_accent_dusk);
    }

    /** Resolve a color that differs between the dark themes and LIGHT — for
     *  the row-state / dot colors that providers set programmatically. */
    static int pick(Context ctx, int theme, int darkRes, int lightRes) {
        return ContextCompat.getColor(ctx, theme == WidgetCanvas.THEME_LIGHT ? lightRes : darkRes);
    }

    private static void set(Context ctx, RemoteViews v, int[] ids, int colorRes) {
        if (ids == null || ids.length == 0) return;
        int c = ContextCompat.getColor(ctx, colorRes);
        for (int id : ids) v.setTextColor(id, c);
    }
}
