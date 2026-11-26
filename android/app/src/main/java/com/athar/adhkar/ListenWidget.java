package com.athar.adhkar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * «السماع» on the Home Screen (NoorListenWidgetProvider), shared by the player
 * and the widget.
 *
 * RecitationService writes a snapshot here at every change (what is playing,
 * by whom, where in the track and when that was read), and keeps the run of
 * tracks it last played with where it stopped, so the widget's play can pick
 * the recitation up again after the app was closed, without opening it.
 *
 * The widget's buttons are intents to RecitationService (ACTION_*). Play and
 * skip start it as a foreground service, which it becomes at once by playing;
 * pause only reaches a service that is already playing.
 */
@OptIn(markerClass = UnstableApi.class)
final class ListenWidget {

    static final String ACTION_PLAY = "com.athar.adhkar.listen.PLAY";
    static final String ACTION_PAUSE = "com.athar.adhkar.listen.PAUSE";
    static final String ACTION_NEXT = "com.athar.adhkar.listen.NEXT";
    static final String ACTION_PREVIOUS = "com.athar.adhkar.listen.PREVIOUS";

    static final String ARTWORK = "asset:///public/icons/icon-512.png";
    private static final String PREFS = "athar_listen_widget";
    private static final String KEY_SNAPSHOT = "snapshot";
    private static final String KEY_QUEUE = "queue";
    private static final String EXTRA_URL = "athar_url";
    private static final String EXTRA_RADIO = "athar_radio";

    private ListenWidget() {}

    static boolean isCommand(@Nullable String action) {
        return ACTION_PLAY.equals(action) || ACTION_PAUSE.equals(action) || ACTION_NEXT.equals(action) || ACTION_PREVIOUS.equals(action);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    // ─── Media items (also used by QuranAudioPlugin) ───────────────────────

    static MediaItem track(Context context, String id, String url, String title, String artist, String album) {
        File saved = RecitationDownloads.existing(context, url);
        Uri uri = saved != null ? Uri.fromFile(saved) : Uri.parse(url);
        Bundle extras = new Bundle();
        extras.putString(EXTRA_URL, url);
        MediaMetadata metadata = new MediaMetadata.Builder()
            .setTitle(title)
            .setArtist(artist)
            .setAlbumTitle(album)
            .setArtworkUri(Uri.parse(ARTWORK))
            .setExtras(extras)
            .build();
        return new MediaItem.Builder().setMediaId(id).setUri(uri).setMediaMetadata(metadata).build();
    }

    /** A Quran radio station: streamed live, never from a saved file. */
    static MediaItem station(String id, String url, String title, String artist) {
        Bundle extras = new Bundle();
        extras.putString(EXTRA_URL, url);
        extras.putBoolean(EXTRA_RADIO, true);
        MediaMetadata metadata = new MediaMetadata.Builder()
            .setTitle(title)
            .setArtist(artist)
            .setAlbumTitle("إذاعة القرآن الكريم · أثر")
            .setArtworkUri(Uri.parse(ARTWORK))
            .setMediaType(MediaMetadata.MEDIA_TYPE_RADIO_STATION)
            .setIsPlayable(true)
            .setIsBrowsable(false)
            .setExtras(extras)
            .build();
        return new MediaItem.Builder().setMediaId(id).setUri(Uri.parse(url)).setMediaMetadata(metadata).build();
    }

    private static boolean isRadio(MediaItem item) {
        Bundle extras = item.mediaMetadata.extras;
        return (extras != null && extras.getBoolean(EXTRA_RADIO, false))
            || Integer.valueOf(MediaMetadata.MEDIA_TYPE_RADIO_STATION).equals(item.mediaMetadata.mediaType);
    }

    @Nullable
    private static String urlOf(MediaItem item) {
        Bundle extras = item.mediaMetadata.extras;
        String url = extras != null ? extras.getString(EXTRA_URL) : null;
        if (url != null) return url;
        return item.localConfiguration != null ? item.localConfiguration.uri.toString() : null;
    }

    private static String text(@Nullable CharSequence value) {
        return value == null ? "" : value.toString();
    }

    // ─── The last run of tracks ───────────────────────────────────────────

    /** Keeps the player's list and where it is (called on pause, on each new track, and before it is cleared). */
    static void saveQueue(Context context, Player player) {
        int count = player.getMediaItemCount();
        if (count == 0) return;
        try {
            int current = Math.max(0, player.getCurrentMediaItemIndex());
            // A long list of verses is cut to the part ahead, so the store stays small.
            int from = count > 400 ? current : 0;
            int to = Math.min(count, from + 400);
            JSONArray items = new JSONArray();
            boolean radio = false;
            for (int i = from; i < to; i++) {
                MediaItem item = player.getMediaItemAt(i);
                String url = urlOf(item);
                if (url == null) return;
                radio = radio || isRadio(item);
                items.put(new JSONObject()
                    .put("id", item.mediaId)
                    .put("url", url)
                    .put("title", text(item.mediaMetadata.title))
                    .put("artist", text(item.mediaMetadata.artist))
                    .put("album", text(item.mediaMetadata.albumTitle)));
            }
            JSONObject queue = new JSONObject()
                .put("items", items)
                .put("index", current - from)
                .put("positionMs", radio ? 0 : Math.max(0L, player.getCurrentPosition()))
                .put("durationMs", radio || player.getDuration() == C.TIME_UNSET ? 0 : Math.max(0L, player.getDuration()))
                .put("live", radio)
                .put("repeat", player.getRepeatMode())
                .put("rate", player.getPlaybackParameters().speed);
            prefs(context).edit().putString(KEY_QUEUE, queue.toString()).apply();
        } catch (Exception ignored) {
            // Best effort: the widget then offers to open «السماع» instead.
        }
    }

    static void forgetQueue(Context context) {
        prefs(context).edit().remove(KEY_QUEUE).apply();
    }

    @Nullable
    static JSONObject savedQueue(Context context) {
        try {
            String json = prefs(context).getString(KEY_QUEUE, null);
            if (json == null) return null;
            JSONObject queue = new JSONObject(json);
            JSONArray items = queue.optJSONArray("items");
            int index = queue.optInt("index", -1);
            return items != null && index >= 0 && index < items.length() ? queue : null;
        } catch (Exception e) {
            return null;
        }
    }

    /** Plays the last run of tracks again, from where it stopped (or the track before or after it). */
    static boolean restore(Context context, Player player, String action) {
        JSONObject queue = savedQueue(context);
        if (queue == null) return false;
        try {
            JSONArray raw = queue.getJSONArray("items");
            boolean live = queue.optBoolean("live", false);
            List<MediaItem> items = new ArrayList<>();
            for (int i = 0; i < raw.length(); i++) {
                JSONObject item = raw.getJSONObject(i);
                String id = item.optString("id", item.getString("url"));
                items.add(live
                    ? station(id, item.getString("url"), item.optString("title", "إذاعة القرآن الكريم"), item.optString("artist", ""))
                    : track(context, id, item.getString("url"), item.optString("title", "القرآن الكريم"), item.optString("artist", ""),
                        item.optString("album", "القرآن الكريم · أثر")));
            }
            int index = queue.getInt("index");
            long position = queue.optLong("positionMs", 0L);
            int repeat = queue.optInt("repeat", Player.REPEAT_MODE_OFF);
            if (ACTION_NEXT.equals(action) || ACTION_PREVIOUS.equals(action)) {
                int step = ACTION_NEXT.equals(action) ? 1 : -1;
                int target = live || repeat == Player.REPEAT_MODE_ALL ? (index + step + items.size()) % items.size() : index + step;
                if (target >= 0 && target < items.size()) {
                    index = target;
                    position = 0L;
                }
            }
            player.setMediaItems(items, index, position);
            player.setRepeatMode(repeat);
            player.setPlaybackSpeed((float) Math.max(0.5, Math.min(2.0, queue.optDouble("rate", 1.0))));
            player.prepare();
            player.play();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // ─── What the widget shows ────────────────────────────────────────────

    /** Writes the snapshot from the player (or the saved run of tracks) and redraws the widgets. */
    static void publish(Context context, @Nullable Player player) {
        try {
            JSONObject snapshot = new JSONObject();
            long now = System.currentTimeMillis();
            if (player != null && player.getMediaItemCount() > 0 && player.getPlaybackState() != Player.STATE_IDLE
                && player.getPlaybackState() != Player.STATE_ENDED) {
                MediaItem item = player.getCurrentMediaItem();
                boolean radio = item != null && isRadio(item);
                long duration = player.getDuration();
                int index = player.getCurrentMediaItemIndex();
                int count = player.getMediaItemCount();
                boolean wraps = radio || player.getRepeatMode() == Player.REPEAT_MODE_ALL;
                snapshot
                    .put("state", player.getPlayWhenReady() ? "playing" : "paused")
                    .put("title", item == null ? "" : text(item.mediaMetadata.title))
                    .put("artist", item == null ? "" : text(item.mediaMetadata.artist))
                    .put("live", radio)
                    .put("positionMs", radio ? 0 : Math.max(0L, player.getCurrentPosition()))
                    .put("durationMs", radio || duration == C.TIME_UNSET ? 0 : Math.max(0L, duration))
                    .put("at", now)
                    .put("rate", player.getPlaybackParameters().speed)
                    .put("hasNext", wraps || index + 1 < count)
                    .put("hasPrevious", wraps || index > 0);
            } else {
                JSONObject queue = savedQueue(context);
                if (queue != null) {
                    JSONArray items = queue.getJSONArray("items");
                    int index = queue.getInt("index");
                    JSONObject item = items.getJSONObject(index);
                    boolean live = queue.optBoolean("live", false);
                    snapshot
                        .put("state", "paused")
                        .put("title", item.optString("title", ""))
                        .put("artist", item.optString("artist", ""))
                        .put("live", live)
                        .put("positionMs", queue.optLong("positionMs", 0L))
                        .put("durationMs", queue.optLong("durationMs", 0L))
                        .put("at", now)
                        .put("rate", queue.optDouble("rate", 1.0))
                        .put("hasNext", live || index + 1 < items.length())
                        .put("hasPrevious", live || index > 0);
                } else {
                    snapshot.put("state", "idle").put("at", now);
                }
            }
            prefs(context).edit().putString(KEY_SNAPSHOT, snapshot.toString()).apply();
        } catch (Exception ignored) {
            // Keep the last snapshot.
        }
        NoorListenWidgetProvider.updateAll(context);
    }

    @Nullable
    static JSONObject snapshot(Context context) {
        try {
            String json = prefs(context).getString(KEY_SNAPSHOT, null);
            return json == null ? null : new JSONObject(json);
        } catch (Exception e) {
            return null;
        }
    }

    static boolean hasWidgets(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            if (manager == null) return false;
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, NoorListenWidgetProvider.class));
            return ids != null && ids.length > 0;
        } catch (Exception e) {
            return false;
        }
    }

    /** A button's intent to the player. */
    static PendingIntent command(Context context, String action, int requestCode) {
        Intent intent = new Intent(context, RecitationService.class).setAction(action);
        int flags = PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT;
        // Pause reaches a service that is playing (in the foreground already);
        // play and skip start it, and it plays at once.
        if (!ACTION_PAUSE.equals(action) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return PendingIntent.getForegroundService(context, requestCode, intent, flags);
        }
        return PendingIntent.getService(context, requestCode, intent, flags);
    }
}
