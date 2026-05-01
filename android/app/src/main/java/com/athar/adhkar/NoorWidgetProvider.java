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

public class NoorWidgetProvider extends AppWidgetProvider {
    private static final String[] DAILY_PHRASES = new String[] {
            "ابدأ بأقل القليل، ثم زد برفق.",
            "ورد قصير ثابت خير من كثير منقطع.",
            "افتح الأذكار وخذ دقيقة لقلبك.",
            "صل على النبي ﷺ واجعلها بداية وردك.",
            "راجع صلاة اليوم وورد القرآن."
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.noor_widget);
        views.setTextViewText(R.id.noor_widget_title, "أثر — وردك اليومي");
        views.setTextViewText(R.id.noor_widget_phrase, resolveDailyPhrase());
        views.setTextViewText(R.id.noor_widget_date, resolveArabicDate());
        views.setTextViewText(R.id.noor_widget_action, "افتح وردك");
        views.setOnClickPendingIntent(R.id.noor_widget_root, pendingIntent);
        views.setOnClickPendingIntent(R.id.noor_widget_action, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static String resolveDailyPhrase() {
        int dayIndex = Math.floorMod((int) (System.currentTimeMillis() / 86400000L), DAILY_PHRASES.length);
        return DAILY_PHRASES[dayIndex];
    }

    private static String resolveArabicDate() {
        return new SimpleDateFormat("EEEE d MMMM", new Locale("ar")).format(new Date());
    }
}