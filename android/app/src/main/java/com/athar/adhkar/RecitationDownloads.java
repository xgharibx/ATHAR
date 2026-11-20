package com.athar.adhkar;

import android.content.Context;
import androidx.annotation.Nullable;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * Recitation files saved for listening offline, as ordinary files in the
 * app's private storage. (The web view's cache is cleared every time the app
 * opens, so downloads saved there never survived.)
 *
 * A verse is stored under its URL path, e.g. Alafasy_128kbps/001001.mp3, and
 * the oldest files are removed first when the total passes the budget.
 */
final class RecitationDownloads {

    /** Largest single verse accepted; the longest verses are well under this. */
    static final long MAX_FILE_BYTES = 8L * 1024 * 1024;

    /** The most a batch may allow per file: a whole surah in high quality. */
    static final long MAX_LONG_FILE_BYTES = 600L * 1024 * 1024;

    private RecitationDownloads() {}

    static File root(Context context) {
        return new File(context.getFilesDir(), "quran-audio");
    }

    /**
     * Text saved for reading offline (tafsir surahs, as .json). Kept apart from
     * the recitations, so the audio budget never removes it and clearing the
     * recitations leaves it in place.
     */
    static File textRoot(Context context) {
        return new File(context.getFilesDir(), "offline-text");
    }

    /** The longest tafsir surah (al-Tabari on al-Baqarah) is about 7.4 MB. */
    static final long MAX_TEXT_BYTES = 16L * 1024 * 1024;

    private static boolean isText(String path) {
        return path.toLowerCase(java.util.Locale.ROOT).endsWith(".json");
    }

    /** The saved copy of a text file as UTF-8, or null. */
    @Nullable
    static String readText(Context context, String url) {
        File file = existing(context, url);
        if (file == null || !file.getAbsolutePath().startsWith(textRoot(context).getAbsolutePath())) return null;
        if (file.length() > MAX_TEXT_BYTES) return null;
        try (InputStream in = new java.io.FileInputStream(file)) {
            java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream((int) file.length());
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) bytes.write(buffer, 0, read);
            return new String(bytes.toByteArray(), java.nio.charset.StandardCharsets.UTF_8);
        } catch (IOException e) {
            return null;
        }
    }

    /** Which of `urls` are saved. */
    static List<String> savedOf(Context context, List<String> urls) {
        List<String> saved = new ArrayList<>();
        for (String url : urls) if (existing(context, url) != null) saved.add(url);
        return saved;
    }

    /** Remove the saved copies of `urls`; returns how many were removed. */
    static int remove(Context context, List<String> urls) {
        int removed = 0;
        for (String url : urls) {
            File file = existing(context, url);
            if (file != null && file.delete()) removed++;
        }
        return removed;
    }

    /** Where a recitation URL is (or would be) saved; null for anything but a plain https file URL. */
    @Nullable
    static File fileFor(Context context, String url) {
        try {
            URL parsed = new URL(url);
            if (!"https".equalsIgnoreCase(parsed.getProtocol())) return null;
            String path = parsed.getPath();
            if (path == null || path.isEmpty()) return null;
            String[] segments = path.split("/");
            // Verses (everyayah) and tafsir surahs keep their two last segments
            // (reciter folder and file), as they always have. Whole surahs and
            // other long recordings keep their whole path: several reciters'
            // folders end alike (".../r1/001.mp3"), and one must never play for
            // another. Segments stay percent-encoded, so Arabic names are safe.
            String host = parsed.getHost().toLowerCase(java.util.Locale.ROOT);
            boolean shortPath = isText(path) || host.equals("everyayah.com") || host.endsWith(".everyayah.com");
            int first = shortPath ? Math.max(0, segments.length - 2) : 0;
            List<String> kept = new ArrayList<>();
            for (int i = first; i < segments.length; i++) {
                String segment = segments[i];
                if (segment.isEmpty()) continue;
                if (!segment.matches("[A-Za-z0-9._%-]{1,200}") || segment.equals(".") || segment.equals("..")) return null;
                kept.add(segment);
            }
            if (kept.size() > 10) return null;
            if (kept.isEmpty()) return null;
            File file = new File(isText(path) ? textRoot(context) : root(context), host);
            for (String segment : kept) file = new File(file, segment);
            return file;
        } catch (IOException | IllegalArgumentException e) {
            return null;
        }
    }

    /** The saved copy of a verse, if there is a complete one. */
    @Nullable
    static File existing(Context context, String url) {
        File file = fileFor(context, url);
        return file != null && file.isFile() && file.length() > 0 ? file : null;
    }

    /** Save one verse. Returns true when it is on disk (already or now). */
    static boolean save(Context context, String url) {
        return save(context, url, 0);
    }

    /** Save one file, up to `maxFileBytes` (0: the default for its kind; whole surahs pass more). */
    static boolean save(Context context, String url, long maxFileBytes) {
        File target = fileFor(context, url);
        if (target == null) return false;
        if (target.isFile() && target.length() > 0) {
            // Count it as recently wanted, so the budget keeps it.
            target.setLastModified(System.currentTimeMillis());
            return true;
        }
        File parent = target.getParentFile();
        if (parent == null || (!parent.isDirectory() && !parent.mkdirs())) return false;
        File partial = new File(parent, target.getName() + ".part");
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(30000);
            connection.setInstanceFollowRedirects(true);
            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) return false;
            long limit = maxFileBytes > 0
                ? Math.min(maxFileBytes, MAX_LONG_FILE_BYTES)
                : isText(target.getName()) ? MAX_TEXT_BYTES : MAX_FILE_BYTES;
            long declared = connection.getContentLengthLong();
            if (declared > limit) return false;
            long written = 0;
            try (InputStream in = connection.getInputStream(); OutputStream out = new FileOutputStream(partial)) {
                byte[] buffer = new byte[64 * 1024];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    written += read;
                    if (written > limit) throw new IOException("file too large");
                    out.write(buffer, 0, read);
                }
            }
            if (written == 0 || !partial.renameTo(target)) {
                partial.delete();
                return false;
            }
            return true;
        } catch (IOException | RuntimeException e) {
            partial.delete();
            return false;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    /** Remove the oldest saved verses (except `keep`) until the total fits `maxBytes`. Returns how many were removed. */
    static int enforceBudget(Context context, long maxBytes, Set<String> keep) {
        List<File> files = new ArrayList<>();
        collect(root(context), files);
        long total = 0;
        for (File file : files) total += file.length();
        if (total <= maxBytes) return 0;
        files.sort(Comparator.comparingLong(File::lastModified));
        int removed = 0;
        for (File file : files) {
            if (total <= maxBytes) break;
            if (keep.contains(file.getAbsolutePath())) continue;
            long size = file.length();
            if (file.delete()) {
                total -= size;
                removed++;
            }
        }
        return removed;
    }

    private static void collect(File dir, List<File> out) {
        File[] children = dir.listFiles();
        if (children == null) return;
        for (File child : children) {
            if (child.isDirectory()) collect(child, out);
            else if (child.getName().endsWith(".part")) child.delete();
            else out.add(child);
        }
    }

    static long totalBytes(Context context) {
        List<File> files = new ArrayList<>();
        collect(root(context), files);
        long total = 0;
        for (File file : files) total += file.length();
        return total;
    }

    static boolean clear(Context context) {
        return deleteTree(root(context));
    }

    private static boolean deleteTree(File file) {
        File[] children = file.listFiles();
        if (children != null) for (File child : Arrays.asList(children)) deleteTree(child);
        return !file.exists() || file.delete();
    }
}
