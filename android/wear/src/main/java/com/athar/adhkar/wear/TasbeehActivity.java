package com.athar.adhkar.wear;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.google.android.gms.wearable.DataItem;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.Wearable;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.Locale;

/**
 * The tasbeeh on the wrist. Tap anywhere — or turn the crown or bezel — to
 * count, with a tick at each count and a longer buzz at the target, when it
 * moves to the next phrase (the same four phrases and targets as the phone's
 * tasbeeh widget). Long-press to reset. The next prayer, sent by the phone,
 * shows at the top. Counts go back to the phone's tasbeeh statistics.
 */
public class TasbeehActivity extends Activity {
    static final String[] PHRASES = {"سُبْحَانَ اللَّهِ", "الحَمْدُ لِلَّهِ", "اللَّهُ أَكْبَر", "لا إِلَهَ إِلَّا اللَّه"};
    static final int[] TARGETS = {33, 33, 33, 100};
    static final String PRAYER_PATH = "/athar/prayer";
    static final String TASBEEH_PATH = "/athar/tasbeeh";

    private static final String PREFS = "athar_wear_tasbeeh";
    private static final String GOLD = "#E2BD6B";

    private SharedPreferences prefs;
    private TextView prayerView;
    private TextView phraseView;
    private TextView countView;
    private TextView targetView;
    private float rotary;
    private String prayerJson;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        prayerJson = PrayerStore.load(this);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.BLACK);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        prayerView = text(13, Color.parseColor(GOLD), false);
        phraseView = text(17, Color.WHITE, true);
        countView = text(44, Color.WHITE, true);
        targetView = text(13, Color.parseColor("#99FFFFFF"), false);
        TextView next = text(13, Color.parseColor(GOLD), false);
        next.setText(R.string.next_phrase);
        next.setPadding(24, 16, 24, 8);
        next.setOnClickListener(view -> nextPhrase());

        root.addView(prayerView);
        root.addView(phraseView);
        root.addView(countView);
        root.addView(targetView);
        root.addView(next);

        root.setOnClickListener(view -> count());
        root.setOnLongClickListener(view -> {
            reset();
            return true;
        });
        setContentView(root);
        root.requestFocus();
        render();
    }

    private TextView text(float size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setGravity(Gravity.CENTER);
        if (bold) view.setTypeface(Typeface.DEFAULT_BOLD);
        return view;
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadPrayerFromPhone();
    }

    @Override
    protected void onPause() {
        super.onPause();
        sendCountsToPhone();
    }

    /** The crown or bezel counts too, one detent at a time. */
    @Override
    public boolean onGenericMotionEvent(MotionEvent event) {
        if (event.getAction() == MotionEvent.ACTION_SCROLL && event.isFromSource(InputDevice.SOURCE_ROTARY_ENCODER)) {
            float delta = -event.getAxisValue(MotionEvent.AXIS_SCROLL)
                * ViewConfiguration.get(this).getScaledVerticalScrollFactor();
            rotary += Math.abs(delta);
            // About one count per crown detent.
            while (rotary >= 48f) {
                rotary -= 48f;
                count();
            }
            return true;
        }
        return super.onGenericMotionEvent(event);
    }

    static String today() {
        Calendar now = Calendar.getInstance();
        return String.format(Locale.US, "%04d-%02d-%02d",
            now.get(Calendar.YEAR), now.get(Calendar.MONTH) + 1, now.get(Calendar.DAY_OF_MONTH));
    }

    /** A new day starts again from the first phrase. */
    private void newDayCheck() {
        if (!today().equals(prefs.getString("day", ""))) {
            prefs.edit().putString("day", today()).putInt("index", 0).putInt("count", 0).apply();
        }
    }

    private void count() {
        newDayCheck();
        int index = prefs.getInt("index", 0);
        int count = prefs.getInt("count", 0) + 1;
        String phrase = PHRASES[index];
        // Waiting for the phone: { "YYYY-MM-DD|phrase": n }.
        String key = "pending:" + today() + "|" + phrase;
        prefs.edit().putInt(key, prefs.getInt(key, 0) + 1).apply();
        if (count >= TARGETS[index]) {
            buzz(true);
            prefs.edit().putInt("index", (index + 1) % PHRASES.length).putInt("count", 0).apply();
        } else {
            buzz(false);
            prefs.edit().putInt("count", count).apply();
        }
        render();
    }

    private void nextPhrase() {
        newDayCheck();
        prefs.edit().putInt("index", (prefs.getInt("index", 0) + 1) % PHRASES.length).putInt("count", 0).apply();
        render();
    }

    private void reset() {
        prefs.edit().putInt("count", 0).apply();
        Toast.makeText(this, R.string.reset_done, Toast.LENGTH_SHORT).show();
        render();
    }

    private void buzz(boolean target) {
        Vibrator vibrator = getSystemService(Vibrator.class);
        if (vibrator == null || !vibrator.hasVibrator()) return;
        vibrator.vibrate(target
            ? VibrationEffect.createWaveform(new long[] {0, 120, 80, 120}, -1)
            : VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK));
    }

    private void render() {
        newDayCheck();
        int index = prefs.getInt("index", 0);
        phraseView.setText(PHRASES[index]);
        countView.setText(arabicDigits(String.valueOf(prefs.getInt("count", 0))));
        targetView.setText(getString(R.string.of_target, TARGETS[index]));
        String[] next = NextPrayer.find(prayerJson);
        prayerView.setText(next == null ? "أثر" : next[0] + " " + next[1]);
    }

    static String arabicDigits(String latin) {
        StringBuilder out = new StringBuilder();
        for (char c : latin.toCharArray()) out.append(Character.isDigit(c) ? (char) ('٠' + (c - '0')) : c);
        return out.toString();
    }

    /** The prayer times the phone last sent (WearSync on the phone). */
    private void loadPrayerFromPhone() {
        Uri uri = new Uri.Builder().scheme("wear").path(PRAYER_PATH).build();
        Wearable.getDataClient(this).getDataItems(uri).addOnSuccessListener(items -> {
            for (DataItem item : items) {
                String json = DataMapItem.fromDataItem(item).getDataMap().getString("json");
                if (json != null) {
                    prayerJson = json;
                    PrayerStore.save(this, json);
                }
            }
            items.release();
            render();
        });
    }

    /** Counts made on the watch join the phone's tasbeeh statistics. */
    private void sendCountsToPhone() {
        try {
            JSONObject counts = new JSONObject();
            for (String key : prefs.getAll().keySet()) {
                if (key.startsWith("pending:")) counts.put(key.substring("pending:".length()), prefs.getInt(key, 0));
            }
            if (counts.length() == 0) return;
            byte[] payload = counts.toString().getBytes(StandardCharsets.UTF_8);
            Wearable.getNodeClient(this).getConnectedNodes().addOnSuccessListener(nodes -> {
                for (Node node : nodes) {
                    Wearable.getMessageClient(this).sendMessage(node.getId(), TASBEEH_PATH, payload)
                        .addOnSuccessListener(id -> clearSent(counts));
                }
            });
        } catch (Exception ignored) {
            // Kept for the next time.
        }
    }

    private void clearSent(JSONObject sent) {
        SharedPreferences.Editor editor = prefs.edit();
        JSONArray names = sent.names();
        for (int i = 0; names != null && i < names.length(); i++) {
            String key = "pending:" + names.optString(i);
            int left = prefs.getInt(key, 0) - sent.optInt(names.optString(i), 0);
            if (left > 0) editor.putInt(key, left);
            else editor.remove(key);
        }
        editor.apply();
    }
}
