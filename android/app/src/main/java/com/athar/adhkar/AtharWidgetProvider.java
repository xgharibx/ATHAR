package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public abstract class AtharWidgetProvider extends AppWidgetProvider {
    protected abstract AtharWidgetSpec getSpec();

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
        try { views.setTextViewText(R.id.noor_widget_date, resolveArabicDate()); } catch (Throwable ignored) {}
        try { views.setTextViewText(R.id.noor_widget_action, spec.actionLabel); } catch (Throwable ignored) {}

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            spec.layoutId + appWidgetId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        try { views.setOnClickPendingIntent(R.id.noor_widget_root, pendingIntent); } catch (Throwable ignored) {}
        try { views.setOnClickPendingIntent(R.id.noor_widget_action, pendingIntent); } catch (Throwable ignored) {}

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static String resolveArabicDate() {
        SimpleDateFormat format = new SimpleDateFormat("EEEE، d MMMM", new Locale("ar"));
        return format.format(new Date());
    }
}