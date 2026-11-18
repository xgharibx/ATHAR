package com.athar.adhkar;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The app icon chosen in Settings › أيقونة التطبيق.
 *
 * Each icon is an activity-alias of AtharActivity with its own launcher icon
 * (AndroidManifest.xml); exactly one is enabled. Launchers redraw the app when
 * the enabled alias changes, and some close it, so the change is applied when
 * the app goes to the background (AtharActivity.onStop), never in the user's
 * hands.
 *
 *   set({ name: "default" | "light" | "dark" | "ramadan" | "gold" })
 *   get() → { name }
 */
@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {

    static final String[] NAMES = { "default", "light", "dark", "ramadan", "gold" };
    private static final String PREFS = "athar_app_icon";
    private static final String PENDING = "pending";
    private static final String CURRENT = "current";

    static String aliasFor(String name) {
        switch (name) {
            case "light": return ".MainActivityLight";
            case "dark": return ".MainActivityDark";
            case "ramadan": return ".MainActivityRamadan";
            case "gold": return ".MainActivityGold";
            default: return ".MainActivity";
        }
    }

    private static boolean valid(String name) {
        for (String known : NAMES) if (known.equals(name)) return true;
        return false;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void set(PluginCall call) {
        String name = call.getString("name", "default");
        if (name == null || !valid(name)) {
            call.reject("unknown icon");
            return;
        }
        prefs(getContext()).edit().putString(PENDING, name).apply();
        JSObject result = new JSObject();
        result.put("name", name);
        result.put("appliesOnLeave", true);
        call.resolve(result);
    }

    @PluginMethod
    public void get(PluginCall call) {
        SharedPreferences prefs = prefs(getContext());
        JSObject result = new JSObject();
        result.put("name", prefs.getString(PENDING, prefs.getString(CURRENT, "default")));
        call.resolve(result);
    }

    /** Switch the enabled alias if a new icon was chosen. Called as the app leaves the screen. */
    static void applyPending(Context context) {
        SharedPreferences prefs = prefs(context);
        String pending = prefs.getString(PENDING, null);
        if (pending == null) return;
        String current = prefs.getString(CURRENT, "default");
        prefs.edit().remove(PENDING).apply();
        if (pending.equals(current)) return;
        try {
            PackageManager pm = context.getPackageManager();
            String pkg = context.getPackageName();
            // Enable the new icon before disabling the old one, so there is
            // never a moment with no launcher entry.
            pm.setComponentEnabledSetting(
                new ComponentName(pkg, pkg + aliasFor(pending)),
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            );
            for (String name : NAMES) {
                if (name.equals(pending)) continue;
                pm.setComponentEnabledSetting(
                    new ComponentName(pkg, pkg + aliasFor(name)),
                    "default".equals(name)
                        ? PackageManager.COMPONENT_ENABLED_STATE_DISABLED
                        : PackageManager.COMPONENT_ENABLED_STATE_DEFAULT,
                    PackageManager.DONT_KILL_APP
                );
            }
            prefs.edit().putString(CURRENT, pending).apply();
        } catch (RuntimeException e) {
            // Keep whatever icon is showing; the choice can be made again.
        }
    }
}
