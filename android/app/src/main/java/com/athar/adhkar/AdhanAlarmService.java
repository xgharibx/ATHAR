package com.athar.adhkar;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Plays the Adhan as an alarm sound — heard on silent and Do Not Disturb,
 * at the alarm volume — with a full-screen Stop screen over the lock screen
 * (AdhanAlarmActivity) and a Stop button on the notification.
 */
public class AdhanAlarmService extends Service {
    static final String ACTION_START = "com.athar.adhkar.ADHAN_ALARM_START";
    static final String ACTION_STOP = "com.athar.adhkar.ADHAN_ALARM_STOP";
    static final String CHANNEL_ID = "athar-adhan-alarm-v1";
    private static final int NOTIFICATION_ID = 7311;
    /** Never ring for longer than the Adhan itself plus a margin. */
    private static final long MAX_RING_MS = 5 * 60_000L;

    private MediaPlayer player;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            stopRinging();
            return START_NOT_STICKY;
        }
        String title = intent.getStringExtra(AdhanAlarm.EXTRA_TITLE);
        if (title == null || title.isEmpty()) title = "حان وقت الصلاة";
        String sound = intent.getStringExtra(AdhanAlarm.EXTRA_SOUND);

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification(this, title), type);
        play(sound);
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(this::stopRinging, MAX_RING_MS);
        return START_NOT_STICKY;
    }

    private void play(String sound) {
        releasePlayer();
        int resource = sound == null ? 0 : getResources().getIdentifier(sound, "raw", getPackageName());
        if (resource == 0) resource = R.raw.adhan_ahmad_al_nafees;
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build());
            player.setDataSource(this, Uri.parse("android.resource://" + getPackageName() + "/" + resource));
            player.setOnCompletionListener(done -> stopRinging());
            player.prepare();
            player.start();
        } catch (Exception e) {
            stopRinging();
        }
    }

    private void releasePlayer() {
        if (player == null) return;
        try {
            player.stop();
        } catch (IllegalStateException ignored) {
            // Not started.
        }
        player.release();
        player = null;
    }

    private void stopRinging() {
        handler.removeCallbacksAndMessages(null);
        releasePlayer();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
        sendBroadcast(new Intent(AdhanAlarmActivity.ACTION_FINISH).setPackage(getPackageName()));
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        releasePlayer();
        super.onDestroy();
    }

    static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID,
            context.getString(R.string.adhan_alarm_channel), NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(context.getString(R.string.adhan_alarm_channel_description));
        // The service plays the Adhan; the notification itself is silent.
        channel.setSound(null, null);
        channel.setBypassDnd(true);
        manager.createNotificationChannel(channel);
    }

    private static Notification notification(Context context, String title) {
        ensureChannel(context);
        Intent screen = new Intent(context, AdhanAlarmActivity.class)
            .putExtra(AdhanAlarm.EXTRA_TITLE, title)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent full = PendingIntent.getActivity(context, NOTIFICATION_ID, screen,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(context, NOTIFICATION_ID,
            new Intent(context, AdhanAlarmService.class).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_athar_notification)
            .setContentTitle(title)
            .setContentText(context.getString(R.string.adhan_alarm_text))
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setContentIntent(full)
            .setFullScreenIntent(full, true)
            .addAction(0, context.getString(R.string.adhan_alarm_stop), stop)
            .setDeleteIntent(stop)
            .build();
    }
}
