package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public abstract class AtharWidgetProvider extends AppWidgetProvider {
    protected abstract AtharWidgetSpec getSpec();

    /** Intent extra read by MainActivity to deep-link into a route. */
    public static final String EXTRA_ROUTE = "athar_route";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        AtharWidgetSpec spec;
        try {
            spec = getSpec();
        } catch (Throwable t) {
            return;
        }
        if (spec == null) return;
        for (int appWidgetId : appWidgetIds) {
            try {
                updateAppWidget(context, appWidgetManager, appWidgetId, spec);
            } catch (Throwable t) {
                // Never let the launcher show "couldn't load widget"; just skip this id.
            }
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId, AtharWidgetSpec spec) {
        RemoteViews views = new RemoteViews(context.getPackageName(), spec.layoutId);
        try { views.setTextViewText(R.id.noor_widget_title, spec.title); } catch (Throwable ignored) {}
        try { views.setTextViewText(R.id.noor_widget_phrase, spec.resolvePhrase()); } catch (Throwable ignored) {}
        try { views.setTextViewText(R.id.noor_widget_date, dateLine()); } catch (Throwable ignored) {}
        try { views.setTextViewText(R.id.noor_widget_action, spec.actionLabel); } catch (Throwable ignored) {}

        PendingIntent pendingIntent = openApp(context, spec.layoutId + appWidgetId, spec.route);
        try { views.setOnClickPendingIntent(R.id.noor_widget_root, pendingIntent); } catch (Throwable ignored) {}
        try { views.setOnClickPendingIntent(R.id.noor_widget_action, pendingIntent); } catch (Throwable ignored) {}

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    /** PendingIntent that opens the app on a specific in-app route (null → home). */
    public static PendingIntent openApp(Context context, int requestCode, String route) {
        Intent intent = new Intent(context, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (route != null && !route.isEmpty()) {
            intent.putExtra(EXTRA_ROUTE, route);
            // Distinct data URI keeps PendingIntents with different routes distinct.
            intent.setAction("com.athar.adhkar.OPEN_" + route.hashCode());
        }
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /** "الجمعة، ٧ يوليو • ١٢ محرم ١٤٤٧" — Gregorian + Umm al-Qura Hijri. */
    public static String dateLine() {
        String gregorian = new SimpleDateFormat("EEEE، d MMMM", new Locale("ar")).format(new Date());
        String hijri = hijriDate();
        return hijri.isEmpty() ? gregorian : gregorian + "  •  " + hijri;
    }

    /** Umm al-Qura Hijri date in Arabic, or "" below API 24. */
    public static String hijriDate() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return "";
        try {
            android.icu.text.SimpleDateFormat fmt = new android.icu.text.SimpleDateFormat(
                "d MMMM y",
                android.icu.util.ULocale.forLanguageTag("ar-SA-u-ca-islamic-umalqura")
            );
            return fmt.format(new Date());
        } catch (Throwable t) {
            return "";
        }
    }
}
