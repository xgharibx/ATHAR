/** Opens Athar's notification settings in the phone's own Settings app. */
import { Capacitor, registerPlugin } from "@capacitor/core";

type SystemSettingsPlugin = { openNotificationSettings(): Promise<void> };

export async function openNotificationSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await registerPlugin<SystemSettingsPlugin>("SystemSettings").openNotificationSettings();
    return true;
  } catch {
    return false;
  }
}
