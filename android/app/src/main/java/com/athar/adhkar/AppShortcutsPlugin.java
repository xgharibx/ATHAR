package com.athar.adhkar;

import android.content.Intent;

import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * «تابع القراءة»: a long-press shortcut on the app icon that opens the Mushaf
 * on the page last read (src/lib/continueReading.ts keeps it current). It
 * sits next to the fixed shortcuts in res/xml/shortcuts.xml, and Android also
 * offers it in its own suggestions.
 *
 *   setContinueReading({ page, label })
 */
@CapacitorPlugin(name = "AppShortcuts")
public class AppShortcutsPlugin extends Plugin {
    static final String CONTINUE_READING_ID = "continue_reading";

    @PluginMethod
    public void setContinueReading(PluginCall call) {
        Integer page = call.getInt("page");
        if (page == null || page < 1 || page > 604) {
            call.reject("page must be 1..604");
            return;
        }
        String label = call.getString("label", "تابع القراءة");
        Intent intent = new Intent(getContext(), AtharActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .putExtra(AtharWidgetProvider.EXTRA_ROUTE, "/quran/page/" + page);
        ShortcutInfoCompat shortcut = new ShortcutInfoCompat.Builder(getContext(), CONTINUE_READING_ID)
            .setShortLabel("تابع القراءة")
            .setLongLabel(label)
            .setIcon(IconCompat.createWithResource(getContext(), R.drawable.ic_shortcut_mushaf))
            .setIntent(intent)
            .setRank(0)
            .build();
        try {
            ShortcutManagerCompat.pushDynamicShortcut(getContext(), shortcut);
            call.resolve();
        } catch (RuntimeException e) {
            // Launchers may refuse while rate limited; the next page change tries again.
            call.reject("shortcut not updated");
        }
    }
}
