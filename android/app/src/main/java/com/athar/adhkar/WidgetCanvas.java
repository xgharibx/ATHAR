package com.athar.adhkar;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.SweepGradient;

import java.util.Calendar;
import java.util.Random;

/**
 * Runtime Canvas renderer for widget art.
 *
 * RemoteViews can't draw arcs or gradients dynamically — but it CAN display
 * bitmaps. So we paint gradient progress rings, glowing bars, and soft halos
 * here and ship them to the widget via setImageViewBitmap(). This is what
 * lifts the widgets from "list of TextViews" to something with real depth.
 */
public final class WidgetCanvas {

    // Athar palette
    private static final int GOLD_LIGHT = 0xFFF6DFA4;
    private static final int GOLD       = 0xFFE9C36A;
    private static final int GOLD_DEEP  = 0xFFC9973C;
    private static final int TRACK_DARK  = 0x22FFFFFF;
    private static final int TRACK_LIGHT = 0x22000000;
    private static final int GLOW_GOLD  = 0x55E9C36A;

    /** The unfilled "track" portion of a ring/bar/dial is a low-alpha tint
     *  of the background it sits on — white-based reads as a dim highlight
     *  on the dark palette, but the same white would nearly vanish (or read
     *  as a stray glow) against a light sky, so it needs a dark-based tint
     *  there instead. */
    private static int trackColor(Context ctx) {
        return isDarkTheme(ctx) ? TRACK_DARK : TRACK_LIGHT;
    }

    // ── Sky phases — same anchor colors as the original static
    // widget_bg_sky_*.xml drawables, kept here so sky() can LERP between
    // them instead of jumping between 5 fixed images. {start, center, end,
    // glow (ARGB, alpha baked in), stroke (ARGB, alpha baked in)}
    public static final int PHASE_FAJR = 0, PHASE_DHUHR = 1, PHASE_ASR = 2, PHASE_MAGHRIB = 3, PHASE_ISHA = 4;
    private static final int[][] PHASE_COLORS = {
        { 0xFF2A2C55, 0xFF1B2E3E, 0xFF081611, 0x1EC2A8FF, 0x3DAFB4FF }, // Fajr
        { 0xFF1B5A3C, 0xFF0F3A26, 0xFF081B12, 0x26FFF2C0, 0x42F0D68A }, // Dhuhr
        { 0xFF4A3D1E, 0xFF2A2E18, 0xFF0B160E, 0x2EF6DFA4, 0x47EAC98A }, // Asr
        { 0xFF5C2A1A, 0xFF33201E, 0xFF0B1014, 0x33FFB27A, 0x47FFB27A }, // Maghrib
        { 0xFF1A2140, 0xFF101830, 0xFF070B18, 0x1FAFB8FF, 0x3D9BA8E8 }, // Isha
    };

    // ── Light-theme sky — same 5-phase story (dawn/midday/afternoon/
    // sunset/twilight), reworked into bright, paper-toned colors instead of
    // just dimming the dark set. Widgets must follow the system's day/night
    // setting (Android widget quality guideline WC-2), not the local time of
    // day — a user in light mode at night still gets a light widget, so Isha
    // here is a soft dusk-grey rather than the dark set's near-black.
    private static final int[][] PHASE_COLORS_LIGHT = {
        { 0xFFFFF1E6, 0xFFFFE0D0, 0xFFFAC9B8, 0x2EFFFFFF, 0x40E8A98C }, // Fajr — dawn peach
        { 0xFFEAF6FF, 0xFFD8EEFF, 0xFFC3E4FA, 0x30FFFFFF, 0x4098C4E0 }, // Dhuhr — bright sky blue
        { 0xFFFFF6DE, 0xFFFFEAB8, 0xFFFAD98A, 0x2EFFFFFF, 0x40D9A94A }, // Asr — golden afternoon
        { 0xFFFFE7D6, 0xFFFFCFAE, 0xFFF7AE85, 0x2EFFFFFF, 0x40E08A5C }, // Maghrib — sunset coral
        { 0xFFE7EBF5, 0xFFD4DAEC, 0xFFBFC7E0, 0x1EFFFFFF, 0x40A6AECE }, // Isha — twilight grey-blue
    };

    /** True when the device is currently in system dark mode. Widgets must
     *  track this, not local time of day — see PHASE_COLORS_LIGHT. */
    public static boolean isDarkTheme(Context ctx) {
        int mode = ctx.getResources().getConfiguration().uiMode
            & android.content.res.Configuration.UI_MODE_NIGHT_MASK;
        return mode == android.content.res.Configuration.UI_MODE_NIGHT_YES;
    }

    /** Outer widget corner radius, in dp — resolves to the system/OEM
     *  radius on API 31+ (quality guideline WS-2: match the launcher's own
     *  rounding instead of a hardcoded guess) via values-v31/dimens.xml,
     *  falling back to the original 26dp on older devices where that
     *  system resource doesn't exist. Callers pass this to sky() instead
     *  of a literal corner radius. */
    public static float outerCornerRadiusDp(Context ctx) {
        float px = ctx.getResources().getDimension(R.dimen.widget_corner_radius);
        return px / ctx.getResources().getDisplayMetrics().density;
    }

    /** LERP two ARGB colors (alpha included) by t ∈ [0,1]. */
    private static int lerpColor(int a, int b, float t) {
        t = Math.max(0f, Math.min(1f, t));
        int aa = (a >>> 24) & 0xFF, ar = (a >>> 16) & 0xFF, ag = (a >>> 8) & 0xFF, ab = a & 0xFF;
        int ba = (b >>> 24) & 0xFF, br = (b >>> 16) & 0xFF, bg = (b >>> 8) & 0xFF, bb = b & 0xFF;
        int ra = (int) (aa + (ba - aa) * t), rr = (int) (ar + (br - ar) * t);
        int rg = (int) (ag + (bg - ag) * t), rb = (int) (ab + (bb - ab) * t);
        return (ra << 24) | (rr << 16) | (rg << 8) | rb;
    }

    /** Wall-clock-derived sky phase, for widgets that aren't tied to the
     *  day's actual (geolocation-based) prayer schedule — Adhkar/Wird/
     *  Tasbeeh still deserve a living background, just anchored to
     *  approximate dawn/day/afternoon/sunset/night buckets instead. */
    public static final class ClockSky {
        public final int fromPhase, toPhase;
        public final float blend;
        ClockSky(int fromPhase, int toPhase, float blend) {
            this.fromPhase = fromPhase;
            this.toPhase = toPhase;
            this.blend = blend;
        }
        public boolean isNight() {
            return fromPhase == PHASE_FAJR || fromPhase == PHASE_ISHA
                || toPhase == PHASE_FAJR || toPhase == PHASE_ISHA;
        }
    }

    private static final int[][] CLOCK_BOUNDS = {
        { 4 * 60, PHASE_FAJR },
        { 6 * 60, PHASE_DHUHR },
        { 15 * 60, PHASE_ASR },
        { 18 * 60, PHASE_MAGHRIB },
        { 19 * 60 + 30, PHASE_ISHA },
    };

    public static ClockSky clockPhase() {
        Calendar cal = Calendar.getInstance();
        int nowMin = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE);
        int idx = 0;
        for (int i = 0; i < CLOCK_BOUNDS.length; i++) {
            if (nowMin >= CLOCK_BOUNDS[i][0]) idx = i;
        }
        int fromPhase = CLOCK_BOUNDS[idx][1];
        int toPhase = CLOCK_BOUNDS[(idx + 1) % CLOCK_BOUNDS.length][1];
        int startMin = CLOCK_BOUNDS[idx][0];
        int endMin = CLOCK_BOUNDS[(idx + 1) % CLOCK_BOUNDS.length][0];
        if (endMin <= startMin) endMin += 24 * 60; // wraps past midnight
        int adjNow = nowMin < startMin ? nowMin + 24 * 60 : nowMin;
        float blend = Math.max(0f, Math.min(1f, (adjNow - startMin) / (float) Math.max(1, endMin - startMin)));
        return new ClockSky(fromPhase, toPhase, blend);
    }

    private WidgetCanvas() {}

    private static float dp(Context ctx, float dp) {
        return dp * ctx.getResources().getDisplayMetrics().density;
    }

    /**
     * Circular progress ring with a gold sweep gradient, rounded caps and a
     * soft outer glow. Transparent center — layer text on top of it.
     *
     * @param progress 0..1
     */
    public static Bitmap ring(Context ctx, int sizeDp, float strokeDp, float progress) {
        int px = Math.max(48, (int) dp(ctx, sizeDp));
        float stroke = dp(ctx, strokeDp);
        Bitmap bmp = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);

        float pad = stroke / 2f + dp(ctx, 3);
        RectF box = new RectF(pad, pad, px - pad, px - pad);
        float clamped = Math.max(0f, Math.min(1f, progress));

        // Track
        Paint track = new Paint(Paint.ANTI_ALIAS_FLAG);
        track.setStyle(Paint.Style.STROKE);
        track.setStrokeWidth(stroke);
        track.setColor(trackColor(ctx));
        c.drawArc(box, 0, 360, false, track);

        if (clamped <= 0f) return bmp;

        // Glow pass (wider, translucent) then crisp gradient sweep.
        // Start at 12 o'clock: rotate the canvas -90°.
        c.save();
        c.rotate(-90f, px / 2f, px / 2f);

        Paint glow = new Paint(Paint.ANTI_ALIAS_FLAG);
        glow.setStyle(Paint.Style.STROKE);
        glow.setStrokeCap(Paint.Cap.ROUND);
        glow.setStrokeWidth(stroke * 2.1f);
        glow.setColor(GLOW_GOLD);
        glow.setMaskFilter(new android.graphics.BlurMaskFilter(stroke, android.graphics.BlurMaskFilter.Blur.NORMAL));
        c.drawArc(box, 0, 360f * clamped, false, glow);

        Paint arc = new Paint(Paint.ANTI_ALIAS_FLAG);
        arc.setStyle(Paint.Style.STROKE);
        arc.setStrokeCap(Paint.Cap.ROUND);
        arc.setStrokeWidth(stroke);
        int[] colors = { GOLD_DEEP, GOLD, GOLD_LIGHT, GOLD_LIGHT };
        float[] stops = { 0f, 0.45f, 0.9f, 1f };
        arc.setShader(new SweepGradient(px / 2f, px / 2f, colors, stops));
        c.drawArc(box, 0, 360f * clamped, false, arc);

        c.restore();
        return bmp;
    }

    /**
     * A dial with tick marks and a gold needle pointing at `bearingDeg`
     * (0° = up/North, clockwise) — the Qibla widget's static compass tile.
     */
    public static Bitmap compassArrow(Context ctx, int sizeDp, float bearingDeg) {
        int px = Math.max(48, (int) dp(ctx, sizeDp));
        Bitmap bmp = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        float cx = px / 2f, cy = px / 2f;
        float radius = px / 2f - dp(ctx, 4);

        Paint dial = new Paint(Paint.ANTI_ALIAS_FLAG);
        dial.setStyle(Paint.Style.STROKE);
        dial.setStrokeWidth(dp(ctx, 1.5f));
        dial.setColor(trackColor(ctx));
        c.drawCircle(cx, cy, radius, dial);

        // Tick marks every 30°
        Paint tick = new Paint(Paint.ANTI_ALIAS_FLAG);
        tick.setColor(trackColor(ctx));
        tick.setStrokeWidth(dp(ctx, 1.5f));
        for (int deg = 0; deg < 360; deg += 30) {
            double rad = Math.toRadians(deg - 90);
            float x1 = cx + (float) Math.cos(rad) * (radius - dp(ctx, 4));
            float y1 = cy + (float) Math.sin(rad) * (radius - dp(ctx, 4));
            float x2 = cx + (float) Math.cos(rad) * radius;
            float y2 = cy + (float) Math.sin(rad) * radius;
            c.drawLine(x1, y1, x2, y2, tick);
        }

        c.save();
        c.rotate(bearingDeg, cx, cy);

        float needleLen = radius - dp(ctx, 6);
        Paint glow = new Paint(Paint.ANTI_ALIAS_FLAG);
        glow.setColor(GLOW_GOLD);
        glow.setStyle(Paint.Style.STROKE);
        glow.setStrokeWidth(dp(ctx, 5f));
        glow.setStrokeCap(Paint.Cap.ROUND);
        glow.setMaskFilter(new BlurMaskFilter(dp(ctx, 4f), BlurMaskFilter.Blur.NORMAL));
        c.drawLine(cx, cy, cx, cy - needleLen, glow);

        Paint needle = new Paint(Paint.ANTI_ALIAS_FLAG);
        needle.setShader(new LinearGradient(cx, cy, cx, cy - needleLen, GOLD_DEEP, GOLD_LIGHT, Shader.TileMode.CLAMP));
        needle.setStyle(Paint.Style.STROKE);
        needle.setStrokeWidth(dp(ctx, 3f));
        needle.setStrokeCap(Paint.Cap.ROUND);
        c.drawLine(cx, cy, cx, cy - needleLen, needle);

        Paint tip = new Paint(Paint.ANTI_ALIAS_FLAG);
        tip.setColor(GOLD_LIGHT);
        c.drawCircle(cx, cy - needleLen, dp(ctx, 3f), tip);
        c.restore();

        Paint hub = new Paint(Paint.ANTI_ALIAS_FLAG);
        hub.setColor(GOLD);
        c.drawCircle(cx, cy, dp(ctx, 3.5f), hub);

        return bmp;
    }

    /**
     * Rounded horizontal progress bar with a gradient fill and soft glow.
     * Direction is RTL (fills from the right) to match the app.
     *
     * @param startColor gradient start (right side)
     * @param endColor   gradient end (left side)
     */
    public static Bitmap bar(Context ctx, int widthDp, int heightDp, float progress,
                             int startColor, int endColor) {
        int w = Math.max(48, (int) dp(ctx, widthDp));
        int h = Math.max(8, (int) dp(ctx, heightDp));
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        float r = h / 2f;
        float clamped = Math.max(0f, Math.min(1f, progress));

        Paint track = new Paint(Paint.ANTI_ALIAS_FLAG);
        track.setColor(trackColor(ctx));
        c.drawRoundRect(new RectF(0, 0, w, h), r, r, track);

        if (clamped <= 0f) return bmp;

        float fillW = Math.max(h, w * clamped);
        RectF fill = new RectF(w - fillW, 0, w, h); // RTL: anchor right

        Paint glow = new Paint(Paint.ANTI_ALIAS_FLAG);
        glow.setColor((startColor & 0x00FFFFFF) | 0x55000000);
        glow.setMaskFilter(new android.graphics.BlurMaskFilter(r, android.graphics.BlurMaskFilter.Blur.NORMAL));
        c.drawRoundRect(fill, r, r, glow);

        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setShader(new LinearGradient(fill.right, 0, fill.left, 0, startColor, endColor, Shader.TileMode.CLAMP));
        c.drawRoundRect(fill, r, r, p);

        // Top highlight for a subtle glassy depth
        Paint gloss = new Paint(Paint.ANTI_ALIAS_FLAG);
        gloss.setShader(new LinearGradient(0, 0, 0, h, 0x40FFFFFF, 0x00FFFFFF, Shader.TileMode.CLAMP));
        c.drawRoundRect(fill, r, r, gloss);
        return bmp;
    }

    /**
     * The widget's whole background: a live sky, not a flat fill. Where the
     * old design picked one of 5 static drawables and jumped between them
     * the instant the "next prayer" changed, this continuously LERPs every
     * channel — base gradient, horizon glow, border — between the current
     * and next phase using the same interval-progress fraction that already
     * drives the countdown ring. The sky is a different shade every time the
     * widget refreshes, tracking real elapsed time instead of 5 hard cuts.
     * A light grain pass on top keeps it from reading as a flat color fill.
     *
     * @param fromPhase PHASE_* the widget is currently in (the prayer just passed)
     * @param toPhase   PHASE_* being counted down to
     * @param blend     0..1, how far through the interval (same as the ring's progress)
     */
    public static Bitmap sky(Context ctx, int widthDp, int heightDp, int fromPhase, int toPhase, float blend, float cornerRadiusDp) {
        return sky(ctx, widthDp, heightDp, fromPhase, toPhase, blend, cornerRadiusDp, isDarkTheme(ctx));
    }

    /** Same as {@link #sky(Context, int, int, int, int, float, float)} but lets
     *  the caller pass the theme explicitly (e.g. when it's already resolved
     *  isDarkTheme() once for the same update pass, to avoid reading
     *  Configuration twice). */
    public static Bitmap sky(Context ctx, int widthDp, int heightDp, int fromPhase, int toPhase, float blend, float cornerRadiusDp, boolean dark) {
        int w = Math.max(48, (int) dp(ctx, widthDp));
        int h = Math.max(48, (int) dp(ctx, heightDp));
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        float r = dp(ctx, cornerRadiusDp);
        RectF rect = new RectF(0.5f, 0.5f, w - 0.5f, h - 0.5f);

        int[][] palette = dark ? PHASE_COLORS : PHASE_COLORS_LIGHT;
        int[] from = palette[fromPhase];
        int[] to = palette[toPhase];
        int start = lerpColor(from[0], to[0], blend);
        int center = lerpColor(from[1], to[1], blend);
        int end = lerpColor(from[2], to[2], blend);
        int glow = lerpColor(from[3], to[3], blend);
        int strokeCol = lerpColor(from[4], to[4], blend);

        // Base 3-stop vertical sky gradient.
        Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
        bg.setShader(new LinearGradient(0, 0, 0, h, new int[]{start, center, end}, new float[]{0f, 0.45f, 1f}, Shader.TileMode.CLAMP));
        c.drawRoundRect(rect, r, r, bg);

        // Soft horizon-glow band near the top.
        Paint glowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        glowPaint.setShader(new LinearGradient(0, 0, 0, h * 0.62f, glow, glow & 0x00FFFFFF, Shader.TileMode.CLAMP));
        c.drawRoundRect(rect, r, r, glowPaint);

        // Fine grain — a flat gradient fill reads as digital/plastic; a
        // scatter of near-invisible light/dark specks reads as atmosphere.
        // Fixed seed: only the sky's colors should change between updates,
        // not the grain pattern re-rolling and looking like static.
        Random grainRnd = new Random(7);
        Paint grain = new Paint(Paint.ANTI_ALIAS_FLAG);
        int grainCount = Math.min(500, (w * h) / 1100);
        for (int i = 0; i < grainCount; i++) {
            float x = grainRnd.nextFloat() * w;
            float y = grainRnd.nextFloat() * h;
            boolean light = grainRnd.nextBoolean();
            int alpha = 5 + grainRnd.nextInt(9);
            grain.setColor((alpha << 24) | (light ? 0x00FFFFFF : 0x00000000));
            c.drawCircle(x, y, dp(ctx, 0.5f), grain);
        }

        // Hairline border, same hue family as the glow.
        Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeWidth(dp(ctx, 1f));
        stroke.setColor(strokeCol);
        c.drawRoundRect(rect, r, r, stroke);

        return bmp;
    }

    /**
     * Procedural starfield, matching the in-app NoorStarfield's warm-gold
     * palette (#ffd780). RemoteViews can't run a real-time animation loop —
     * there's no requestAnimationFrame equivalent, and a continuously
     * redrawing widget would drain battery, which the platform actively
     * discourages. Instead: each widget refresh reseeds the star positions
     * (same technique classic screensavers used), so the sky visibly shifts
     * from update to update rather than sitting static forever.
     *
     * @param seed vary per-refresh (e.g. System.currentTimeMillis() / update
     *             interval) so the pattern changes on each real update but
     *             stays stable within a single render.
     */
    public static Bitmap starfield(Context ctx, int widthDp, int heightDp, int starCount, long seed) {
        int w = Math.max(48, (int) dp(ctx, widthDp));
        int h = Math.max(48, (int) dp(ctx, heightDp));
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Random rnd = new Random(seed);

        Paint star = new Paint(Paint.ANTI_ALIAS_FLAG);
        Paint glow = new Paint(Paint.ANTI_ALIAS_FLAG);
        glow.setMaskFilter(new BlurMaskFilter(dp(ctx, 2.5f), BlurMaskFilter.Blur.NORMAL));

        for (int i = 0; i < starCount; i++) {
            float x = rnd.nextFloat() * w;
            float y = rnd.nextFloat() * h;
            // Most stars are tiny and dim; a few are bigger "hero" stars with
            // a soft glow — same distribution the CSS starfield uses so the
            // widget reads as part of the same sky, not a different asset.
            boolean hero = rnd.nextFloat() < 0.12f;
            float r = hero ? dp(ctx, 1.4f + rnd.nextFloat() * 1.0f) : dp(ctx, 0.5f + rnd.nextFloat() * 0.6f);
            int alpha = hero ? (140 + rnd.nextInt(90)) : (40 + rnd.nextInt(90));
            int color = (GOLD_LIGHT & 0x00FFFFFF) | (alpha << 24);

            if (hero) {
                glow.setColor((GOLD & 0x00FFFFFF) | ((alpha / 3) << 24));
                c.drawCircle(x, y, r * 2.2f, glow);
            }
            star.setColor(color);
            c.drawCircle(x, y, r, star);
        }
        return bmp;
    }

    /** Gold sunrise bar (morning adhkar). */
    public static Bitmap barGold(Context ctx, int widthDp, int heightDp, float progress) {
        return bar(ctx, widthDp, heightDp, progress, 0xFFF2CD88, 0xFFC98F3C);
    }

    /** Indigo dusk bar (evening adhkar). */
    public static Bitmap barDusk(Context ctx, int widthDp, int heightDp, float progress) {
        return bar(ctx, widthDp, heightDp, progress, 0xFF9BB0FF, 0xFF5D6BC0);
    }

    /** Emerald bar (quran wird). */
    public static Bitmap barEmerald(Context ctx, int widthDp, int heightDp, float progress) {
        return bar(ctx, widthDp, heightDp, progress, 0xFF8FE3B0, 0xFF2F9E64);
    }
}
