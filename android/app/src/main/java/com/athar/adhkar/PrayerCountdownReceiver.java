package com.athar.adhkar;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Moves the prayer countdown on at the adhan, and remembers when the person swipes it away. */
public class PrayerCountdownReceiver extends BroadcastReceiver {

    static final String ACTION_ADVANCE = "com.athar.adhkar.PRAYER_COUNTDOWN_ADVANCE";
    static final String ACTION_DISMISSED = "com.athar.adhkar.PRAYER_COUNTDOWN_DISMISSED";
    static final String EXTRA_AT = "at";
    static final String EXTRA_FOLLOWING_NAME = "followingNameAr";
    static final String EXTRA_FOLLOWING_AT = "followingAt";
    static final String EXTRA_HEADLINE = "headline";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        long at = intent.getLongExtra(EXTRA_AT, 0);
        if (ACTION_DISMISSED.equals(intent.getAction())) {
            PrayerCountdown.markDismissed(context, at);
            return;
        }
        if (ACTION_ADVANCE.equals(intent.getAction())) {
            String followingName = intent.getStringExtra(EXTRA_FOLLOWING_NAME);
            long followingAt = intent.getLongExtra(EXTRA_FOLLOWING_AT, 0);
            if (followingName == null || followingAt <= System.currentTimeMillis()) {
                PrayerCountdown.hide(context);
                return;
            }
            // The prayer after that is not known until the app opens again.
            // In Ramadan the next one (iftar or the end of suhoor) keeps the Ramadan headline.
            String headline = intent.getStringExtra(EXTRA_HEADLINE);
            PrayerCountdown.show(context, new PrayerCountdown.State(followingName, followingAt, null, 0, headline, null));
        }
    }
}
