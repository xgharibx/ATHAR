package com.athar.adhkar;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

/** The full-screen Stop screen over the lock screen while the Adhan alarm rings. */
public class AdhanAlarmActivity extends Activity {
    static final String ACTION_FINISH = "com.athar.adhkar.ADHAN_ALARM_FINISH";

    private final BroadcastReceiver finish = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            finish();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        String title = getIntent().getStringExtra(AdhanAlarm.EXTRA_TITLE);
        if (title == null || title.isEmpty()) title = "حان وقت الصلاة";
        float density = getResources().getDisplayMetrics().density;

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#0F1F15"));
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        int pad = (int) (32 * density);
        root.setPadding(pad, pad, pad, pad);

        TextView brand = new TextView(this);
        brand.setText("أثر");
        brand.setTextColor(Color.parseColor("#D8B46A"));
        brand.setTextSize(22);
        brand.setGravity(Gravity.CENTER);
        root.addView(brand);

        TextView heading = new TextView(this);
        heading.setText(title);
        heading.setTextColor(Color.WHITE);
        heading.setTextSize(30);
        heading.setTypeface(Typeface.DEFAULT_BOLD);
        heading.setGravity(Gravity.CENTER);
        heading.setPadding(0, (int) (24 * density), 0, (int) (12 * density));
        root.addView(heading);

        TextView verse = new TextView(this);
        verse.setText("﴿ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا ﴾");
        verse.setTextColor(Color.parseColor("#CCFFFFFF"));
        verse.setTextSize(16);
        verse.setGravity(Gravity.CENTER);
        root.addView(verse);

        Button stop = new Button(this);
        stop.setText(R.string.adhan_alarm_stop);
        stop.setTextSize(20);
        stop.setTextColor(Color.parseColor("#0F1F15"));
        stop.setAllCaps(false);
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(Color.parseColor("#D8B46A"));
        shape.setCornerRadius(32 * density);
        stop.setBackground(shape);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, (int) (64 * density));
        params.topMargin = (int) (48 * density);
        stop.setLayoutParams(params);
        stop.setOnClickListener(view -> {
            startService(new Intent(this, AdhanAlarmService.class).setAction(AdhanAlarmService.ACTION_STOP));
            finish();
        });
        root.addView(stop);

        setContentView(root);
        ContextCompat.registerReceiver(this, finish, new IntentFilter(ACTION_FINISH), ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    protected void onDestroy() {
        unregisterReceiver(finish);
        super.onDestroy();
    }
}
