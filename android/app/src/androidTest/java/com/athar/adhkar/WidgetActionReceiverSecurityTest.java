package com.athar.adhkar;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class WidgetActionReceiverSecurityTest {
    private static final int SENTINEL_WIDGET_ID = 987654321;

    @Test
    public void externalBroadcastsCannotChangeInteractiveWidgetCounters() throws Exception {
        Context target = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Context sender = InstrumentationRegistry.getInstrumentation().getContext();
        SharedPreferences compact = target.getSharedPreferences("AtharCompact", Context.MODE_PRIVATE);
        SharedPreferences tasbeeh = target.getSharedPreferences(
            NoorTasbeehWidgetProvider.PREFS_FILE, Context.MODE_PRIVATE);
        SharedPreferences appPrefs = WidgetData.prefs(target);

        String compactKey = "compact_count_" + SENTINEL_WIDGET_ID;
        String tasbeehCountKey = "dhikr_count_" + SENTINEL_WIDGET_ID;
        String tasbeehIndexKey = "dhikr_index_" + SENTINEL_WIDGET_ID;

        boolean compactHadKey = compact.contains(compactKey);
        int compactBefore = compact.getInt(compactKey, 0);
        boolean tasbeehHadCount = tasbeeh.contains(tasbeehCountKey);
        int tasbeehCountBefore = tasbeeh.getInt(tasbeehCountKey, 0);
        boolean tasbeehHadIndex = tasbeeh.contains(tasbeehIndexKey);
        int tasbeehIndexBefore = tasbeeh.getInt(tasbeehIndexKey, 0);
        boolean totalsHadKey = appPrefs.contains(NoorTasbeehWidgetProvider.TOTALS_KEY);
        String totalsBefore = appPrefs.getString(NoorTasbeehWidgetProvider.TOTALS_KEY, null);

        try {
            sendExternal(sender, target, NoorCompactWidgetProvider.class,
                NoorCompactWidgetProvider.ACTION_INCREMENT);

            sendExternal(sender, target, NoorTasbeehWidgetProvider.class,
                NoorTasbeehWidgetProvider.ACTION_INCREMENT);
            sendExternal(sender, target, NoorTasbeehWidgetProvider.class,
                NoorTasbeehWidgetProvider.ACTION_RESET);
            sendExternal(sender, target, NoorTasbeehWidgetProvider.class,
                NoorTasbeehWidgetProvider.ACTION_NEXT);

            InstrumentationRegistry.getInstrumentation().waitForIdleSync();

            assertEquals(compactBefore, compact.getInt(compactKey, 0));
            assertEquals(compactHadKey, compact.contains(compactKey));
            assertEquals(tasbeehCountBefore, tasbeeh.getInt(tasbeehCountKey, 0));
            assertEquals(tasbeehHadCount, tasbeeh.contains(tasbeehCountKey));
            assertEquals(tasbeehIndexBefore, tasbeeh.getInt(tasbeehIndexKey, 0));
            assertEquals(tasbeehHadIndex, tasbeeh.contains(tasbeehIndexKey));
            assertEquals(totalsBefore, appPrefs.getString(NoorTasbeehWidgetProvider.TOTALS_KEY, null));
            assertEquals(totalsHadKey, appPrefs.contains(NoorTasbeehWidgetProvider.TOTALS_KEY));
        } finally {
            restoreInt(compact, compactKey, compactHadKey, compactBefore);
            restoreInt(tasbeeh, tasbeehCountKey, tasbeehHadCount, tasbeehCountBefore);
            restoreInt(tasbeeh, tasbeehIndexKey, tasbeehHadIndex, tasbeehIndexBefore);
            if (totalsHadKey) {
                appPrefs.edit().putString(NoorTasbeehWidgetProvider.TOTALS_KEY, totalsBefore).commit();
            } else {
                appPrefs.edit().remove(NoorTasbeehWidgetProvider.TOTALS_KEY).commit();
            }
        }
    }

    @Test
    public void actionReceiverIsPrivateWhileWidgetProvidersRemainLauncherVisible() throws Exception {
        Context target = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PackageManager packageManager = target.getPackageManager();

        assertFalse(packageManager.getReceiverInfo(
            new ComponentName(target, WidgetActionReceiver.class), 0).exported);
        assertTrue(packageManager.getReceiverInfo(
            new ComponentName(target, NoorCompactWidgetProvider.class), 0).exported);
        assertTrue(packageManager.getReceiverInfo(
            new ComponentName(target, NoorTasbeehWidgetProvider.class), 0).exported);
    }

    private static void sendExternal(
            Context sender, Context target, Class<?> receiverClass, String action) {
        Intent intent = new Intent(action)
            .setComponent(new ComponentName(target, receiverClass))
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, SENTINEL_WIDGET_ID);
        sender.sendBroadcast(intent);
    }

    private static void restoreInt(
            SharedPreferences prefs, String key, boolean existed, int value) {
        SharedPreferences.Editor editor = prefs.edit();
        if (existed) editor.putInt(key, value);
        else editor.remove(key);
        editor.commit();
    }
}