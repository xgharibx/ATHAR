package com.athar.adhkar;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.UUID;

/**
 * Native share sheet for images and text.
 *
 * "Share as photo" silently did nothing in the Android app. The web code path
 * relies on navigator.share({ files }), and the Capacitor WebView does not
 * expose the Web Share API at all — so it fell through to an <a download>
 * click, which a WebView has nowhere to put. The user saw a button that
 * produced no sheet and no file.
 *
 * This exists instead of @capacitor/share because that plugin still ships
 * `getDefaultProguardFile('proguard-android.txt')` in its build.gradle, which
 * current AGP rejects outright — verified by installing it and watching the
 * build fail. Same reason AuthBridgePlugin exists rather than
 * @capacitor/browser. Patching node_modules would not survive an npm install.
 *
 * JS side: registerPlugin("ShareBridge").shareImage({ base64, filename, text })
 *          registerPlugin("ShareBridge").saveImage({ base64, filename })
 *          registerPlugin("ShareBridge").shareFile({ base64, filename, mimeType, title })
 */
@CapacitorPlugin(name = "ShareBridge")
public class ShareBridgePlugin extends Plugin {
    private static final long SHARE_FILE_RETENTION_MILLIS = 7L * 24L * 60L * 60L * 1000L;

    @PluginMethod
    public void shareImage(PluginCall call) {
        String base64 = call.getString("base64");
        if (base64 == null || base64.trim().isEmpty()) {
            call.reject("missing base64");
            return;
        }
        String filename = call.getString("filename", "athar.png");
        String text = call.getString("text", "");
        String title = call.getString("title", "أثر");

        try {
            // Strip a data: URL prefix if one came through.
            int comma = base64.indexOf(',');
            if (base64.startsWith("data:") && comma > -1) {
                base64 = base64.substring(comma + 1);
            }
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);

            // Written under the cache dir, which file_paths.xml already exposes
            // through the FileProvider declared in AndroidManifest.
            File dir = new File(getContext().getCacheDir(), "shared");
            if (!dir.exists() && !dir.mkdirs()) {
                call.reject("could not create share dir");
                return;
            }
            File out = new File(dir, filename);
            try (FileOutputStream fos = new FileOutputStream(out)) {
                fos.write(bytes);
            }

            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                out
            );

            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("image/png");
            send.putExtra(Intent.EXTRA_STREAM, uri);
            if (!text.isEmpty()) send.putExtra(Intent.EXTRA_TEXT, text);
            // Without this the receiving app cannot open the URI we just handed it.
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(send, title);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
            call.resolve();
        } catch (Throwable t) {
            call.reject("share failed: " + t.getMessage());
        }
    }

    /** Share an arbitrary file, such as a user-requested app backup. */
    @PluginMethod
    public void shareFile(PluginCall call) {
        String base64 = call.getString("base64");
        if (base64 == null || base64.trim().isEmpty()) {
            call.reject("missing base64");
            return;
        }
        String filename = call.getString("filename", "athar-file").replace('\\', '_').replace('/', '_');
        if (filename.trim().isEmpty() || filename.equals(".") || filename.equals("..")) filename = "athar-file";
        String mimeType = call.getString("mimeType", "application/octet-stream");
        if (mimeType == null || !mimeType.matches("[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+")) {
            mimeType = "application/octet-stream";
        }
        String title = call.getString("title", "أثر");

        try {
            int comma = base64.indexOf(',');
            if (base64.startsWith("data:") && comma > -1) {
                base64 = base64.substring(comma + 1);
            }
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);

            File sharedDir = new File(getContext().getCacheDir(), "shared");
            if (!sharedDir.exists() && !sharedDir.mkdirs()) {
                call.reject("could not create share dir");
                return;
            }
            pruneExpiredSharedFiles(sharedDir);
            // A unique directory prevents a same-day second export from
            // replacing bytes that a previous share target has not read yet.
            File stagedDir = new File(sharedDir, "backup-" + UUID.randomUUID());
            if (!stagedDir.mkdirs()) {
                call.reject("could not create staged share dir");
                return;
            }
            File out = new File(stagedDir, filename);
            try (FileOutputStream fos = new FileOutputStream(out)) {
                fos.write(bytes);
                fos.flush();
            }

            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                out
            );

            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mimeType);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.setClipData(ClipData.newUri(getContext().getContentResolver(), filename, uri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(send, title);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
            call.resolve();
        } catch (Throwable t) {
            call.reject("share failed: " + t.getMessage());
        }
    }

    /** Remove old cache-only share files after receivers have had time to read them. */
    private void pruneExpiredSharedFiles(File sharedDir) {
        File[] entries = sharedDir.listFiles();
        if (entries == null) return;
        long cutoff = System.currentTimeMillis() - SHARE_FILE_RETENTION_MILLIS;
        for (File entry : entries) {
            if (entry.lastModified() < cutoff) deleteRecursively(entry);
        }
    }

    private void deleteRecursively(File entry) {
        if (entry.isDirectory()) {
            File[] children = entry.listFiles();
            if (children != null) {
                for (File child : children) deleteRecursively(child);
            }
        }
        entry.delete(); // Best effort; this is private app cache and the OS may clear it too.
    }

    /**
     * Save an image into the device gallery.
     *
     * "Download" had the same hole as "share": the web path clicks an
     * <a download>, and a WebView has no download manager to receive it — so
     * the button did nothing at all while still reporting success. Writing
     * through MediaStore puts the file in Pictures/Athar where the gallery
     * picks it up, and needs no storage permission on Android 10+.
     */
    @PluginMethod
    public void saveImage(PluginCall call) {
        String base64 = call.getString("base64");
        if (base64 == null || base64.trim().isEmpty()) {
            call.reject("missing base64");
            return;
        }
        String filename = call.getString("filename", "athar.png");

        try {
            int comma = base64.indexOf(',');
            if (base64.startsWith("data:") && comma > -1) {
                base64 = base64.substring(comma + 1);
            }
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);

            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");

            Uri collection;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(MediaStore.Images.Media.RELATIVE_PATH,
                        Environment.DIRECTORY_PICTURES + File.separator + "Athar");
                // Hidden from the gallery until the bytes are actually written,
                // so a half-written file is never shown.
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
                collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            } else {
                collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
            }

            Uri item = resolver.insert(collection, values);
            if (item == null) {
                call.reject("could not create gallery entry");
                return;
            }

            try (OutputStream os = resolver.openOutputStream(item)) {
                if (os == null) {
                    call.reject("could not open gallery entry");
                    return;
                }
                os.write(bytes);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                resolver.update(item, values, null, null);
            }

            call.resolve();
        } catch (Throwable t) {
            call.reject("save failed: " + t.getMessage());
        }
    }

    @PluginMethod
    public void shareText(PluginCall call) {
        String text = call.getString("text", "");
        String title = call.getString("title", "أثر");
        if (text.trim().isEmpty()) {
            call.reject("missing text");
            return;
        }
        try {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT, text);
            Intent chooser = Intent.createChooser(send, title);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
            call.resolve();
        } catch (Throwable t) {
            call.reject("share failed: " + t.getMessage());
        }
    }
}
