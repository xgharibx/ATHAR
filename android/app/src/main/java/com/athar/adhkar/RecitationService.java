package com.athar.adhkar;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.DefaultMediaNotificationProvider;
import androidx.media3.session.MediaLibraryService;
import androidx.media3.session.MediaSession;

/**
 * Plays the Quran recitation natively, in a media playback foreground service.
 *
 * ExoPlayer holds the whole run of verses as a playlist and buffers the next
 * verse while the current one plays, so verses follow each other without the
 * pause the web player had while each file downloaded. Because the player
 * lives in this service, the recitation keeps going with the screen off or
 * the app in the background, and Media3 shows the standard media
 * notification with lock-screen, headphone, watch and car controls.
 *
 * QuranAudioPlugin drives it through a MediaController. It is also a media
 * library (CarLibrary): Android Auto and other media browsers can pick a
 * Quran radio station, or a reciter and a surah, and play it from here.
 *
 * It also keeps the «السماع» widget true (ListenWidget): a snapshot at every
 * change, the bar moved along every few seconds while a widget is placed, and
 * the widget's buttons (ListenWidget.ACTION_*), which can start the last
 * recitation again after the app was closed.
 */
@OptIn(markerClass = UnstableApi.class)
public class RecitationService extends MediaLibraryService {

    @Nullable
    private MediaLibrarySession session;

    private static final int WIDGET_FALLBACK_NOTIFICATION = 7317;
    private final Handler ticker = new Handler(Looper.getMainLooper());
    private final Runnable tick = this::widgetTick;

    private final Player.Listener widgetListener = new Player.Listener() {
        @Override
        public void onEvents(@NonNull Player player, @NonNull Player.Events events) {
            if (!events.containsAny(
                Player.EVENT_IS_PLAYING_CHANGED,
                Player.EVENT_PLAY_WHEN_READY_CHANGED,
                Player.EVENT_PLAYBACK_STATE_CHANGED,
                Player.EVENT_MEDIA_ITEM_TRANSITION,
                Player.EVENT_TIMELINE_CHANGED,
                Player.EVENT_POSITION_DISCONTINUITY,
                Player.EVENT_PLAYBACK_PARAMETERS_CHANGED
            )) return;
            if (player.getPlaybackState() == Player.STATE_ENDED) {
                // Heard to the end: the widget offers «السماع» afresh.
                ListenWidget.forgetQueue(RecitationService.this);
            } else if (events.containsAny(Player.EVENT_IS_PLAYING_CHANGED, Player.EVENT_MEDIA_ITEM_TRANSITION, Player.EVENT_PLAY_WHEN_READY_CHANGED)) {
                ListenWidget.saveQueue(RecitationService.this, player);
            }
            ListenWidget.publish(RecitationService.this, player);
            scheduleTick(player);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        ExoPlayer player = new ExoPlayer.Builder(this)
            .setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_SPEECH)
                    .build(),
                /* handleAudioFocus= */ true
            )
            // Pause when headphones are unplugged, like any media app.
            .setHandleAudioBecomingNoisy(true)
            // Keep the CPU and Wi-Fi awake for a recitation streamed with the screen off.
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .build();

        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        MediaLibrarySession.Builder builder = new MediaLibrarySession.Builder(this, player, new CarLibrary(this))
            .setId("athar-recitation");
        if (open != null) {
            builder.setSessionActivity(
                PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT)
            );
        }
        session = builder.build();
        player.addListener(widgetListener);

        DefaultMediaNotificationProvider notifications = new DefaultMediaNotificationProvider.Builder(this).build();
        notifications.setSmallIcon(R.drawable.ic_stat_athar_notification);
        setMediaNotificationProvider(notifications);
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        if (intent != null && ListenWidget.isCommand(intent.getAction())) {
            widgetCommand(intent.getAction());
            return START_NOT_STICKY;
        }
        return super.onStartCommand(intent, flags, startId);
    }

    /** A button on the «السماع» widget. */
    private void widgetCommand(String action) {
        MediaLibrarySession current = session;
        if (current == null) {
            settleWithoutPlaying();
            return;
        }
        // Started by the widget, before any controller connected: the session
        // must belong to the service for its notification to take it to the foreground.
        if (!isSessionAdded(current)) addSession(current);
        Player player = current.getPlayer();
        if (player.getMediaItemCount() > 0) {
            if (ListenWidget.ACTION_PAUSE.equals(action)) {
                player.pause();
                return;
            }
            if (ListenWidget.ACTION_NEXT.equals(action)) player.seekToNextMediaItem();
            else if (ListenWidget.ACTION_PREVIOUS.equals(action)) player.seekToPreviousMediaItem();
            if (player.getPlaybackState() == Player.STATE_IDLE) player.prepare();
            player.play();
            return;
        }
        if (ListenWidget.ACTION_PAUSE.equals(action) || !ListenWidget.restore(this, player, action)) {
            ListenWidget.publish(this, player);
            settleWithoutPlaying();
        }
    }

    /**
     * Started as a foreground service but with nothing to play: Android still
     * expects the service in the foreground, so it is, for a moment, and then stops.
     */
    private void settleWithoutPlaying() {
        try {
            String channel = "athar_listen_widget";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationManager manager = getSystemService(NotificationManager.class);
                if (manager != null && manager.getNotificationChannel(channel) == null) {
                    manager.createNotificationChannel(new NotificationChannel(channel, "السماع", NotificationManager.IMPORTANCE_MIN));
                }
            }
            Notification notification = new NotificationCompat.Builder(this, channel)
                .setSmallIcon(R.drawable.ic_stat_athar_notification)
                .setContentTitle("السماع")
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .build();
            ServiceCompat.startForeground(this, WIDGET_FALLBACK_NOTIFICATION, notification,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0);
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        } catch (Exception ignored) {
            // Not started in the foreground: nothing to undo.
        }
        MediaLibrarySession current = session;
        if (current == null || current.getPlayer().getMediaItemCount() == 0) stopSelf();
    }

    /** While playing with a widget placed, the bar moves on every ten seconds. */
    private void scheduleTick(Player player) {
        ticker.removeCallbacks(tick);
        if (player.isPlaying() && ListenWidget.hasWidgets(this)) ticker.postDelayed(tick, 10_000);
    }

    private void widgetTick() {
        MediaLibrarySession current = session;
        if (current == null) return;
        ListenWidget.publish(this, current.getPlayer());
        scheduleTick(current.getPlayer());
    }

    @Nullable
    @Override
    public MediaLibrarySession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return session;
    }

    @Override
    public void onTaskRemoved(@Nullable Intent rootIntent) {
        // Swiping the app away keeps a playing recitation going; otherwise stop.
        MediaLibrarySession current = session;
        if (current == null) {
            stopSelf();
            return;
        }
        Player player = current.getPlayer();
        if (!player.getPlayWhenReady() || player.getMediaItemCount() == 0 || player.getPlaybackState() == Player.STATE_ENDED) {
            stopSelf();
        }
    }

    @Override
    public void onDestroy() {
        ticker.removeCallbacks(tick);
        MediaLibrarySession current = session;
        if (current != null) {
            ListenWidget.saveQueue(this, current.getPlayer());
            current.getPlayer().removeListener(widgetListener);
            current.getPlayer().release();
            current.release();
            session = null;
        }
        super.onDestroy();
    }
}
