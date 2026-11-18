package com.athar.adhkar;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opens Athar's page in the phone's own Settings (Settings › التذكيرات › إذن
 * الإشعارات), for when notifications were refused.
 *
 * JS side: registerPlugin("SystemSettings").openNotificationSettings()
 */
@CapacitorPlugin(name = "SystemSettings")
public class SystemSettingsPlugin extends Plugin {

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        String pkg = getContext().getPackageName();
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, pkg);
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", pkg, null));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception first) {
            try {
                Intent details = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", pkg, null));
                details.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(details);
                call.resolve();
            } catch (Exception second) {
                call.reject("settings unavailable");
            }
        }
    }
}
