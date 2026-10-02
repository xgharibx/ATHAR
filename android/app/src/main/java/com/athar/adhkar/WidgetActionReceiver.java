package com.athar.adhkar;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * App-private endpoint for PendingIntents attached to interactive widgets.
 * Widget providers must remain exported for launcher lifecycle broadcasts,
 * so user actions are routed through this non-exported receiver instead.
 */
public final class WidgetActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (NoorCompactWidgetProvider.ACTION_INCREMENT.equals(action)) {
            NoorCompactWidgetProvider.handleWidgetAction(context, intent);
        } else if (NoorTasbeehWidgetProvider.ACTION_INCREMENT.equals(action)
                || NoorTasbeehWidgetProvider.ACTION_RESET.equals(action)
                || NoorTasbeehWidgetProvider.ACTION_NEXT.equals(action)) {
            NoorTasbeehWidgetProvider.handleWidgetAction(context, intent);
        }
    }
}