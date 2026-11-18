package com.athar.adhkar;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

/**
 * Hands the app the notification buttons pressed while it was not looking
 * (NotificationActionReceiver), and tells it when one is pressed while open.
 *
 *   drain() → { actions: [{ id, actionId, extra, title, body, handled, at }] }
 *   event "queued"
 */
@CapacitorPlugin(name = "NotificationActions")
public class NotificationActionsPlugin extends Plugin {

    @Override
    public void load() {
        super.load();
        NotificationActionReceiver.listener = () -> notifyListeners("queued", new JSObject());
    }

    @PluginMethod
    public void drain(PluginCall call) {
        JSONArray actions = NotificationActionReceiver.drain(getContext());
        JSObject result = new JSObject();
        try {
            result.put("actions", new JSArray(actions.toString()));
        } catch (Exception e) {
            result.put("actions", new JSArray());
        }
        call.resolve(result);
    }

    @Override
    protected void handleOnDestroy() {
        NotificationActionReceiver.listener = null;
        super.handleOnDestroy();
    }
}
