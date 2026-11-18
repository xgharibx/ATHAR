package com.athar.adhkar;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The app lock: the phone's own fingerprint or face unlock, with the screen
 * lock PIN, pattern or password as the fallback, so nobody is ever locked out
 * of Athar by a sensor that fails.
 *
 *   status()  → { available, biometric }
 *   authenticate({ title, reason }) → { success, cancelled }
 */
@CapacitorPlugin(name = "AppLock")
public class AppLockPlugin extends Plugin {

    /** Fingerprint/face, or the device's own screen lock. Supported on every Android version Athar runs on. */
    private static final int AUTHENTICATORS =
        BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL;

    @PluginMethod
    public void status(PluginCall call) {
        BiometricManager manager = BiometricManager.from(getContext());
        JSObject result = new JSObject();
        result.put("available", manager.canAuthenticate(AUTHENTICATORS) == BiometricManager.BIOMETRIC_SUCCESS);
        result.put("biometric", manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS);
        call.resolve(result);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        if (!(getActivity() instanceof FragmentActivity)) {
            call.reject("The app lock is unavailable");
            return;
        }
        FragmentActivity activity = (FragmentActivity) getActivity();
        String title = call.getString("title", "أثر");
        String reason = call.getString("reason", "افتح أثر");
        activity.runOnUiThread(() -> {
            BiometricPrompt prompt = new BiometricPrompt(
                activity,
                ContextCompat.getMainExecutor(activity),
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        JSObject data = new JSObject();
                        data.put("success", true);
                        data.put("cancelled", false);
                        call.resolve(data);
                    }

                    @Override
                    public void onAuthenticationError(int code, CharSequence message) {
                        JSObject data = new JSObject();
                        data.put("success", false);
                        data.put("cancelled", code == BiometricPrompt.ERROR_USER_CANCELED
                            || code == BiometricPrompt.ERROR_CANCELED
                            || code == BiometricPrompt.ERROR_NEGATIVE_BUTTON);
                        data.put("message", message == null ? "" : message.toString());
                        call.resolve(data);
                    }
                    // onAuthenticationFailed: one unrecognised try; the prompt stays open for another.
                }
            );
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(reason)
                .setAllowedAuthenticators(AUTHENTICATORS)
                .build();
            prompt.authenticate(info);
        });
    }
}
