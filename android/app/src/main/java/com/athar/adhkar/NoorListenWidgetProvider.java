package com.athar.adhkar;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Shader;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;

/**
 * «السماع» widget (4×2): what is playing and by whom under a mihrab's arch,
 * a bar and a clock that move with the recitation (the clock runs in the
 * launcher by itself; RecitationService moves the bar every ten seconds), and
 * the controls, left to right like every player in the app, which play, pause
 * and skip without opening Athar. When the app was closed, play starts the
 * last recitation again where it stopped.
 *
 * Draws from ListenWidget's snapshot; the iPhone widget is AtharListenWidget.swift.
 */
public class NoorListenWidgetProvider extends AtharWidgetProvider {

    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.widget_listen,
            "السماع",
            new String[] { "القرآن كاملًا بأصوات كبار القرّاء" },
            "ابدأ السماع",
            "/listen"
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            try {
                draw(context, manager, id);
            } catch (Throwable t) {
                // Never surface "couldn't load widget"; skip this id safely.
            }
        }
    }

    /** Redraws every placed «السماع» widget (called by the player at each change). */
    static void updateAll(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            if (manager == null) return;
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, NoorListenWidgetProvider.class));
            if (ids == null || ids.length == 0) return;
            Intent intent = new Intent(context, NoorListenWidgetProvider.class)
                .setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            context.sendBroadcast(intent);
        } catch (Throwable ignored) {
            // Best effort.
        }
    }

    private void draw(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_listen);
        JSONObject s = ListenWidget.snapshot(context);
        String state = s == null ? "idle" : s.optString("state", "idle");
        boolean resumable = !"idle".equals(state) && !s.optString("title", "").isEmpty();
        boolean live = resumable && s.optBoolean("live", false);
        long durationMs = resumable ? s.optLong("durationMs", 0L) : 0L;
        long at = resumable ? s.optLong("at", System.currentTimeMillis()) : 0L;
        double rate = resumable ? s.optDouble("rate", 1.0) : 1.0;
        long now = System.currentTimeMillis();
        boolean timed = !live && durationMs > 1000;
        long positionMs = resumable ? s.optLong("positionMs", 0L) : 0L;
        boolean playing = "playing".equals(state);
        if (playing && timed) {
            positionMs = Math.min(durationMs, positionMs + (long) ((now - at) * (rate > 0 ? rate : 1.0)));
            // Long past its end: the player stopped writing (the app was closed).
            if (positionMs >= durationMs && now - at > durationMs + 45_000) playing = false;
        }

        int theme = WidgetCanvas.widgetTheme(context, appWidgetId);
        boolean dark = WidgetCanvas.isThemeDark(theme);
        int[] sz = WidgetCanvas.sizeDp(context, manager, appWidgetId, 250, 110);
        WidgetCanvas.ClockSky sky = WidgetCanvas.clockPhase();
        views.setImageViewBitmap(R.id.listen_sky,
            WidgetCanvas.sky(context, sz[0], sz[1], sky.fromPhase, sky.toPhase, sky.blend, WidgetCanvas.outerCornerRadiusDp(context), theme));
        WidgetStars.apply(context, views, R.id.listen_stars_flipper,
            new int[] { R.id.listen_stars, R.id.listen_stars_2, R.id.listen_stars_3 },
            dark, sz[0], sz[1], System.currentTimeMillis() / 60000);
        views.setImageViewBitmap(R.id.listen_arch, arch(context, playing, live, dark));

        // The words.
        if (resumable) {
            String status = live ? (playing ? "بث مباشر" : "الإذاعة متوقفة") : (playing ? "يُتلى الآن" : "أكمل الاستماع");
            views.setTextViewText(R.id.listen_status, status);
            views.setViewVisibility(R.id.listen_live_dot, playing ? View.VISIBLE : View.GONE);
            views.setTextViewText(R.id.listen_title, s.optString("title", ""));
            views.setTextViewText(R.id.listen_artist, s.optString("artist", ""));
        } else {
            views.setTextViewText(R.id.listen_status, "السماع");
            views.setViewVisibility(R.id.listen_live_dot, View.GONE);
            views.setTextViewText(R.id.listen_title, "ابدأ السماع");
            views.setTextViewText(R.id.listen_artist, "القرآن كاملًا بأصوات كبار القرّاء");
        }
        views.setTextColor(R.id.listen_status, WidgetInk.pick(context, theme,
            playing ? R.color.widget_listen_live : R.color.widget_text_accent,
            playing ? R.color.widget_l_listen_live : R.color.widget_l_text_accent));

        // The bar and the clock.
        if (timed) {
            float fraction = Math.min(1f, Math.max(0f, positionMs / (float) durationMs));
            views.setViewVisibility(R.id.listen_bar, View.VISIBLE);
            views.setImageViewBitmap(R.id.listen_bar, WidgetCanvas.barGold(context, Math.max(120, sz[0] - 28), 6, fraction));
            views.setTextViewText(R.id.listen_duration, clock(durationMs));
            views.setViewVisibility(R.id.listen_duration, View.VISIBLE);
            if (playing && Math.abs(rate - 1.0) < 0.01) {
                // Counts in the launcher, with no wake-ups.
                views.setChronometer(R.id.listen_elapsed, SystemClock.elapsedRealtime() - positionMs, null, true);
                views.setViewVisibility(R.id.listen_elapsed, View.VISIBLE);
                views.setViewVisibility(R.id.listen_elapsed_still, View.GONE);
            } else {
                views.setChronometer(R.id.listen_elapsed, SystemClock.elapsedRealtime(), null, false);
                views.setViewVisibility(R.id.listen_elapsed, View.GONE);
                views.setTextViewText(R.id.listen_elapsed_still, clock(positionMs));
                views.setViewVisibility(R.id.listen_elapsed_still, View.VISIBLE);
            }
        } else {
            views.setViewVisibility(R.id.listen_bar, live ? View.VISIBLE : View.INVISIBLE);
            if (live) views.setImageViewBitmap(R.id.listen_bar, WidgetCanvas.barGold(context, Math.max(120, sz[0] - 28), 6, playing ? 1f : 0f));
            views.setChronometer(R.id.listen_elapsed, SystemClock.elapsedRealtime(), null, false);
            views.setViewVisibility(R.id.listen_elapsed, View.GONE);
            views.setViewVisibility(R.id.listen_elapsed_still, View.GONE);
            views.setViewVisibility(R.id.listen_duration, View.GONE);
        }

        // The controls.
        int base = appWidgetId * 31;
        views.setOnClickPendingIntent(R.id.listen_root, openApp(context, base, "/listen"));
        views.setOnClickPendingIntent(R.id.listen_head, openApp(context, base + 1, "/listen"));
        boolean hasNext = resumable && s.optBoolean("hasNext", false);
        boolean hasPrevious = resumable && s.optBoolean("hasPrevious", false);
        views.setImageViewResource(R.id.listen_toggle, playing ? R.drawable.ic_listen_pause : R.drawable.ic_listen_play);
        views.setContentDescription(R.id.listen_toggle, playing ? "إيقاف مؤقت" : resumable ? "تشغيل" : "ابدأ السماع");
        if (resumable) {
            views.setOnClickPendingIntent(R.id.listen_toggle,
                ListenWidget.command(context, playing ? ListenWidget.ACTION_PAUSE : ListenWidget.ACTION_PLAY, base + 2));
        } else {
            views.setOnClickPendingIntent(R.id.listen_toggle, openApp(context, base + 2, "/listen"));
        }
        control(context, views, R.id.listen_next, hasNext, ListenWidget.ACTION_NEXT, base + 3, live ? "المحطة التالية" : "التالي");
        control(context, views, R.id.listen_previous, hasPrevious, ListenWidget.ACTION_PREVIOUS, base + 4, live ? "المحطة السابقة" : "السابق");
        views.setViewVisibility(R.id.listen_next, resumable ? View.VISIBLE : View.INVISIBLE);
        views.setViewVisibility(R.id.listen_previous, resumable ? View.VISIBLE : View.INVISIBLE);

        int skipTint = WidgetInk.pick(context, theme, R.color.widget_text_primary, R.color.widget_l_text_primary);
        views.setInt(R.id.listen_next, "setColorFilter", skipTint);
        views.setInt(R.id.listen_previous, "setColorFilter", skipTint);
        WidgetInk.applyLight(context, views, theme,
            new int[] { R.id.listen_title },
            new int[] { R.id.listen_artist, R.id.listen_elapsed, R.id.listen_elapsed_still, R.id.listen_duration },
            null);

        manager.updateAppWidget(appWidgetId, views);
    }

    private static void control(Context context, RemoteViews views, int id, boolean enabled, String action, int requestCode, String label) {
        views.setContentDescription(id, label);
        views.setInt(id, "setImageAlpha", enabled ? 235 : 70);
        if (enabled) views.setOnClickPendingIntent(id, ListenWidget.command(context, action, requestCode));
        else views.setOnClickPendingIntent(id, openApp(context, requestCode, "/listen"));
    }

    private static String clock(long ms) {
        long total = Math.max(0L, ms / 1000L);
        long h = total / 3600, m = (total % 3600) / 60, sec = total % 60;
        return h > 0
            ? String.format(java.util.Locale.US, "%d:%02d:%02d", h, m, sec)
            : String.format(java.util.Locale.US, "%d:%02d", m, sec);
    }

    /** The mihrab's arch, gold, with headphones, the sound moving, or a broadcast inside. */
    private static Bitmap arch(Context context, boolean playing, boolean live, boolean dark) {
        float d = context.getResources().getDisplayMetrics().density;
        int w = Math.round(40 * d), h = Math.round(48 * d);
        Bitmap bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        int gold = dark ? 0xFFFFE8B0 : 0xFF9A7326;
        float inset = 1.2f * d;
        float left = inset, right = w - inset, top = inset, bottom = h - inset;
        float shoulder = top + (bottom - top) * 0.38f;
        Path path = new Path();
        path.moveTo(left, bottom);
        path.lineTo(left, shoulder);
        path.quadTo(left, top + (bottom - top) * 0.08f, w / 2f, top);
        path.quadTo(right, top + (bottom - top) * 0.08f, right, shoulder);
        path.lineTo(right, bottom);
        path.close();

        Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        fill.setShader(new LinearGradient(0, top, 0, bottom, (gold & 0x00FFFFFF) | 0x47000000, (gold & 0x00FFFFFF) | 0x0F000000, Shader.TileMode.CLAMP));
        canvas.drawPath(path, fill);
        Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeWidth(1.2f * d);
        stroke.setColor((gold & 0x00FFFFFF) | 0xA6000000);
        canvas.drawPath(path, stroke);

        Paint ink = new Paint(Paint.ANTI_ALIAS_FLAG);
        ink.setColor(gold);
        ink.setStrokeCap(Paint.Cap.ROUND);
        float cx = w / 2f, cy = h * 0.6f;
        if (live) {
            // A broadcast: a dot and two arcs on each side.
            canvas.drawCircle(cx, cy, 2.4f * d, ink);
            ink.setStyle(Paint.Style.STROKE);
            ink.setStrokeWidth(1.6f * d);
            for (int i = 1; i <= 2; i++) {
                float r = (4.5f + i * 3.5f) * d;
                android.graphics.RectF oval = new android.graphics.RectF(cx - r, cy - r, cx + r, cy + r);
                canvas.drawArc(oval, -40, 80, false, ink);
                canvas.drawArc(oval, 140, 80, false, ink);
            }
        } else if (playing) {
            // The sound moving: five bars.
            ink.setStrokeWidth(2.2f * d);
            float[] heights = { 0.35f, 0.7f, 1f, 0.6f, 0.4f };
            float gap = 4.2f * d, full = 14f * d;
            for (int i = 0; i < heights.length; i++) {
                float x = cx + (i - 2) * gap;
                float half = full * heights[i] / 2f;
                canvas.drawLine(x, cy - half, x, cy + half, ink);
            }
        } else {
            // Headphones.
            ink.setStyle(Paint.Style.STROKE);
            ink.setStrokeWidth(1.8f * d);
            float r = 7.5f * d;
            canvas.drawArc(new android.graphics.RectF(cx - r, cy - r - 1 * d, cx + r, cy + r - 1 * d), 180, 180, false, ink);
            ink.setStyle(Paint.Style.FILL);
            canvas.drawRoundRect(new android.graphics.RectF(cx - r - 1.6f * d, cy, cx - r + 2.6f * d, cy + 7 * d), 1.5f * d, 1.5f * d, ink);
            canvas.drawRoundRect(new android.graphics.RectF(cx + r - 2.6f * d, cy, cx + r + 1.6f * d, cy + 7 * d), 1.5f * d, 1.5f * d, ink);
        }
        return bitmap;
    }
}
