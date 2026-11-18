package com.athar.adhkar;

import android.os.Build;
import android.service.quicksettings.Tile;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Locale;

/** The next prayer in Quick Settings, worked out from the widgets' prayer times. */
public class PrayerTileService extends AtharTileService {
    private static final String KEY = "noor_widget_prayer_v2";

    @Override
    protected String route() {
        return "/prayer-times";
    }

    @Override
    protected void describe(Tile tile) {
        String[] next = nextPrayer();
        if (next == null) {
            tile.setLabel(getString(R.string.tile_prayer_label));
            setSubtitle(tile, getString(R.string.tile_prayer_open));
            tile.setState(Tile.STATE_INACTIVE);
            return;
        }
        tile.setLabel(next[0]);
        setSubtitle(tile, next[1]);
        tile.setState(Tile.STATE_ACTIVE);
    }

    private static void setSubtitle(Tile tile, String subtitle) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) tile.setSubtitle(subtitle);
    }

    /** { name, time } of the next prayer today, or tomorrow's Fajr; null without fresh times. */
    String[] nextPrayer() {
        try {
            String json = WidgetData.readJson(this, KEY);
            if (json == null) return null;
            JSONObject payload = new JSONObject(json);
            if (!PrayerWidgetFreshness.isCurrent(payload)) return null;
            JSONArray prayers = payload.optJSONArray("prayers");
            if (prayers == null || prayers.length() == 0) return null;
            Calendar now = Calendar.getInstance();
            int nowMin = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
            for (int i = 0; i < prayers.length(); i++) {
                JSONObject prayer = prayers.getJSONObject(i);
                String time = prayer.optString("time", "");
                if (minutes(time) > nowMin) return new String[] { prayer.optString("nameAr", ""), arabicTime(time) };
            }
            JSONObject fajr = prayers.getJSONObject(0);
            return new String[] { fajr.optString("nameAr", "الفجر") + " غدًا", arabicTime(fajr.optString("time", "")) };
        } catch (Exception e) {
            return null;
        }
    }

    static int minutes(String hhmm) {
        try {
            String[] parts = hhmm.split(":");
            return Integer.parseInt(parts[0].trim()) * 60 + Integer.parseInt(parts[1].trim().substring(0, 2));
        } catch (RuntimeException e) {
            return -1;
        }
    }

    /** "15:05" → "٣:٠٥ م". */
    static String arabicTime(String hhmm) {
        int total = minutes(hhmm);
        if (total < 0) return hhmm;
        int hour = total / 60;
        int minute = total % 60;
        int hour12 = hour % 12 == 0 ? 12 : hour % 12;
        String latin = String.format(Locale.US, "%d:%02d", hour12, minute);
        StringBuilder arabic = new StringBuilder();
        for (char c : latin.toCharArray()) arabic.append(Character.isDigit(c) ? (char) ('٠' + (c - '0')) : c);
        return arabic + (hour < 12 ? " ص" : " م");
    }
}
