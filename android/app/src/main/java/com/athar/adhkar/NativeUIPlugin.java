package com.athar.adhkar;

import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Build;
import android.text.format.DateFormat;
import android.util.AtomicFile;
import android.util.Base64;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.Locale;
import org.json.JSONObject;

/**
 * The phone's own controls where the app used web ones:
 *
 *   setBackSwipe({ enabled })          nothing to do: Android's back gesture already works
 *   copyText({ text })                 the system clipboard → { systemConfirms } (Android 13+
 *                                      shows its own "copied" message, so the app skips its toast)
 *   pickDate({ value?, min?, max? })   the system calendar  → { value: "yyyy-MM-dd" }
 *   pickTime({ value? })               the system clock     → { value: "HH:mm" }
 *   setPullToRefresh({ enabled })      the system refresh spinner; fires "pullToRefresh"
 *   endPullToRefresh()
 *   vaultWrite / vaultRemove / vaultClear
 *                                      a copy of the app's saved data in the app's own files,
 *                                      which Android does not clear the way it may clear a
 *                                      web view's storage (see NativeVault)
 *
 * A picker the person closes without choosing rejects with "cancelled".
 */
@CapacitorPlugin(name = "NativeUI")
public class NativeUIPlugin extends Plugin {

    private SwipeRefreshLayout refreshLayout;

    @PluginMethod
    public void setBackSwipe(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void copyText(PluginCall call) {
        String text = call.getString("text", "");
        getActivity().runOnUiThread(() -> {
            ClipboardManager cm = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm == null) {
                call.reject("clipboard unavailable");
                return;
            }
            cm.setPrimaryClip(ClipData.newPlainText("Athar", text));
            JSObject out = new JSObject();
            out.put("systemConfirms", Build.VERSION.SDK_INT >= 33);
            call.resolve(out);
        });
    }

    // ── Pickers ─────────────────────────────────────────────────────────────

    @PluginMethod
    public void pickDate(PluginCall call) {
        int[] initial = parseDay(call.getString("value"));
        int[] min = parseDay(call.getString("min"));
        int[] max = parseDay(call.getString("max"));
        getActivity().runOnUiThread(() -> {
            Calendar now = Calendar.getInstance();
            int y = initial != null ? initial[0] : now.get(Calendar.YEAR);
            int m = initial != null ? initial[1] - 1 : now.get(Calendar.MONTH);
            int d = initial != null ? initial[2] : now.get(Calendar.DAY_OF_MONTH);
            final boolean[] done = { false };
            DatePickerDialog dialog = new DatePickerDialog(getActivity(), (view, year, month, day) -> {
                if (done[0]) return;
                done[0] = true;
                JSObject out = new JSObject();
                out.put("value", String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, day));
                call.resolve(out);
            }, y, m, d);
            if (Boolean.TRUE.equals(call.getBoolean("clearable", false))) {
                dialog.setButton(android.content.DialogInterface.BUTTON_NEUTRAL, "مسح", (di, which) -> {
                    if (done[0]) return;
                    done[0] = true;
                    JSObject out = new JSObject();
                    out.put("value", "");
                    call.resolve(out);
                });
            }
            if (min != null) dialog.getDatePicker().setMinDate(millis(min));
            if (max != null) dialog.getDatePicker().setMaxDate(millis(max));
            dialog.setOnDismissListener((di) -> {
                if (done[0]) return;
                done[0] = true;
                call.reject("cancelled");
            });
            dialog.show();
        });
    }

    @PluginMethod
    public void pickTime(PluginCall call) {
        String value = call.getString("value");
        getActivity().runOnUiThread(() -> {
            Calendar now = Calendar.getInstance();
            int h = now.get(Calendar.HOUR_OF_DAY);
            int min = now.get(Calendar.MINUTE);
            if (value != null && value.matches("\\d{1,2}:\\d{2}")) {
                String[] parts = value.split(":");
                h = Integer.parseInt(parts[0]);
                min = Integer.parseInt(parts[1]);
            }
            final boolean[] done = { false };
            TimePickerDialog dialog = new TimePickerDialog(getActivity(), (view, hour, minute) -> {
                if (done[0]) return;
                done[0] = true;
                JSObject out = new JSObject();
                out.put("value", String.format(Locale.US, "%02d:%02d", hour, minute));
                call.resolve(out);
            }, h, min, DateFormat.is24HourFormat(getContext()));
            dialog.setOnDismissListener((di) -> {
                if (done[0]) return;
                done[0] = true;
                call.reject("cancelled");
            });
            dialog.show();
        });
    }

    private static int[] parseDay(String v) {
        if (v == null || !v.matches("\\d{4}-\\d{2}-\\d{2}")) return null;
        String[] p = v.split("-");
        return new int[] { Integer.parseInt(p[0]), Integer.parseInt(p[1]), Integer.parseInt(p[2]) };
    }

    private static long millis(int[] day) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(day[0], day[1] - 1, day[2]);
        return c.getTimeInMillis();
    }

    // ── Pull to refresh ─────────────────────────────────────────────────────

    @PluginMethod
    public void setPullToRefresh(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        getActivity().runOnUiThread(() -> {
            if (enabled && refreshLayout == null) wrapWebView();
            if (refreshLayout != null) {
                if (!enabled) refreshLayout.setRefreshing(false);
                refreshLayout.setEnabled(enabled);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void endPullToRefresh(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (refreshLayout != null) refreshLayout.setRefreshing(false);
            call.resolve();
        });
    }

    /** Puts the system refresh layout around the web view, once, keeping its place and size. */
    private void wrapWebView() {
        WebView webView = getBridge().getWebView();
        if (webView == null || !(webView.getParent() instanceof ViewGroup)) return;
        ViewGroup parent = (ViewGroup) webView.getParent();
        int index = parent.indexOfChild(webView);
        ViewGroup.LayoutParams params = webView.getLayoutParams();
        parent.removeView(webView);

        SwipeRefreshLayout layout = new SwipeRefreshLayout(getContext());
        layout.addView(webView, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        parent.addView(layout, index, params);
        // Only when the page is at its top; otherwise the pull scrolls the page.
        layout.setOnChildScrollUpCallback((p, child) -> webView.getScrollY() > 0);
        layout.setOnRefreshListener(() -> notifyListeners("pullToRefresh", new JSObject()));
        layout.setColorSchemeColors(0xFF2F4F37);
        layout.setEnabled(false);
        refreshLayout = layout;
        webView.requestFocus();
    }

    // ── Saved-data copy ─────────────────────────────────────────────────────

    @PluginMethod
    public void vaultWrite(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || value == null) {
            call.reject("key and value are required");
            return;
        }
        getBridge().execute(() -> {
            if (NativeVault.write(getContext(), key, value)) call.resolve();
            else call.reject("write failed");
        });
    }

    @PluginMethod
    public void vaultRemove(PluginCall call) {
        String key = call.getString("key", "");
        getBridge().execute(() -> {
            NativeVault.remove(getContext(), key);
            call.resolve();
        });
    }

    @PluginMethod
    public void vaultClear(PluginCall call) {
        getBridge().execute(() -> {
            NativeVault.clear(getContext());
            call.resolve();
        });
    }

    /** The copy of the web view's saved data: one file per key, written atomically. */
    static final class NativeVault {
        private NativeVault() {}

        private static File dir(Context ctx) {
            File d = new File(ctx.getFilesDir(), "athar-vault");
            if (!d.exists()) d.mkdirs();
            return d;
        }

        private static File file(Context ctx, String key) {
            String safe = Base64.encodeToString(key.getBytes(StandardCharsets.UTF_8), Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
            return new File(dir(ctx), safe + ".json");
        }

        static boolean write(Context ctx, String key, String value) {
            AtomicFile f = new AtomicFile(file(ctx, key));
            FileOutputStream out = null;
            try {
                JSONObject obj = new JSONObject();
                obj.put("k", key);
                obj.put("v", value);
                out = f.startWrite();
                out.write(obj.toString().getBytes(StandardCharsets.UTF_8));
                f.finishWrite(out);
                return true;
            } catch (Exception e) {
                if (out != null) f.failWrite(out);
                return false;
            }
        }

        static void remove(Context ctx, String key) {
            new AtomicFile(file(ctx, key)).delete();
        }

        static void clear(Context ctx) {
            File[] files = dir(ctx).listFiles();
            if (files == null) return;
            for (File f : files) f.delete();
        }

        /** Every saved key and value as one JSON object, for the page to restore what the web view lost. */
        static String readAll(Context ctx) {
            JSONObject all = new JSONObject();
            File[] files = dir(ctx).listFiles();
            if (files == null) return "{}";
            for (File f : files) {
                if (!f.getName().endsWith(".json")) continue;
                try (FileInputStream in = new FileInputStream(f)) {
                    byte[] bytes = new byte[(int) f.length()];
                    int read = 0;
                    while (read < bytes.length) {
                        int n = in.read(bytes, read, bytes.length - read);
                        if (n < 0) break;
                        read += n;
                    }
                    JSONObject obj = new JSONObject(new String(bytes, 0, read, StandardCharsets.UTF_8));
                    all.put(obj.getString("k"), obj.getString("v"));
                } catch (Exception ignored) {
                    // A damaged file is skipped; the rest still restore.
                }
            }
            return all.toString();
        }
    }
}
