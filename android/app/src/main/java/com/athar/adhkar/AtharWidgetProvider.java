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
        AtharWidgetSpec spec = getSpec();
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId, spec);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId, AtharWidgetSpec spec) {
        RemoteViews views = new RemoteViews(context.getPackageName(), spec.layoutId);
        views.setTextViewText(R.id.noor_widget_title, spec.title);
        views.setTextViewText(R.id.noor_widget_phrase, spec.resolvePhrase());
        views.setTextViewText(R.id.noor_widget_date, resolveArabicDate());
        views.setTextViewText(R.id.noor_widget_action, spec.actionLabel);

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            spec.layoutId + appWidgetId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.noor_widget_root, pendingIntent);
        views.setOnClickPendingIntent(R.id.noor_widget_action, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static String resolveArabicDate() {
        SimpleDateFormat format = new SimpleDateFormat("EEEE، d MMMM", new Locale("ar"));
        return format.format(new Date());
    }
}