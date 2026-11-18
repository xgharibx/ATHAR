package com.athar.adhkar;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;

/**
 * The phone's location for prayer times, Qibla, nearby mosques and travel
 * checks (src/lib/deviceLocation.ts), from Android's own LocationManager, so
 * it works on phones without Google services as well. One system question,
 * which on Android 12+ lets the person choose an approximate location.
 *
 *   status() → { granted }   never asks
 *   current({ precise, timeoutMs, maxAgeMs, onlyIfGranted })
 *       → { lat, lng, accuracy, approximate }
 *       rejects with code "denied", "unavailable" or "timeout"
 */
@CapacitorPlugin(
    name = "LocationAccess",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION })
    }
)
public class LocationAccessPlugin extends Plugin {

    private final Handler main = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasCoarse() || hasFine());
        call.resolve(result);
    }

    @PluginMethod
    public void current(PluginCall call) {
        if (hasCoarse() || hasFine()) {
            locate(call);
            return;
        }
        if (Boolean.TRUE.equals(call.getBoolean("onlyIfGranted", false))) {
            call.reject("denied", "denied");
            return;
        }
        requestPermissionForAlias("location", call, "locationPermissionCallback");
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED || hasCoarse() || hasFine()) {
            locate(call);
        } else {
            call.reject("denied", "denied");
        }
    }

    private boolean hasCoarse() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasFine() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    /** Providers worth asking, best first, that are switched on. */
    private List<String> providers(LocationManager manager, boolean precise) {
        List<String> wanted = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) wanted.add(LocationManager.FUSED_PROVIDER);
        if (precise && hasFine()) wanted.add(LocationManager.GPS_PROVIDER);
        wanted.add(LocationManager.NETWORK_PROVIDER);
        if (!precise && hasFine()) wanted.add(LocationManager.GPS_PROVIDER);
        List<String> available = new ArrayList<>();
        for (String provider : wanted) {
            try {
                if (manager.getAllProviders().contains(provider) && manager.isProviderEnabled(provider)) available.add(provider);
            } catch (IllegalArgumentException ignored) {
                // Not on this phone.
            }
        }
        return available;
    }

    @SuppressLint("MissingPermission")
    private void locate(PluginCall call) {
        if (!hasCoarse() && !hasFine()) {
            call.reject("denied", "denied");
            return;
        }
        Context context = getContext();
        LocationManager manager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) {
            call.reject("unavailable", "unavailable");
            return;
        }
        boolean precise = Boolean.TRUE.equals(call.getBoolean("precise", false));
        long timeoutMs = Math.max(1000L, call.getLong("timeoutMs", 10_000L));
        long maxAgeMs = Math.max(0L, call.getLong("maxAgeMs", 0L));
        List<String> providers = providers(manager, precise);
        if (providers.isEmpty()) {
            // Location is switched off in the phone's settings.
            call.reject("unavailable", "unavailable");
            return;
        }

        Location recent = bestLastKnown(manager, providers);
        if (recent != null && maxAgeMs > 0 && ageMs(recent) <= maxAgeMs) {
            resolve(call, recent);
            return;
        }

        Fix fix = new Fix(call, manager);
        for (String provider : providers) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                CancellationSignal signal = new CancellationSignal();
                fix.signals.add(signal);
                manager.getCurrentLocation(provider, signal, ContextCompat.getMainExecutor(context), (location) -> {
                    if (location != null) fix.deliver(location);
                });
            } else {
                LocationListener listener = new SingleListener(fix);
                fix.listeners.add(listener);
                requestSingle(manager, provider, listener);
            }
        }
        main.postDelayed(() -> {
            if (fix.done) return;
            // Better a fix from the last half hour than nothing.
            Location fallback = bestLastKnown(manager, providers);
            if (fallback != null && ageMs(fallback) <= 30L * 60_000L) fix.deliver(fallback);
            else fix.fail("timeout");
        }, timeoutMs);
    }

    @SuppressWarnings("deprecation")
    @SuppressLint("MissingPermission")
    private static void requestSingle(LocationManager manager, String provider, LocationListener listener) {
        manager.requestSingleUpdate(provider, listener, Looper.getMainLooper());
    }

    @SuppressLint("MissingPermission")
    private static Location bestLastKnown(LocationManager manager, List<String> providers) {
        Location best = null;
        for (String provider : providers) {
            try {
                Location location = manager.getLastKnownLocation(provider);
                if (location == null) continue;
                if (best == null || location.getElapsedRealtimeNanos() > best.getElapsedRealtimeNanos()) best = location;
            } catch (SecurityException | IllegalArgumentException ignored) {
                // Skip this provider.
            }
        }
        return best;
    }

    private static long ageMs(Location location) {
        return (SystemClock.elapsedRealtimeNanos() - location.getElapsedRealtimeNanos()) / 1_000_000L;
    }

    private void resolve(PluginCall call, Location location) {
        JSObject result = new JSObject();
        result.put("lat", location.getLatitude());
        result.put("lng", location.getLongitude());
        if (location.hasAccuracy()) result.put("accuracy", (double) location.getAccuracy());
        // Only the approximate permission: Android blurs the location to about 2 km.
        result.put("approximate", !hasFine());
        call.resolve(result);
    }

    /** One request across several providers: the first fix wins. */
    private final class Fix {
        final PluginCall call;
        final LocationManager manager;
        final List<CancellationSignal> signals = new ArrayList<>();
        final List<LocationListener> listeners = new ArrayList<>();
        boolean done;

        Fix(PluginCall call, LocationManager manager) {
            this.call = call;
            this.manager = manager;
        }

        void deliver(Location location) {
            if (done) return;
            done = true;
            stop();
            resolve(call, location);
        }

        void fail(String reason) {
            if (done) return;
            done = true;
            stop();
            call.reject(reason, reason);
        }

        private void stop() {
            for (CancellationSignal signal : signals) signal.cancel();
            for (LocationListener listener : listeners) manager.removeUpdates(listener);
        }
    }

    private static final class SingleListener implements LocationListener {
        private final Fix fix;

        SingleListener(Fix fix) {
            this.fix = fix;
        }

        @Override
        public void onLocationChanged(@NonNull Location location) {
            fix.deliver(location);
        }

        @Override
        public void onStatusChanged(String provider, int status, Bundle extras) {}

        @Override
        public void onProviderEnabled(@NonNull String provider) {}

        @Override
        public void onProviderDisabled(@NonNull String provider) {}
    }
}
