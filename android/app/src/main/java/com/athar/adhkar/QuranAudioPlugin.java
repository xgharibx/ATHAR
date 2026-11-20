package com.athar.adhkar;

import android.content.ComponentName;
import android.content.Context;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.core.content.ContextCompat;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.ListenableFuture;
import java.io.File;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The Mushaf's native recitation player (see RecitationService).
 *
 *   play({ items: [{ id, url, title, artist }], startIndex, rate, volume, repeat })
 *       repeat: "none" | "one" (the current verse) | "all" (the whole list)
 *       live: true for the Quran radio stations (shown as a radio station)
 *   pause() / resume() / stop() / next() / previous()
 *   setRate({ rate }) / setVolume({ volume })
 *   position()  resolves { index, positionMs, durationMs, playing } for the
 *       listening section's progress bar and the verses that follow the reciter
 *   seek({ positionMs, index? })  jump within the current track (or to another)
 *   items may carry "album"; play may carry "startPositionMs" (resume where you left off)
 *   download({ urls, maxBytes })  saves verses for offline listening,
 *       reporting "downloadProgress" { done, total }; resolves { saved, failed, evicted }
 *   clearDownloads() / downloadedBytes()
 *
 * Events: "itemChange" { index, id }, "stateChange" { state }
 * (playing | paused | buffering | stopped), "ended", "error" { message, index }.
 * Verses saved offline play from the file; the rest stream.
 */
@OptIn(markerClass = UnstableApi.class)
@CapacitorPlugin(name = "QuranAudio")
public class QuranAudioPlugin extends Plugin {

    private static final String ARTWORK = "asset:///public/icons/icon-512.png";

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService downloads = Executors.newSingleThreadExecutor();
    @Nullable private ListenableFuture<MediaController> controllerFuture;
    @Nullable private MediaController controller;
    private String lastState = "stopped";

    private final Player.Listener listener = new Player.Listener() {
        @Override
        public void onMediaItemTransition(@Nullable MediaItem item, int reason) {
            MediaController current = controller;
            if (item == null || current == null) return;
            JSObject data = new JSObject();
            data.put("index", current.getCurrentMediaItemIndex());
            data.put("id", item.mediaId);
            notifyListeners("itemChange", data);
        }

        @Override
        public void onEvents(Player player, Player.Events events) {
            if (events.containsAny(
                Player.EVENT_IS_PLAYING_CHANGED,
                Player.EVENT_PLAYBACK_STATE_CHANGED,
                Player.EVENT_PLAY_WHEN_READY_CHANGED
            )) {
                if (events.contains(Player.EVENT_PLAYBACK_STATE_CHANGED) && player.getPlaybackState() == Player.STATE_ENDED) {
                    lastState = "stopped";
                    notifyListeners("ended", new JSObject());
                    return;
                }
                emitState(player);
            }
        }

        @Override
        public void onPlayerError(PlaybackException error) {
            MediaController current = controller;
            JSObject data = new JSObject();
            data.put("message", error.getErrorCodeName());
            data.put("index", current == null ? -1 : current.getCurrentMediaItemIndex());
            notifyListeners("error", data);
        }
    };

    private void emitState(Player player) {
        String state;
        int playback = player.getPlaybackState();
        if (playback == Player.STATE_IDLE || player.getMediaItemCount() == 0) state = "stopped";
        else if (player.isPlaying()) state = "playing";
        else if (player.getPlayWhenReady() && playback == Player.STATE_BUFFERING) state = "buffering";
        else state = "paused";
        if (state.equals(lastState)) return;
        lastState = state;
        JSObject data = new JSObject();
        data.put("state", state);
        notifyListeners("stateChange", data);
    }

    /** Run `action` on the main thread with a connected controller. */
    private void withController(PluginCall call, ControllerAction action) {
        main.post(() -> {
            MediaController current = controller;
            if (current != null && current.isConnected()) {
                runAction(call, action, current);
                return;
            }
            Context context = getContext();
            SessionToken token = new SessionToken(context, new ComponentName(context, RecitationService.class));
            ListenableFuture<MediaController> future = new MediaController.Builder(context, token).buildAsync();
            controllerFuture = future;
            future.addListener(() -> {
                try {
                    MediaController connected = future.get();
                    connected.addListener(listener);
                    controller = connected;
                    runAction(call, action, connected);
                } catch (Exception e) {
                    call.reject("The recitation player could not start", e);
                }
            }, ContextCompat.getMainExecutor(context));
        });
    }

    private void runAction(PluginCall call, ControllerAction action, MediaController current) {
        try {
            action.run(current);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() == null ? "recitation error" : e.getMessage(), e);
        }
    }

    private interface ControllerAction {
        void run(MediaController controller) throws Exception;
    }

    @PluginMethod
    public void play(PluginCall call) {
        JSArray raw = call.getArray("items");
        if (raw == null || raw.length() == 0) {
            call.reject("items are required");
            return;
        }
        List<MediaItem> items = new ArrayList<>();
        boolean live = Boolean.TRUE.equals(call.getBoolean("live", false));
        try {
            for (int i = 0; i < raw.length(); i++) {
                JSONObject item = raw.getJSONObject(i);
                items.add(live ? radioItem(item) : mediaItem(item));
            }
        } catch (JSONException e) {
            call.reject("invalid items", e);
            return;
        }
        int start = Math.max(0, Math.min(items.size() - 1, call.getInt("startIndex", 0)));
        float rate = clampRate(call.getFloat("rate", 1f));
        float volume = clampVolume(call.getFloat("volume", 1f));
        String repeat = call.getString("repeat", "none");
        long startPosition = Math.max(0L, call.getLong("startPositionMs", 0L));
        withController(call, (player) -> {
            player.setMediaItems(items, start, startPosition);
            player.setRepeatMode(
                "one".equals(repeat) ? Player.REPEAT_MODE_ONE : "all".equals(repeat) ? Player.REPEAT_MODE_ALL : Player.REPEAT_MODE_OFF
            );
            player.setPlaybackSpeed(rate);
            player.setVolume(volume);
            player.prepare();
            player.play();
        });
    }

    private MediaItem mediaItem(JSONObject item) throws JSONException {
        String url = item.getString("url");
        File saved = RecitationDownloads.existing(getContext(), url);
        Uri uri = saved != null ? Uri.fromFile(saved) : Uri.parse(url);
        MediaMetadata metadata = new MediaMetadata.Builder()
            .setTitle(item.optString("title", "القرآن الكريم"))
            .setArtist(item.optString("artist", ""))
            .setAlbumTitle(item.optString("album", "القرآن الكريم · أثر"))
            .setArtworkUri(Uri.parse(ARTWORK))
            .build();
        return new MediaItem.Builder().setMediaId(item.optString("id", url)).setUri(uri).setMediaMetadata(metadata).build();
    }

    /** A Quran radio station: streamed live, never from a saved file. */
    private MediaItem radioItem(JSONObject item) throws JSONException {
        String url = item.getString("url");
        MediaMetadata metadata = new MediaMetadata.Builder()
            .setTitle(item.optString("title", "إذاعة القرآن الكريم"))
            .setArtist(item.optString("artist", ""))
            .setAlbumTitle("إذاعة القرآن الكريم · أثر")
            .setArtworkUri(Uri.parse(ARTWORK))
            .setMediaType(MediaMetadata.MEDIA_TYPE_RADIO_STATION)
            .setIsPlayable(true)
            .setIsBrowsable(false)
            .build();
        return new MediaItem.Builder().setMediaId(item.optString("id", url)).setUri(Uri.parse(url)).setMediaMetadata(metadata).build();
    }

    private static float clampRate(@Nullable Float rate) {
        return rate == null || rate.isNaN() ? 1f : Math.max(0.5f, Math.min(2f, rate));
    }

    private static float clampVolume(@Nullable Float volume) {
        return volume == null || volume.isNaN() ? 1f : Math.max(0f, Math.min(1f, volume));
    }

    @PluginMethod
    public void pause(PluginCall call) {
        withController(call, Player::pause);
    }

    @PluginMethod
    public void resume(PluginCall call) {
        withController(call, (player) -> {
            if (player.getPlaybackState() == Player.STATE_IDLE) player.prepare();
            player.play();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        MediaController current = controller;
        if (current == null) {
            call.resolve();
            return;
        }
        withController(call, (player) -> {
            player.stop();
            player.clearMediaItems();
        });
    }

    @PluginMethod
    public void next(PluginCall call) {
        withController(call, Player::seekToNextMediaItem);
    }

    @PluginMethod
    public void previous(PluginCall call) {
        withController(call, Player::seekToPreviousMediaItem);
    }

    /** Where the player is: the listening section's progress bar polls this while it is open. */
    @PluginMethod
    public void position(PluginCall call) {
        main.post(() -> {
            JSObject data = new JSObject();
            MediaController current = controller;
            if (current == null || !current.isConnected() || current.getMediaItemCount() == 0) {
                data.put("index", -1);
                data.put("positionMs", 0);
                data.put("durationMs", 0);
                data.put("playing", false);
            } else {
                long duration = current.getDuration();
                data.put("index", current.getCurrentMediaItemIndex());
                data.put("positionMs", Math.max(0L, current.getCurrentPosition()));
                data.put("durationMs", duration == androidx.media3.common.C.TIME_UNSET ? 0 : Math.max(0L, duration));
                data.put("playing", current.isPlaying());
            }
            call.resolve(data);
        });
    }

    @PluginMethod
    public void seek(PluginCall call) {
        long position = Math.max(0L, call.getLong("positionMs", 0L));
        Integer index = call.getInt("index");
        withController(call, (player) -> {
            if (index != null && index >= 0 && index < player.getMediaItemCount()) player.seekTo(index, position);
            else player.seekTo(position);
        });
    }

    @PluginMethod
    public void setRate(PluginCall call) {
        float rate = clampRate(call.getFloat("rate", 1f));
        withController(call, (player) -> player.setPlaybackSpeed(rate));
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        float volume = clampVolume(call.getFloat("volume", 1f));
        withController(call, (player) -> player.setVolume(volume));
    }

    /** Calls waiting for their batch, while the app is open. */
    private final java.util.Map<String, PluginCall> waiting = new java.util.concurrent.ConcurrentHashMap<>();

    @Override
    public void load() {
        super.load();
        RecitationDownloadWorker.listener = new RecitationDownloadWorker.Listener() {
            @Override
            public void progress(String batch, int done, int total) {
                if (!waiting.containsKey(batch)) return;
                JSObject progress = new JSObject();
                progress.put("done", done);
                progress.put("total", total);
                notifyListeners("downloadProgress", progress);
            }

            @Override
            public void finished(String batch, int saved, int failed, int evicted) {
                PluginCall call = waiting.remove(batch);
                if (call == null) return;
                JSObject result = new JSObject();
                result.put("saved", saved);
                result.put("failed", failed);
                result.put("evicted", evicted);
                call.resolve(result);
            }
        };
    }

    /**
     * Saves verses in the background (RecitationDownloadWorker): the download
     * carries on after the app is left, and resolves here if the app is still open.
     */
    @PluginMethod
    public void download(PluginCall call) {
        JSArray raw = call.getArray("urls");
        if (raw == null) {
            call.reject("urls are required");
            return;
        }
        List<String> urls = new ArrayList<>();
        for (int i = 0; i < raw.length(); i++) {
            String url = raw.optString(i, null);
            if (url != null) urls.add(url);
        }
        long maxBytes = Math.max(1, call.getLong("maxBytes", 1024L * 1024 * 1024));
        Context context = getContext();
        downloads.execute(() -> {
            try {
                String requested = call.getString("kind");
                String kind = "tafsir".equals(requested) || "listen".equals(requested) ? requested : "audio";
                long maxFileBytes = Math.max(0, call.getLong("maxFileBytes", 0L));
                String batch = RecitationDownloadWorker.enqueue(context, urls, maxBytes, call.getString("title"), kind, maxFileBytes);
                waiting.put(batch, call);
            } catch (Exception e) {
                call.reject("The download could not start", e);
            }
        });
    }

    @PluginMethod
    public void downloadedBytes(PluginCall call) {
        Context context = getContext();
        downloads.execute(() -> {
            JSObject result = new JSObject();
            result.put("bytes", RecitationDownloads.totalBytes(context));
            call.resolve(result);
        });
    }

    private static List<String> urlsOf(PluginCall call) {
        List<String> urls = new ArrayList<>();
        JSArray raw = call.getArray("urls");
        if (raw == null) return urls;
        for (int i = 0; i < raw.length(); i++) {
            String url = raw.optString(i, null);
            if (url != null) urls.add(url);
        }
        return urls;
    }

    /** How many of `urls` are saved on the phone. */
    @PluginMethod
    public void savedCount(PluginCall call) {
        List<String> urls = urlsOf(call);
        Context context = getContext();
        downloads.execute(() -> {
            int count = 0;
            for (String url : urls) if (RecitationDownloads.existing(context, url) != null) count++;
            JSObject result = new JSObject();
            result.put("count", count);
            call.resolve(result);
        });
    }

    /** Which of `urls` are saved on the phone. */
    @PluginMethod
    public void savedUrls(PluginCall call) {
        List<String> urls = urlsOf(call);
        Context context = getContext();
        new Thread(() -> {
            JSObject result = new JSObject();
            result.put("saved", new JSArray(RecitationDownloads.savedOf(context, urls)));
            call.resolve(result);
        }).start();
    }

    /** The saved copy of a text file (a tafsir surah), or nothing. */
    @PluginMethod
    public void readDownloaded(PluginCall call) {
        String url = call.getString("url", "");
        Context context = getContext();
        // Not on the downloads thread: reading must not wait behind a batch being queued.
        new Thread(() -> {
            JSObject result = new JSObject();
            String text = url == null ? null : RecitationDownloads.readText(context, url);
            if (text != null) result.put("text", text);
            call.resolve(result);
        }).start();
    }

    @PluginMethod
    public void removeDownloads(PluginCall call) {
        List<String> urls = urlsOf(call);
        Context context = getContext();
        downloads.execute(() -> {
            JSObject result = new JSObject();
            result.put("removed", RecitationDownloads.remove(context, urls));
            call.resolve(result);
        });
    }

    @PluginMethod
    public void clearDownloads(PluginCall call) {
        Context context = getContext();
        downloads.execute(() -> {
            RecitationDownloads.clear(context);
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        MediaController current = controller;
        if (current != null) current.removeListener(listener);
        ListenableFuture<MediaController> future = controllerFuture;
        if (future != null) MediaController.releaseFuture(future);
        controller = null;
        controllerFuture = null;
        downloads.shutdown();
        RecitationDownloadWorker.listener = null;
        waiting.clear();
        super.handleOnDestroy();
    }
}
