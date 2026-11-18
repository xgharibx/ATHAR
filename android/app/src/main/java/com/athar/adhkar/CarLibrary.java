package com.athar.adhkar;

import android.content.Context;
import android.net.Uri;

import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.LibraryResult;
import androidx.media3.session.MediaLibraryService.LibraryParams;
import androidx.media3.session.MediaLibraryService.MediaLibrarySession;
import androidx.media3.session.MediaSession;
import androidx.media3.session.SessionError;

import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * What Android Auto shows from Athar (and any other media browser, such as a
 * watch or the system media controls): the Quran radio stations, and every
 * reciter with the 114 surahs. Picking a surah plays it verse by verse, from
 * the phone's saved verses when they are there.
 *
 * The lists come from assets/car_catalog.json, generated from the app's own
 * reciters, stations and Mushaf (tools/scripts/generate-car-catalog.mjs).
 */
@OptIn(markerClass = UnstableApi.class)
final class CarLibrary implements MediaLibrarySession.Callback {
    private static final String ROOT = "root";
    private static final String RADIO = "radio";
    private static final String RECITERS = "reciters";
    private static final String ARTWORK = "asset:///public/icons/icon-512.png";

    private final Context context;
    private JSONObject catalog;

    CarLibrary(Context context) {
        this.context = context.getApplicationContext();
    }

    private JSONObject catalog() {
        if (catalog != null) return catalog;
        try (InputStream in = context.getAssets().open("car_catalog.json")) {
            byte[] bytes = new byte[in.available()];
            int read = 0;
            while (read < bytes.length) {
                int n = in.read(bytes, read, bytes.length - read);
                if (n < 0) break;
                read += n;
            }
            catalog = new JSONObject(new String(bytes, 0, read, StandardCharsets.UTF_8));
        } catch (Exception e) {
            catalog = new JSONObject();
        }
        return catalog;
    }

    private static MediaItem folder(String id, String title, String subtitle) {
        MediaMetadata metadata = new MediaMetadata.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setIsBrowsable(true)
            .setIsPlayable(false)
            .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
            .setArtworkUri(Uri.parse(ARTWORK))
            .build();
        return new MediaItem.Builder().setMediaId(id).setMediaMetadata(metadata).build();
    }

    private static MediaItem playable(String id, String title, String artist, int type, @Nullable Uri uri) {
        MediaMetadata metadata = new MediaMetadata.Builder()
            .setTitle(title)
            .setArtist(artist)
            .setAlbumTitle("القرآن الكريم · أثر")
            .setIsBrowsable(false)
            .setIsPlayable(true)
            .setMediaType(type)
            .setArtworkUri(Uri.parse(ARTWORK))
            .build();
        MediaItem.Builder builder = new MediaItem.Builder().setMediaId(id).setMediaMetadata(metadata);
        if (uri != null) builder.setUri(uri);
        return builder.build();
    }

    @Nullable
    private String reciterLabel(String reciterId) {
        JSONArray reciters = catalog().optJSONArray("reciters");
        if (reciters == null) return null;
        for (int i = 0; i < reciters.length(); i++) {
            JSONObject reciter = reciters.optJSONObject(i);
            if (reciter != null && reciterId.equals(reciter.optString("id"))) return reciter.optString("label", reciterId);
        }
        return null;
    }

    /** The children of a folder, or null for an unknown one. */
    @Nullable
    List<MediaItem> children(String parentId) {
        List<MediaItem> items = new ArrayList<>();
        if (ROOT.equals(parentId)) {
            items.add(folder(RADIO, "إذاعات القرآن", "بث مباشر"));
            items.add(folder(RECITERS, "التلاوات", "اختر القارئ ثم السورة"));
            return items;
        }
        if (RADIO.equals(parentId)) {
            JSONArray radios = catalog().optJSONArray("radios");
            for (int i = 0; radios != null && i < radios.length(); i++) {
                JSONObject radio = radios.optJSONObject(i);
                if (radio == null) continue;
                items.add(playable("radio:" + i, radio.optString("label"), "إذاعة القرآن",
                    MediaMetadata.MEDIA_TYPE_RADIO_STATION, Uri.parse(radio.optString("url"))));
            }
            return items;
        }
        if (RECITERS.equals(parentId)) {
            JSONArray reciters = catalog().optJSONArray("reciters");
            for (int i = 0; reciters != null && i < reciters.length(); i++) {
                JSONObject reciter = reciters.optJSONObject(i);
                if (reciter == null) continue;
                items.add(folder("reciter:" + reciter.optString("id"), reciter.optString("label"), "١١٤ سورة"));
            }
            return items;
        }
        if (parentId.startsWith("reciter:")) {
            String reciterId = parentId.substring("reciter:".length());
            String label = reciterLabel(reciterId);
            JSONArray surahs = catalog().optJSONArray("surahs");
            if (label == null || surahs == null) return null;
            for (int i = 0; i < surahs.length(); i++) {
                JSONObject surah = surahs.optJSONObject(i);
                if (surah == null) continue;
                items.add(playable("surah:" + reciterId + ":" + (i + 1), "سورة " + surah.optString("name"), label,
                    MediaMetadata.MEDIA_TYPE_ALBUM, null));
            }
            return items;
        }
        return null;
    }

    /** Letters only, one spelling: «سورة الكهف» and «الكهف» and «كهف» all meet. */
    static String simplify(String text) {
        String value = text == null ? "" : text.toLowerCase(Locale.ROOT)
            .replaceAll("[\u064B-\u065F\u0670\u0640]", "")
            .replaceAll("[أإآٱ]", "ا")
            .replace('ة', 'ه')
            .replace('ى', 'ي')
            .replace("سورة", "").replace("سوره", "")
            .replace("surah", "").replace("surat", "").replace("sura", "")
            .replaceAll("[^\\p{L}\\p{N}]", "");
        return value.startsWith("ال") && value.length() > 3 ? value.substring(2) : value;
    }

    /** Spoken or typed search: surahs by name (with the first reciter), or the radio. */
    List<MediaItem> search(String query) {
        List<MediaItem> results = new ArrayList<>();
        String wanted = simplify(query);
        if (wanted.isEmpty()) return results;
        if (wanted.contains("اذاعه") || wanted.contains("راديو") || wanted.contains("radio")) {
            results.addAll(children(RADIO));
            return results;
        }
        JSONArray reciters = catalog().optJSONArray("reciters");
        JSONObject first = reciters == null ? null : reciters.optJSONObject(0);
        if (first == null) return results;
        List<MediaItem> surahs = children("reciter:" + first.optString("id"));
        if (surahs == null) return results;
        for (MediaItem surah : surahs) {
            String name = simplify(String.valueOf(surah.mediaMetadata.title));
            if (!name.isEmpty() && (name.equals(wanted) || name.contains(wanted) || wanted.contains(name))) results.add(surah);
        }
        return results;
    }

    /** A picked item, ready to play: a surah becomes its verses. */
    List<MediaItem> resolve(MediaItem item) {
        List<MediaItem> resolved = new ArrayList<>();
        // The app's own player sends verses with their addresses already.
        if (item.localConfiguration != null) {
            resolved.add(item);
            return resolved;
        }
        // "Play Surat Al-Kahf on Athar": the first match, or the radio.
        CharSequence query = item.requestMetadata.searchQuery;
        if (query != null && item.mediaId.isEmpty()) {
            List<MediaItem> found = search(query.toString());
            if (found.isEmpty()) found = children(RADIO);
            return found == null || found.isEmpty() ? resolved : resolve(found.get(0));
        }
        String id = item.mediaId;
        if (id.startsWith("radio:")) {
            for (MediaItem radio : children(RADIO)) if (radio.mediaId.equals(id)) resolved.add(radio);
            return resolved;
        }
        if (id.startsWith("surah:")) {
            String[] parts = id.split(":");
            if (parts.length != 3) return resolved;
            String reciterId = parts[1];
            String label = reciterLabel(reciterId);
            JSONArray surahs = catalog().optJSONArray("surahs");
            int number;
            try {
                number = Integer.parseInt(parts[2]);
            } catch (NumberFormatException e) {
                return resolved;
            }
            if (label == null || surahs == null || number < 1 || number > surahs.length()) return resolved;
            JSONObject surah = surahs.optJSONObject(number - 1);
            int ayahs = surah == null ? 0 : surah.optInt("ayahs", 0);
            String name = surah == null ? "" : surah.optString("name");
            for (int ayah = 1; ayah <= ayahs; ayah++) {
                String url = verseUrl(reciterId, number, ayah);
                File saved = RecitationDownloads.existing(context, url);
                resolved.add(playable(id + ":" + ayah, "سورة " + name + " · آية " + ayah, label,
                    MediaMetadata.MEDIA_TYPE_MUSIC, saved != null ? Uri.fromFile(saved) : Uri.parse(url)));
            }
        }
        return resolved;
    }

    /** The same verse files the app plays (src/lib/recitationDownloads.ts). */
    static String verseUrl(String reciterId, int surah, int ayah) {
        return String.format(Locale.US, "https://everyayah.com/data/%s/%03d%03d.mp3", reciterId, surah, ayah);
    }

    @Override
    public ListenableFuture<LibraryResult<MediaItem>> onGetLibraryRoot(
        MediaLibrarySession session, MediaSession.ControllerInfo browser, @Nullable LibraryParams params) {
        return Futures.immediateFuture(LibraryResult.ofItem(folder(ROOT, "أثر", "القرآن الكريم"), params));
    }

    @Override
    public ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> onGetChildren(
        MediaLibrarySession session, MediaSession.ControllerInfo browser, String parentId,
        int page, int pageSize, @Nullable LibraryParams params) {
        List<MediaItem> all = children(parentId);
        if (all == null) return Futures.immediateFuture(LibraryResult.ofError(SessionError.ERROR_BAD_VALUE));
        int from = Math.max(0, page) * Math.max(1, pageSize);
        int to = Math.min(all.size(), from + Math.max(1, pageSize));
        List<MediaItem> slice = from >= all.size() ? new ArrayList<>() : all.subList(from, to);
        return Futures.immediateFuture(LibraryResult.ofItemList(ImmutableList.copyOf(slice), params));
    }

    @Override
    public ListenableFuture<LibraryResult<MediaItem>> onGetItem(
        MediaLibrarySession session, MediaSession.ControllerInfo browser, String mediaId) {
        if (ROOT.equals(mediaId)) return Futures.immediateFuture(LibraryResult.ofItem(folder(ROOT, "أثر", "القرآن الكريم"), null));
        for (String parent : new String[] { ROOT, RADIO, RECITERS }) {
            List<MediaItem> items = children(parent);
            if (items == null) continue;
            for (MediaItem item : items) {
                if (item.mediaId.equals(mediaId)) return Futures.immediateFuture(LibraryResult.ofItem(item, null));
            }
        }
        return Futures.immediateFuture(LibraryResult.ofError(SessionError.ERROR_BAD_VALUE));
    }

    @Override
    public ListenableFuture<LibraryResult<Void>> onSearch(
        MediaLibrarySession session, MediaSession.ControllerInfo browser, String query, @Nullable LibraryParams params) {
        session.notifySearchResultChanged(browser, query, search(query).size(), params);
        return Futures.immediateFuture(LibraryResult.ofVoid());
    }

    @Override
    public ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> onGetSearchResult(
        MediaLibrarySession session, MediaSession.ControllerInfo browser, String query,
        int page, int pageSize, @Nullable LibraryParams params) {
        List<MediaItem> all = search(query);
        int from = Math.max(0, page) * Math.max(1, pageSize);
        int to = Math.min(all.size(), from + Math.max(1, pageSize));
        List<MediaItem> slice = from >= all.size() ? new ArrayList<>() : all.subList(from, to);
        return Futures.immediateFuture(LibraryResult.ofItemList(ImmutableList.copyOf(slice), params));
    }

    @Override
    public ListenableFuture<List<MediaItem>> onAddMediaItems(
        MediaSession mediaSession, MediaSession.ControllerInfo controller, List<MediaItem> mediaItems) {
        List<MediaItem> resolved = new ArrayList<>();
        for (MediaItem item : mediaItems) resolved.addAll(resolve(item));
        return Futures.immediateFuture(resolved);
    }
}
