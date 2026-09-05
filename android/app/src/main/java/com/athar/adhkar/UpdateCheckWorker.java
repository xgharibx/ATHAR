package com.athar.adhkar;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.TimeUnit;

/**
 * Tell people a new version is out, without them having to open the app.
 *
 * The in-app pill only helps someone already looking at the app; the people who
 * most need to know they are on an old build are the ones who have not opened
 * it for days. This runs about once a day while the app is closed, asks the
 * live site what the current version is, and posts one notification when it is
 * ahead of the installed one.
 *
 * No Firebase and no server: the site already publishes version.json at build
 * time, so a plain HTTPS GET answers the question. Push would mean a project,
 * a key, a token registry and a send path for one line of text a month.
 *
 * Notifies once per version. A reminder that repeats every day about the same
 * release is an app people mute.
 */
public class UpdateCheckWorker extends Worker {

    private static final String WORK_NAME = "athar-update-check";
    private static final String CHANNEL_ID = "athar-updates-v1";
    private static final String PREFS = "athar_update_check";
    private static final String KEY_NOTIFIED_FOR = "notified_for_version";
    private static final int NOTIFICATION_ID = 90210;

    private static final String MANIFEST_URL = "https://www.athark.org/version.json";
    private static final String STORE_URL =
        "https://play.google.com/store/apps/details?id=com.athar.adhkar&hl=ar";

    public UpdateCheckWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    /**
     * Register the daily check. Idempotent — KEEP means an existing schedule
     * survives an app restart rather than being torn down and rebuilt, which
     * would reset its 24-hour clock every launch and mean it never ran.
     */
    public static void schedule(Context context) {
        try {
            Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

            PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
                UpdateCheckWorker.class, 1, TimeUnit.DAYS
            )
                .setConstraints(constraints)
                // Nothing here is urgent; let the system pick a cheap moment.
                .setInitialDelay(6, TimeUnit.HOURS)
                .build();

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request
            );
        } catch (Throwable t) {
            // A failed schedule must never stop the app from starting.
        }
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            String latest = fetchLatestVersion();
            if (latest == null) return Result.retry();

            String current = installedVersion();
            if (current == null) return Result.success();
            if (!isNewer(latest, current)) return Result.success();

            SharedPreferences prefs =
                getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            if (latest.equals(prefs.getString(KEY_NOTIFIED_FOR, null))) {
                return Result.success(); // already told them about this one
            }

            // Only remember it as delivered if it actually was. Notifications
            // can be dropped outright — POST_NOTIFICATIONS not granted on 13+,
            // or the channel switched off — and recording those as "told them"
            // means the user who later turns notifications on never hears about
            // this release at all.
            if (!notifyUpdate(latest)) return Result.success();
            prefs.edit().putString(KEY_NOTIFIED_FOR, latest).apply();
            return Result.success();
        } catch (Throwable t) {
            return Result.retry();
        }
    }

    /**
     * The running app's own versionName.
     *
     * Read from the package manager rather than BuildConfig, which this module
     * does not generate (AGP 8 needs buildFeatures.buildConfig opted in, and
     * turning that on for one string is not worth the build surface).
     */
    private String installedVersion() {
        try {
            Context context = getApplicationContext();
            return context.getPackageManager()
                .getPackageInfo(context.getPackageName(), 0)
                .versionName;
        } catch (Throwable t) {
            return null;
        }
    }

    private String fetchLatestVersion() {
        HttpURLConnection conn = null;
        try {
            // Cache-busted: a cached copy is a copy of the answer we already had.
            URL url = new URL(MANIFEST_URL + "?t=" + System.currentTimeMillis());
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.setRequestProperty("Cache-Control", "no-cache");
            if (conn.getResponseCode() != 200) return null;

            StringBuilder body = new StringBuilder();
            try (BufferedReader reader =
                     new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = reader.readLine()) != null) body.append(line);
            }
            String version = new JSONObject(body.toString()).optString("version", "");
            return version.isEmpty() ? null : version;
        } catch (Throwable t) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /** Numeric comparison — "1.2.9" sorts above "1.2.10" as text. */
    static boolean isNewer(String latest, String current) {
        String[] a = latest.split("\\.");
        String[] b = current.split("\\.");
        int len = Math.max(a.length, b.length);
        for (int i = 0; i < len; i++) {
            int x = i < a.length ? parse(a[i]) : 0;
            int y = i < b.length ? parse(b[i]) : 0;
            if (x != y) return x > y;
        }
        return false;
    }

    private static int parse(String s) {
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /** @return true only if the notification was genuinely posted. */
    private boolean notifyUpdate(String latest) {
        Context context = getApplicationContext();
        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return false;
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Athar — تحديثات التطبيق",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("إشعار عند توفر إصدار جديد من التطبيق");
            // LOW: silent and no heads-up. A new version is worth knowing about,
            // not worth interrupting anything for.
            channel.setShowBadge(false);
            manager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(STORE_URL));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent pending = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_athar_notification)
            .setContentTitle("تحديث جديد من أثر")
            .setContentText("الإصدار " + latest + " متاح الآن — حدّث لتحصل على آخر الإضافات")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .build();

        try {
            manager.notify(NOTIFICATION_ID, notification);
            return true;
        } catch (SecurityException e) {
            // POST_NOTIFICATIONS revoked between the check and the post.
            return false;
        }
    }
}
