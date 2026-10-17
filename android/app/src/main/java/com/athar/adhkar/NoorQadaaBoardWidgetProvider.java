package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * Qadaa board (4×3): a row per prayer owed with a plus and a minus, so a missed
 * prayer can be made up and logged from the home screen.
 *
 * Taps do not touch the app's data directly (the app may not be running). Each
 * one bumps a cumulative counter in a native ledger:
 *
 *   { "owners": { "<owner>": { "p:fajr": { "i": plusTaps, "d": minusTaps } } } }
 *
 * The app reads it on its next foreground and applies the difference since it
 * last looked (src/lib/qadaaWidgetSync.ts). Counters only grow and nothing is
 * cleared, so a tap landing while the app merges can be neither lost nor counted
 * twice. What the rows SHOW is the app's last synced numbers with the taps made
 * since layered on top, so a tap is visible immediately.
 */
public class NoorQadaaBoardWidgetProvider extends AtharWidgetProvider {

    public static final String ACTION_ADJUST = "com.athar.adhkar.QADAA_ADJUST";
    private static final String EXTRA_KEY = "qadaa_key";
    private static final String EXTRA_DELTA = "qadaa_delta";

    static final String LEDGER_KEY = "noor_widget_qadaa_ledger_v1";
    private static final String PAYLOAD_KEY = "noor_widget_qadaa_v1";
    private static final String OWNER_KEY = "noor_widget_tasbeeh_owner_v1";

    private static final int ROWS = 6;
    private static final int[] ROW = {
        R.id.qb_row_0, R.id.qb_row_1, R.id.qb_row_2, R.id.qb_row_3, R.id.qb_row_4, R.id.qb_row_5 };
    private static final int[] NAME = {
        R.id.qb_name_0, R.id.qb_name_1, R.id.qb_name_2, R.id.qb_name_3, R.id.qb_name_4, R.id.qb_name_5 };
    private static final int[] INFO = {
        R.id.qb_info_0, R.id.qb_info_1, R.id.qb_info_2, R.id.qb_info_3, R.id.qb_info_4, R.id.qb_info_5 };
    private static final int[] MINUS = {
        R.id.qb_minus_0, R.id.qb_minus_1, R.id.qb_minus_2, R.id.qb_minus_3, R.id.qb_minus_4, R.id.qb_minus_5 };
    private static final int[] PLUS = {
        R.id.qb_plus_0, R.id.qb_plus_1, R.id.qb_plus_2, R.id.qb_plus_3, R.id.qb_plus_4, R.id.qb_plus_5 };

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.widget_qadaa_board,
            "قضاء الفوائت",
            new String[] { "افتح التطبيق لمزامنة القضاء" },
            "قضاء الفوائت",
            "/qadaa"
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            try {
                render(context, manager, id);
            } catch (Throwable t) {
                android.util.Log.e("QadaaBoard", "render failed", t);
            }
        }
    }

    /** Invoked by WidgetActionReceiver (this provider stays exported only for launcher lifecycle). */
    static void handleWidgetAction(Context context, Intent intent) {
        if (intent == null || !ACTION_ADJUST.equals(intent.getAction())) return;
        String key = intent.getStringExtra(EXTRA_KEY);
        int delta = intent.getIntExtra(EXTRA_DELTA, 0);
        if (key == null || !key.matches("p:(fajr|dhuhr|asr|maghrib|isha|witr)") || (delta != 1 && delta != -1)) return;

        // Only an installed widget may move the ledger.
        int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        boolean installed = false;
        for (int installedId : mgr.getAppWidgetIds(new ComponentName(context, NoorQadaaBoardWidgetProvider.class))) {
            if (installedId == id) { installed = true; break; }
        }
        if (!installed) return;

        // Mirror what the row shows: nothing to add when nothing remains, nothing
        // to take back when nothing was made up. Without this a stray minus would
        // sit in the ledger and inflate the remaining count.
        int[] eff = effective(context, key);
        if (eff == null || (delta > 0 && eff[0] <= 0) || (delta < 0 && eff[1] <= 0)) return;

        bump(context, key, delta);
        for (int wid : mgr.getAppWidgetIds(new ComponentName(context, NoorQadaaBoardWidgetProvider.class))) {
            try { render(context, mgr, wid); } catch (Throwable ignored) { /* next refresh will repaint */ }
        }
    }

    /** {remaining, madeUp} for a key: the app's last synced numbers plus taps made since. Null if unknown. */
    private static int[] effective(Context context, String key) {
        try {
            String json = WidgetData.readJson(context, PAYLOAD_KEY);
            if (json == null) return null;
            JSONObject payload = new JSONObject(json);
            org.json.JSONArray prayers = payload.optJSONArray("prayers");
            if (prayers == null) return null;
            String me = owner(context);
            JSONObject seen = me.equals(payload.optString("owner", "local")) ? payload.optJSONObject("seen") : null;
            JSONObject ledgerOwner = null;
            String ledger = WidgetData.prefs(context).getString(LEDGER_KEY, null);
            if (ledger != null) {
                JSONObject owners = new JSONObject(ledger).optJSONObject("owners");
                if (owners != null) ledgerOwner = owners.optJSONObject(me);
            }
            for (int i = 0; i < prayers.length(); i++) {
                JSONObject p = prayers.getJSONObject(i);
                if (!key.equals("p:" + p.optString("k"))) continue;
                int[] pend = pending(ledgerOwner, seen, key);
                return new int[] {
                    Math.max(0, p.optInt("rem", 0) - pend[0] + pend[1]),
                    Math.max(0, p.optInt("dn", 0) + pend[0] - pend[1]) };
            }
        } catch (Throwable ignored) { /* unknown -> refuse */ }
        return null;
    }

    private static String owner(Context context) {
        String o = WidgetData.prefs(context).getString(OWNER_KEY, "local");
        return o == null || o.isEmpty() ? "local" : o;
    }

    private static synchronized void bump(Context context, String key, int delta) {
        try {
            SharedPreferences prefs = WidgetData.prefs(context);
            String existing = prefs.getString(LEDGER_KEY, null);
            JSONObject root = existing != null ? new JSONObject(existing) : new JSONObject();
            JSONObject owners = root.optJSONObject("owners");
            if (owners == null) { owners = new JSONObject(); root.put("owners", owners); }
            String owner = owner(context);
            JSONObject mine = owners.optJSONObject(owner);
            if (mine == null) { mine = new JSONObject(); owners.put(owner, mine); }
            JSONObject c = mine.optJSONObject(key);
            if (c == null) { c = new JSONObject(); mine.put(key, c); }
            String field = delta > 0 ? "i" : "d";
            c.put(field, c.optInt(field, 0) + 1);
            root.put("version", 1);
            prefs.edit().putString(LEDGER_KEY, root.toString()).commit();
        } catch (Throwable ignored) {
            // Best-effort: a tap that cannot be recorded must not crash the launcher.
        }
    }

    private static PendingIntent adjustIntent(Context context, int widgetId, String key, int delta, int slot) {
        Intent i = new Intent(context, WidgetActionReceiver.class)
            .setAction(ACTION_ADJUST)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            .putExtra(EXTRA_KEY, key)
            .putExtra(EXTRA_DELTA, delta);
        return PendingIntent.getBroadcast(
            context,
            widgetId * 64 + slot * 2 + (delta > 0 ? 1 : 0),
            i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static int[] pending(JSONObject ledgerOwner, JSONObject seen, String key) {
        int i = 0, d = 0, si = 0, sd = 0;
        if (ledgerOwner != null) {
            JSONObject c = ledgerOwner.optJSONObject(key);
            if (c != null) { i = c.optInt("i", 0); d = c.optInt("d", 0); }
        }
        if (seen != null) {
            JSONObject s = seen.optJSONObject(key);
            if (s != null) { si = s.optInt("i", 0); sd = s.optInt("d", 0); }
        }
        return new int[] { Math.max(0, i - si), Math.max(0, d - sd) };
    }

    private static String label(String k) {
        switch (k) {
            case "fajr": return "الفجر";
            case "dhuhr": return "الظهر";
            case "asr": return "العصر";
            case "maghrib": return "المغرب";
            case "isha": return "العشاء";
            case "witr": return "الوتر";
            default: return k;
        }
    }

    private static String ar(int n) {
        String s = Integer.toString(n);
        StringBuilder out = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            out.append(c >= '0' && c <= '9' ? (char) ('٠' + (c - '0')) : c);
        }
        return out.toString();
    }

    private static void render(Context context, AppWidgetManager manager, int appWidgetId) throws Exception {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_qadaa_board);

        String json = WidgetData.readJson(context, PAYLOAD_KEY);
        JSONObject payload = json != null ? new JSONObject(json) : null;
        boolean configured = payload != null && payload.optBoolean("configured", false)
            && payload.optJSONArray("prayers") != null && payload.optJSONArray("prayers").length() > 0;

        String me = owner(context);
        JSONObject seen = null;
        if (payload != null && me.equals(payload.optString("owner", "local"))) seen = payload.optJSONObject("seen");
        JSONObject ledgerOwner = null;
        String ledger = WidgetData.prefs(context).getString(LEDGER_KEY, null);
        if (ledger != null) {
            JSONObject owners = new JSONObject(ledger).optJSONObject("owners");
            if (owners != null) ledgerOwner = owners.optJSONObject(me);
        }

        int totalRemaining = 0;
        int rowsShown = 0;
        if (configured) {
            org.json.JSONArray prayers = payload.getJSONArray("prayers");
            for (int slot = 0; slot < ROWS; slot++) {
                if (slot >= prayers.length()) { views.setViewVisibility(ROW[slot], View.GONE); continue; }
                JSONObject p = prayers.getJSONObject(slot);
                String k = p.optString("k");
                String key = "p:" + k;
                int[] pend = pending(ledgerOwner, seen, key);
                int dn = Math.max(0, p.optInt("dn", 0) + pend[0] - pend[1]);
                int rem = Math.max(0, p.optInt("rem", 0) - pend[0] + pend[1]);
                int qt = p.optInt("qt", 0);
                int td = Math.max(0, p.optInt("td", 0) + pend[0] - pend[1]);
                totalRemaining += rem;
                rowsShown++;

                views.setViewVisibility(ROW[slot], View.VISIBLE);
                views.setTextViewText(NAME[slot], label(k));
                String info = "متبقٍ " + ar(rem);
                if (qt > 0) info += " · اليوم " + ar(Math.min(td, qt)) + "/" + ar(qt);
                views.setTextViewText(INFO[slot], info);
                views.setOnClickPendingIntent(PLUS[slot], adjustIntent(context, appWidgetId, key, 1, slot));
                views.setOnClickPendingIntent(MINUS[slot], adjustIntent(context, appWidgetId, key, -1, slot));
                // A prayer with nothing left, or nothing made up, has nothing to add or take back.
                views.setFloat(PLUS[slot], "setAlpha", rem > 0 ? 1f : 0.35f);
                views.setFloat(MINUS[slot], "setAlpha", dn > 0 ? 1f : 0.35f);
            }
            views.setTextViewText(R.id.qb_sub, totalRemaining == 0 ? "أتممتَ القضاء" : "متبقٍ " + ar(totalRemaining) + " صلاة");
        } else {
            for (int slot = 0; slot < ROWS; slot++) views.setViewVisibility(ROW[slot], View.GONE);
            views.setTextViewText(R.id.qb_sub, "ابدأ خطة القضاء من التطبيق");
        }

        int theme = WidgetCanvas.widgetTheme(context, appWidgetId);
        boolean widgetDark = WidgetCanvas.isThemeDark(theme);
        int[] sz = WidgetCanvas.sizeDp(context, manager, appWidgetId, 250, 250);
        WidgetCanvas.ClockSky sky = WidgetCanvas.clockPhase();
        views.setImageViewBitmap(R.id.qb_sky,
            WidgetCanvas.sky(context, sz[0], sz[1], sky.fromPhase, sky.toPhase, sky.blend,
                WidgetCanvas.outerCornerRadiusDp(context), theme));
        WidgetStars.apply(context, views, R.id.qb_stars_flipper,
            new int[]{ R.id.qb_stars, R.id.qb_stars_2, R.id.qb_stars_3 },
            widgetDark, sz[0], sz[1], System.currentTimeMillis() / 60000);

        // Tapping the header (or an empty widget) opens the page.
        views.setOnClickPendingIntent(R.id.qb_title, openApp(context, appWidgetId * 27, "/qadaa"));
        views.setOnClickPendingIntent(R.id.qb_sub, openApp(context, appWidgetId * 27 + 1, "/qadaa"));

        WidgetInk.applyLight(context, views, theme,
            new int[]{ R.id.qb_name_0, R.id.qb_name_1, R.id.qb_name_2, R.id.qb_name_3, R.id.qb_name_4, R.id.qb_name_5 },
            new int[]{ R.id.qb_sub, R.id.qb_info_0, R.id.qb_info_1, R.id.qb_info_2, R.id.qb_info_3, R.id.qb_info_4, R.id.qb_info_5 },
            new int[]{ R.id.qb_title });

        manager.updateAppWidget(appWidgetId, views);
    }
}
