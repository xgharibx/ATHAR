package com.athar.adhkar;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.os.Bundle;
import android.widget.ImageView;

/**
 * Widget theme picker — launched by the launcher when an Athar widget is
 * placed (declared via android:configure in every widget's info.xml). Shows
 * a live-rendered preview of each theme (COSMIC deep-space vs EMERALD deep-
 * green); tapping one stores that choice for the just-placed widget, repaints
 * it, and returns RESULT_OK so the launcher completes the placement.
 *
 * Standard configure-activity contract: the result defaults to CANCELED, so
 * if the user backs out the widget is NOT added.
 */
public class WidgetConfigActivity extends Activity {

    private int appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Default result: if the user leaves without choosing, cancel the add.
        setResult(RESULT_CANCELED);

        Bundle extras = getIntent().getExtras();
        if (extras != null) {
            appWidgetId = extras.getInt(
                AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        }
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        setContentView(R.layout.activity_widget_config);

        // Live previews — the same phase for both so they're directly
        // comparable, composited (sky + starfield) exactly as the widget
        // paints them.
        WidgetCanvas.ClockSky sky = WidgetCanvas.clockPhase();
        ((ImageView) findViewById(R.id.config_preview_cosmic))
            .setImageBitmap(preview(sky, WidgetCanvas.THEME_COSMIC));
        ((ImageView) findViewById(R.id.config_preview_emerald))
            .setImageBitmap(preview(sky, WidgetCanvas.THEME_EMERALD));
        ((ImageView) findViewById(R.id.config_preview_light))
            .setImageBitmap(preview(sky, WidgetCanvas.THEME_LIGHT));

        findViewById(R.id.config_card_cosmic).setOnClickListener(v -> choose(WidgetCanvas.THEME_COSMIC));
        findViewById(R.id.config_card_emerald).setOnClickListener(v -> choose(WidgetCanvas.THEME_EMERALD));
        findViewById(R.id.config_card_light).setOnClickListener(v -> choose(WidgetCanvas.THEME_LIGHT));
    }

    /** Composite a sky (+ starfield, dark themes only) preview for one theme. */
    private Bitmap preview(WidgetCanvas.ClockSky sky, int theme) {
        Bitmap bg = WidgetCanvas.sky(this, 340, 150, sky.fromPhase, sky.toPhase, sky.blend, 20f, theme);
        Bitmap out = Bitmap.createBitmap(bg.getWidth(), bg.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(out);
        c.drawBitmap(bg, 0, 0, null);
        // Stars belong to the dark themes only — same rule the widgets use.
        if (WidgetCanvas.isThemeDark(theme)) {
            Bitmap stars = WidgetCanvas.starfield(this, 340, 150, System.currentTimeMillis() / 60000 + theme);
            c.drawBitmap(stars, 0, 0, null);
        }
        return out;
    }

    /** Apply the chosen theme, repaint the widget, and complete the add. */
    private void choose(int theme) {
        WidgetCanvas.setWidgetTheme(this, appWidgetId, theme);

        // Repaint just this widget instance now that its theme is set.
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(this);
            AppWidgetProviderInfo info = mgr.getAppWidgetInfo(appWidgetId);
            if (info != null && info.provider != null) {
                Intent update = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                    .setComponent(info.provider)
                    .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, new int[]{ appWidgetId });
                sendBroadcast(update);
            }
        } catch (Throwable ignored) {
            // Placement still succeeds; the widget repaints on its next cycle.
        }

        Intent result = new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        setResult(RESULT_OK, result);
        finish();
    }
}
