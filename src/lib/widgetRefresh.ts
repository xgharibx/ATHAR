/**
 * Instant home-screen widget refresh.
 *
 * Android widgets normally repaint only every 30 minutes (updatePeriodMillis
 * minimum). This bridges to the native WidgetRefreshPlugin so widgets update
 * the moment the app writes fresh data via @capacitor/preferences.
 *
 * On iOS the same call copies the data into the App Group the WidgetKit
 * extension reads and reloads its timelines (WidgetRefreshPlugin.swift).
 * No-op on the web.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

type WidgetRefreshPlugin = {
  refresh(): Promise<void>;
};

const WidgetRefresh = registerPlugin<WidgetRefreshPlugin>("WidgetRefresh");

export async function refreshHomeWidgets(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await WidgetRefresh.refresh();
  } catch {
    // Plugin not available (older binary) — widgets fall back to periodic updates.
  }
}
