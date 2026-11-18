package com.athar.adhkar;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

/**
 * Google Play's own in-app update: the new version downloads in the
 * background while the person keeps using Athar, then one tap restarts into
 * it. Builds for Huawei AppGallery skip it (no Play Store); there the update
 * pill opens the store page as before.
 *
 *   start()    → { started }  begins the download, after Play's own prompt
 *   complete() installs a downloaded update (restarts the app)
 *   status()   → { downloaded }
 * Event "state" { status: "downloading" | "downloaded" | "installing" | "failed" | "canceled", progress? }
 */
@CapacitorPlugin(name = "InAppUpdate")
public class InAppUpdatePlugin extends Plugin {

    private AppUpdateManager manager;
    private final InstallStateUpdatedListener listener = (state) -> {
        JSObject data = new JSObject();
        int status = state.installStatus();
        if (status == InstallStatus.DOWNLOADING) {
            data.put("status", "downloading");
            long total = state.totalBytesToDownload();
            if (total > 0) data.put("progress", (double) state.bytesDownloaded() / total);
        } else if (status == InstallStatus.DOWNLOADED) {
            data.put("status", "downloaded");
        } else if (status == InstallStatus.INSTALLING) {
            data.put("status", "installing");
        } else if (status == InstallStatus.FAILED) {
            data.put("status", "failed");
        } else if (status == InstallStatus.CANCELED) {
            data.put("status", "canceled");
        } else {
            return;
        }
        notifyListeners("state", data);
    };

    private boolean playBuild() {
        return "play".equals(StoreInfoPlugin.storeName(getContext()));
    }

    @Override
    public void load() {
        if (!playBuild()) return;
        manager = AppUpdateManagerFactory.create(getContext());
        manager.registerListener(listener);
    }

    @Override
    protected void handleOnDestroy() {
        if (manager != null) manager.unregisterListener(listener);
        super.handleOnDestroy();
    }

    @PluginMethod
    public void start(PluginCall call) {
        JSObject result = new JSObject();
        Activity activity = getActivity();
        if (manager == null || activity == null) {
            result.put("started", false);
            call.resolve(result);
            return;
        }
        manager.getAppUpdateInfo()
            .addOnSuccessListener((info) -> {
                boolean available = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                    && info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE);
                if (!available) {
                    result.put("started", false);
                    call.resolve(result);
                    return;
                }
                manager.startUpdateFlow(info, activity, AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build())
                    .addOnCompleteListener((flow) -> {
                        // RESULT_OK: accepted and downloading; anything else: declined.
                        result.put("started", flow.isSuccessful() && flow.getResult() != null && flow.getResult() == Activity.RESULT_OK);
                        call.resolve(result);
                    });
            })
            .addOnFailureListener((error) -> {
                result.put("started", false);
                call.resolve(result);
            });
    }

    @PluginMethod
    public void complete(PluginCall call) {
        if (manager == null) {
            call.resolve();
            return;
        }
        manager.completeUpdate();
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        if (manager == null) {
            result.put("downloaded", false);
            call.resolve(result);
            return;
        }
        manager.getAppUpdateInfo()
            .addOnSuccessListener((info) -> {
                result.put("downloaded", info.installStatus() == InstallStatus.DOWNLOADED);
                call.resolve(result);
            })
            .addOnFailureListener((error) -> {
                result.put("downloaded", false);
                call.resolve(result);
            });
    }
}
