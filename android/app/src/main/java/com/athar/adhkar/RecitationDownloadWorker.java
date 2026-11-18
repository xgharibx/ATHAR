package com.athar.adhkar;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Saves recitation verses for offline listening in the background, so a
 * surah or a juz' keeps downloading after the person leaves the app, locks
 * the phone or even restarts it. Verses already saved are skipped, so an
 * interrupted batch picks up where it stopped. When a batch ends while the
 * app is not on screen, a notification says so.
 *
 * Batches run one after another (unique work, appended). The list of verses
 * is kept in a small file, as WorkManager's own data is limited in size.
 */
public class RecitationDownloadWorker extends Worker {
    static final String WORK_NAME = "athar-recitation-downloads";
    private static final String KEY_BATCH = "batch";
    private static final String CHANNEL_ID = "athar-downloads-v1";
    private static final int NOTIFICATION_ID = 7340;
    private static final int MAX_ATTEMPTS = 3;

    /** The app's player, while it is open: progress and results for the waiting call. */
    interface Listener {
        void progress(String batch, int done, int total);
        void finished(String batch, int saved, int failed, int evicted);
    }

    @Nullable
    static volatile Listener listener;

    /** Set by AtharActivity: whether the app is on screen. */
    static volatile boolean appVisible;

    public RecitationDownloadWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    private static File queueDir(Context context) {
        return new File(context.getFilesDir(), "quran-audio-queue");
    }

    /** Queue a batch; returns its id. */
    static String enqueue(Context context, List<String> urls, long maxBytes, @Nullable String title) throws Exception {
        String batch = UUID.randomUUID().toString();
        JSONObject job = new JSONObject();
        job.put("urls", new JSONArray(urls));
        job.put("maxBytes", maxBytes);
        job.put("title", title == null ? "" : title);
        File dir = queueDir(context);
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IllegalStateException("no queue folder");
        try (OutputStream out = new FileOutputStream(new File(dir, batch + ".json"))) {
            out.write(job.toString().getBytes(StandardCharsets.UTF_8));
        }
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(RecitationDownloadWorker.class)
            .setInputData(new Data.Builder().putString(KEY_BATCH, batch).build())
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build();
        WorkManager.getInstance(context).enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request);
        return batch;
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        String batch = getInputData().getString(KEY_BATCH);
        if (batch == null) return Result.failure();
        File jobFile = new File(queueDir(context), batch + ".json");
        JSONObject job;
        try (InputStream in = new FileInputStream(jobFile)) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) bytes.write(buffer, 0, read);
            job = new JSONObject(new String(bytes.toByteArray(), StandardCharsets.UTF_8));
        } catch (Exception e) {
            return Result.failure();
        }
        JSONArray urls = job.optJSONArray("urls");
        int total = urls == null ? 0 : urls.length();
        int saved = 0;
        int failed = 0;
        Set<String> kept = new HashSet<>();
        for (int i = 0; i < total; i++) {
            // Stopped by the system (no network, battery saver): carry on later.
            if (isStopped()) return Result.retry();
            String url = urls.optString(i, "");
            if (RecitationDownloads.save(context, url)) {
                saved++;
                File file = RecitationDownloads.fileFor(context, url);
                if (file != null) kept.add(file.getAbsolutePath());
            } else {
                failed++;
            }
            Listener current = listener;
            if (current != null) current.progress(batch, i + 1, total);
        }
        // A few verses failed (a dropped connection): try the batch again later.
        if (failed > 0 && saved > 0 && getRunAttemptCount() + 1 < MAX_ATTEMPTS) return Result.retry();

        int evicted = RecitationDownloads.enforceBudget(context, Math.max(1, job.optLong("maxBytes", 1L << 30)), kept);
        //noinspection ResultOfMethodCallIgnored
        jobFile.delete();
        Listener current = listener;
        if (current != null) current.finished(batch, saved, failed, evicted);
        if (!appVisible && saved > 0) notifyDone(context, job.optString("title", ""), saved, total);
        return Result.success();
    }

    private static void notifyDone(Context context, String title, int saved, int total) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager system = context.getSystemService(NotificationManager.class);
            if (system != null && system.getNotificationChannel(CHANNEL_ID) == null) {
                system.createNotificationChannel(new NotificationChannel(CHANNEL_ID,
                    context.getString(R.string.downloads_channel), NotificationManager.IMPORTANCE_LOW));
            }
        }
        Intent open = new Intent(context, AtharActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .putExtra(AtharWidgetProvider.EXTRA_ROUTE, "/mushaf");
        PendingIntent tap = PendingIntent.getActivity(context, NOTIFICATION_ID, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String body = saved == total
            ? context.getString(R.string.downloads_done_all, saved)
            : context.getString(R.string.downloads_done_some, saved, total);
        try {
            manager.notify(NOTIFICATION_ID, new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_athar_notification)
                .setContentTitle(title.isEmpty() ? context.getString(R.string.downloads_title) : title)
                .setContentText(body)
                .setContentIntent(tap)
                .setAutoCancel(true)
                .build());
        } catch (SecurityException ignored) {
            // Notifications not allowed.
        }
    }
}
