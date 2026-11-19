/**
 * The phone's own controls, through the NativeUI plugin (ios/App/App/
 * NativeUIPlugin.swift, android/…/NativeUIPlugin.java). Every function falls
 * back to the web behaviour when the app runs in a browser or the plugin is
 * missing, so callers never need to check the platform themselves.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

type NativeUIPlugin = {
  setBackSwipe(o: { enabled: boolean }): Promise<void>;
  copyText(o: { text: string }): Promise<{ systemConfirms: boolean }>;
  pickDate(o: { value?: string; min?: string; max?: string; clearable?: boolean }): Promise<{ value: string }>;
  pickTime(o: { value?: string }): Promise<{ value: string }>;
  setPullToRefresh(o: { enabled: boolean }): Promise<void>;
  endPullToRefresh(): Promise<void>;
  vaultWrite(o: { key: string; value: string }): Promise<void>;
  vaultRemove(o: { key: string }): Promise<void>;
  vaultClear(): Promise<void>;
  addListener(event: "pullToRefresh", cb: () => void): Promise<PluginListenerHandle>;
};

// Registered on first use, not at import, so loading a screen never depends on it.
let plugin: NativeUIPlugin | undefined;
const NativeUI = new Proxy({} as NativeUIPlugin, {
  get: (_t, prop) => {
    plugin ??= registerPlugin<NativeUIPlugin>("NativeUI");
    return plugin[prop as keyof NativeUIPlugin];
  },
});

/** True inside the iPhone or Android app with the NativeUI plugin present. */
export function hasNativeUI(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("NativeUI");
}

export function nativePlatform(): "ios" | "android" | "web" {
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : "web";
}

/** iPhone: the edge swipe that goes back. Off on screens that swipe sideways themselves. */
export async function setBackSwipe(enabled: boolean): Promise<void> {
  if (!hasNativeUI() || nativePlatform() !== "ios") return;
  await NativeUI.setBackSwipe({ enabled }).catch(() => undefined);
}

/**
 * Copies text. Resolves to whether the system itself confirmed the copy
 * (Android 13 and later show their own "copied" message), so the caller can
 * skip its own and not show two.
 */
export async function copyText(text: string): Promise<{ ok: boolean; systemConfirms: boolean }> {
  if (hasNativeUI()) {
    try {
      const r = await NativeUI.copyText({ text });
      return { ok: true, systemConfirms: Boolean(r?.systemConfirms) };
    } catch {
      /* fall through to the web clipboard */
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, systemConfirms: false };
  } catch {
    return { ok: false, systemConfirms: false };
  }
}

/**
 * The system date picker. Resolves to "yyyy-MM-dd", "" when cleared, or null when closed
 * without choosing. Returns undefined outside the app (the caller keeps its
 * web picker there).
 */
export async function pickNativeDate(o: { value?: string; min?: string; max?: string }): Promise<string | null | undefined> {
  if (!hasNativeUI()) return undefined;
  try {
    // «مسح» appears when there is a date to clear, as in the web sheet; it resolves to "".
    return (await NativeUI.pickDate({ ...clean(o), clearable: Boolean(o.value) })).value;
  } catch {
    return null;
  }
}

/** The system time picker: "HH:mm", null when closed, undefined outside the app. */
export async function pickNativeTime(value?: string): Promise<string | null | undefined> {
  if (!hasNativeUI()) return undefined;
  try {
    return (await NativeUI.pickTime(clean({ value }))).value;
  } catch {
    return null;
  }
}

function clean<T extends Record<string, string | undefined>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === "string" && v)) as T;
}

/**
 * Turns on the system pull-to-refresh for the current screen. Returns a
 * function that turns it off again, or null outside the app (the caller keeps
 * its web gesture there).
 */
export function startNativePullToRefresh(onRefresh: () => Promise<unknown> | unknown): (() => void) | null {
  if (!hasNativeUI()) return null;
  let handle: PluginListenerHandle | null = null;
  let active = true;
  void NativeUI.addListener("pullToRefresh", async () => {
    try {
      await onRefresh();
    } finally {
      await NativeUI.endPullToRefresh().catch(() => undefined);
    }
  }).then((h) => {
    if (active) handle = h;
    else void h.remove();
  });
  void NativeUI.setPullToRefresh({ enabled: true }).catch(() => undefined);
  return () => {
    active = false;
    void handle?.remove();
    void NativeUI.setPullToRefresh({ enabled: false }).catch(() => undefined);
  };
}

export const nativeVault = {
  write: (key: string, value: string) => NativeUI.vaultWrite({ key, value }),
  remove: (key: string) => NativeUI.vaultRemove({ key }),
  clear: () => NativeUI.vaultClear(),
};

/**
 * Copies text through the phone's own clipboard; throws when it could not, so
 * existing error handling keeps working. Resolves to true when the system
 * showed its own "copied" message (Android 13 and later), so the caller can
 * skip its own.
 */
export async function writeClipboard(text: string): Promise<boolean> {
  const r = await copyText(text);
  if (!r.ok) throw new Error("clipboard unavailable");
  return r.systemConfirms;
}
