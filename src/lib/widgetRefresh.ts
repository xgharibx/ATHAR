/**
 * Instant home-screen widget refresh.
 *
 * Android widgets normally repaint only every 30 minutes (updatePeriodMillis
 * minimum). This bridges to the native WidgetRefreshPlugin so widgets update
 * the moment the app writes fresh data via @capacitor/preferences.
 *
 * Safe everywhere: no-ops on web and iOS (iOS widgets refresh via WidgetKit
 * timelines once the WidgetKit extension ships).
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

type WidgetRefreshPlugin = {
  refresh(): Promise<void>;
};

const WidgetRefresh = registerPlugin<WidgetRefreshPlugin>("WidgetRefresh");

export async function refreshHomeWidgets(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await WidgetRefresh.refresh();
  } catch {
    // Plugin not available (older binary) — widgets fall back to periodic updates.
  }
}
