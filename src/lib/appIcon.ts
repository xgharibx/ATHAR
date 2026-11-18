/**
 * The app icon chosen in Settings › أيقونة التطبيق (AppIconPlugin): iOS
 * alternate icons, Android launcher aliases. The icons are recolours of the
 * real one (tools/scripts/generate_app_icon_variants.py).
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

export const APP_ICONS = ["default", "light", "dark", "ramadan", "gold"] as const;
export type AppIconName = (typeof APP_ICONS)[number];

type AppIconPlugin = {
  set(options: { name: AppIconName }): Promise<{ name: AppIconName; appliesOnLeave: boolean }>;
  get(): Promise<{ name: string }>;
};

let plugin: AppIconPlugin | null = null;

function nativeIcons(): AppIconPlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  plugin ??= registerPlugin<AppIconPlugin>("AppIcon");
  return plugin;
}

export async function currentAppIcon(): Promise<AppIconName | null> {
  const native = nativeIcons();
  if (!native) return null;
  try {
    const { name } = await native.get();
    return (APP_ICONS as readonly string[]).includes(name) ? (name as AppIconName) : "default";
  } catch {
    // An app build from before alternate icons.
    return null;
  }
}

/** Change the icon. Android applies it as the app goes to the background. */
export async function changeAppIcon(name: AppIconName): Promise<{ ok: boolean; appliesOnLeave: boolean }> {
  const native = nativeIcons();
  if (!native) return { ok: false, appliesOnLeave: false };
  try {
    const result = await native.set({ name });
    return { ok: true, appliesOnLeave: result.appliesOnLeave };
  } catch {
    return { ok: false, appliesOnLeave: false };
  }
}
