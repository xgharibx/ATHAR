package com.athar.adhkar;

import android.app.PendingIntent;
import android.content.Intent;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.DefaultMediaNotificationProvider;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

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
 * QuranAudioPlugin drives it through a MediaController.
 */
@OptIn(markerClass = UnstableApi.class)
public class RecitationService extends MediaSessionService {

    @Nullable
    private MediaSession session;

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
        MediaSession.Builder builder = new MediaSession.Builder(this, player).setId("athar-recitation");
        if (open != null) {
            builder.setSessionActivity(
                PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT)
            );
        }
        session = builder.build();

        DefaultMediaNotificationProvider notifications = new DefaultMediaNotificationProvider.Builder(this).build();
        notifications.setSmallIcon(R.drawable.ic_stat_athar_notification);
        setMediaNotificationProvider(notifications);
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return session;
    }

    @Override
    public void onTaskRemoved(@Nullable Intent rootIntent) {
        // Swiping the app away keeps a playing recitation going; otherwise stop.
        MediaSession current = session;
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
        MediaSession current = session;
        if (current != null) {
            current.getPlayer().release();
            current.release();
            session = null;
        }
        super.onDestroy();
    }
}
