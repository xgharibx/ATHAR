package com.athar.adhkar;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * A notification channel that vibrates and makes no sound whatsoever.
 *
 * This cannot be done through @capacitor/local-notifications. Its
 * NotificationChannelManager only calls setSound() when a sound name was
 * supplied — so a channel created without one keeps the channel default, which
 * at IMPORTANCE_DEFAULT is the system notification sound. "No sound field"
 * means "the default ping", not silence.
 *
 * Silence requires setSound(null, null) explicitly, and vibration requires
 * importance >= DEFAULT (a LOW channel is silent but never vibrates either).
 * That combination is only reachable from native code, which is all this is.
 *
 * Channels are immutable after creation: changing any of this later needs a new
 * id, not an edit.
 */
@CapacitorPlugin(name = "QuietChannel")
public class QuietChannelPlugin extends Plugin {

    @PluginMethod
    public void create(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            // Pre-Oreo has no channels; the notification's own settings apply.
            call.resolve();
            return;
        }

        String id = call.getString("id");
        if (id == null || id.trim().isEmpty()) {
            call.reject("missing channel id");
            return;
        }
        String name = call.getString("name", "Athar");
        String description = call.getString("description", "");

        try {
            NotificationChannel channel = new NotificationChannel(
                id,
                name,
                NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription(description);
            // The whole point: no sound, and no audio attributes to fall back to.
            channel.setSound(null, null);
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager manager =
                (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) {
                call.reject("no notification manager");
                return;
            }
            manager.createNotificationChannel(channel);
            call.resolve();
        } catch (Throwable t) {
            call.reject("could not create channel: " + t.getMessage());
        }
    }
}
