package com.athar.adhkar;

import static org.junit.Assert.assertEquals;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class TasbeehWidgetLedgerTest {
    @Test
    public void keepsUnmergedTotalsAcrossDatesAndSeparatesOwners() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        SharedPreferences prefs = WidgetData.prefs(context);
        boolean hadTotals = prefs.contains(NoorTasbeehWidgetProvider.TOTALS_KEY);
        String oldTotals = prefs.getString(NoorTasbeehWidgetProvider.TOTALS_KEY, null);
        boolean hadOwner = prefs.contains(NoorTasbeehWidgetProvider.OWNER_KEY);
        String oldOwner = prefs.getString(NoorTasbeehWidgetProvider.OWNER_KEY, null);

        try {
            prefs.edit().putString(NoorTasbeehWidgetProvider.OWNER_KEY, "local").commit();
            NoorTasbeehWidgetProvider.bumpDailyTotal(context, "subhanallah", "2026-07-19");
            NoorTasbeehWidgetProvider.bumpDailyTotal(context, "subhanallah", "2026-07-19");
            NoorTasbeehWidgetProvider.bumpDailyTotal(context, "subhanallah", "2026-07-20");

            prefs.edit().putString(NoorTasbeehWidgetProvider.OWNER_KEY, "user:account-b").commit();
            NoorTasbeehWidgetProvider.bumpDailyTotal(context, "subhanallah", "2026-07-20");

            JSONObject payload = new JSONObject(
                prefs.getString(NoorTasbeehWidgetProvider.TOTALS_KEY, "{}"));
            JSONObject owners = payload.getJSONObject("owners");
            JSONObject localDays = owners.getJSONObject("local");
            JSONObject yesterday = localDays.getJSONObject("2026-07-19");
            JSONObject today = localDays.getJSONObject("2026-07-20");
            JSONObject accountBDay = owners.getJSONObject("user:account-b")
                .getJSONObject("2026-07-20");

            assertEquals(2, yesterday.getJSONObject("counts").getInt("subhanallah"));
            assertEquals(1, today.getJSONObject("counts").getInt("subhanallah"));
            assertEquals(1, accountBDay.getJSONObject("counts").getInt("subhanallah"));
        } finally {
            SharedPreferences.Editor editor = prefs.edit();
            if (hadTotals) editor.putString(NoorTasbeehWidgetProvider.TOTALS_KEY, oldTotals);
            else editor.remove(NoorTasbeehWidgetProvider.TOTALS_KEY);
            if (hadOwner) editor.putString(NoorTasbeehWidgetProvider.OWNER_KEY, oldOwner);
            else editor.remove(NoorTasbeehWidgetProvider.OWNER_KEY);
            editor.commit();
        }
    }

    @Test
    public void migratesLegacySingleDayTotalsBeforeRecordingNewDay() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        SharedPreferences prefs = WidgetData.prefs(context);
        boolean hadTotals = prefs.contains(NoorTasbeehWidgetProvider.TOTALS_KEY);
        String oldTotals = prefs.getString(NoorTasbeehWidgetProvider.TOTALS_KEY, null);
        boolean hadOwner = prefs.contains(NoorTasbeehWidgetProvider.OWNER_KEY);
        String oldOwner = prefs.getString(NoorTasbeehWidgetProvider.OWNER_KEY, null);

        try {
            JSONObject legacyCounts = new JSONObject().put("subhanallah", 33);
            JSONObject legacy = new JSONObject()
                .put("date", "2026-07-19")
                .put("owner", "local")
                .put("counts", legacyCounts)
                .put("total", 33);
            prefs.edit()
                .putString(NoorTasbeehWidgetProvider.OWNER_KEY, "local")
                .putString(NoorTasbeehWidgetProvider.TOTALS_KEY, legacy.toString())
                .commit();

            NoorTasbeehWidgetProvider.bumpDailyTotal(context, "subhanallah", "2026-07-20");

            JSONObject owners = new JSONObject(
                prefs.getString(NoorTasbeehWidgetProvider.TOTALS_KEY, "{}"))
                .getJSONObject("owners");
            assertEquals(33, owners.getJSONObject("local").getJSONObject("2026-07-19")
                .getJSONObject("counts").getInt("subhanallah"));
            assertEquals(1, owners.getJSONObject("local").getJSONObject("2026-07-20")
                .getJSONObject("counts").getInt("subhanallah"));
        } finally {
            SharedPreferences.Editor editor = prefs.edit();
            if (hadTotals) editor.putString(NoorTasbeehWidgetProvider.TOTALS_KEY, oldTotals);
            else editor.remove(NoorTasbeehWidgetProvider.TOTALS_KEY);
            if (hadOwner) editor.putString(NoorTasbeehWidgetProvider.OWNER_KEY, oldOwner);
            else editor.remove(NoorTasbeehWidgetProvider.OWNER_KEY);
            editor.commit();
        }
    }
}
