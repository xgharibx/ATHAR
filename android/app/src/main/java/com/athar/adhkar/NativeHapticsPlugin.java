package com.athar.adhkar;

import android.content.Context;
import android.os.Build;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Crisp touch haptics for Android.
 *
 * The web view's Vibration API can only run the motor for a number of
 * milliseconds, which feels like a buzz. Android's predefined effects
 * (tick, click, heavy click) are tuned by each phone maker for its own motor,
 * the way the system keyboard and native apps feel. They are played as touch
 * feedback, so they follow the phone's own touch-feedback setting too.
 *
 * JS side: registerPlugin("NativeHaptics").play({ effect: "tick" | "click" | "heavy" })
 */
@CapacitorPlugin(name = "NativeHaptics")
public class NativeHapticsPlugin extends Plugin {

    private Vibrator vibrator;

    @Override
    public void load() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) getContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            vibrator = manager == null ? null : manager.getDefaultVibrator();
        } else {
            vibrator = legacyVibrator();
        }
    }

    @SuppressWarnings("deprecation")
    private Vibrator legacyVibrator() {
        return (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
    }

    @PluginMethod
    public void play(PluginCall call) {
        String effect = call.getString("effect", "click");
        if (vibrator == null || !vibrator.hasVibrator()) {
            call.resolve();
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int predefined;
            switch (effect == null ? "click" : effect) {
                case "tick":
                    predefined = VibrationEffect.EFFECT_TICK;
                    break;
                case "heavy":
                    predefined = VibrationEffect.EFFECT_HEAVY_CLICK;
                    break;
                default:
                    predefined = VibrationEffect.EFFECT_CLICK;
            }
            VibrationEffect vibration = VibrationEffect.createPredefined(predefined);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                vibrator.vibrate(vibration, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_TOUCH));
            } else {
                vibrator.vibrate(vibration);
            }
        } else {
            // Android 7 to 9: a short pulse of a matching length.
            long millis = "tick".equals(effect) ? 10 : "heavy".equals(effect) ? 40 : 20;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(millis, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                legacyVibrate(millis);
            }
        }
        call.resolve();
    }

    @SuppressWarnings("deprecation")
    private void legacyVibrate(long millis) {
        vibrator.vibrate(millis);
    }
}
