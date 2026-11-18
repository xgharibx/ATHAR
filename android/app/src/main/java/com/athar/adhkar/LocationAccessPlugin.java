package com.athar.adhkar;

import android.Manifest;
import android.content.pm.PackageManager;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Whether the location permission is already granted, without asking for it
 * (src/lib/travelLocation.ts only checks for travel when it is).
 */
@CapacitorPlugin(name = "LocationAccess")
public class LocationAccessPlugin extends Plugin {
    @PluginMethod
    public void status(PluginCall call) {
        boolean coarse = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean fine = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        JSObject result = new JSObject();
        result.put("granted", coarse || fine);
        call.resolve(result);
    }
}
