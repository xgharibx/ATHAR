/**
 * The app lock (Settings › الأمان): Face ID / Touch ID on iPhone, fingerprint
 * or face unlock on Android, always with the phone's own passcode as the
 * fallback (AppLockPlugin), so a failing sensor never locks anyone out.
 *
 * Only in the apps; the web has no lock.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

export type AppLockStatus = {
  available: boolean;
  /** iPhone: "face" | "fingerprint" | "biometric" | "passcode"; Android: "biometric" | "passcode". */
  kind: "face" | "fingerprint" | "biometric" | "passcode";
};

type AppLockPlugin = {
  status(): Promise<{ available: boolean; biometryType?: string; biometric?: boolean }>;
  authenticate(options: { title?: string; reason: string }): Promise<{ success: boolean; cancelled?: boolean }>;
};

let plugin: AppLockPlugin | null = null;

function nativeLock(): AppLockPlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  plugin ??= registerPlugin<AppLockPlugin>("AppLock");
  return plugin;
}

export function appLockSupported(): boolean {
  return Capacitor.isNativePlatform();
}

export async function appLockStatus(): Promise<AppLockStatus> {
  const native = nativeLock();
  if (!native) return { available: false, kind: "passcode" };
  try {
    const status = await native.status();
    const type = status.biometryType ?? (status.biometric ? "biometric" : "passcode");
    const kind = type === "face" || type === "fingerprint" || type === "biometric" ? type : "passcode";
    return { available: status.available, kind };
  } catch {
    // An app build from before the lock existed.
    return { available: false, kind: "passcode" };
  }
}

/** Ask the phone to confirm it is its owner. Resolves true only on success. */
export async function confirmOwner(reason: string): Promise<boolean> {
  const native = nativeLock();
  if (!native) return false;
  try {
    const { success } = await native.authenticate({ title: "أثر", reason });
    return success;
  } catch {
    return false;
  }
}

/** Away for at least this long, the app asks again; shorter trips do not. */
export const APP_LOCK_GRACE_MS = 60 * 1000;

/** Whether returning after `awayMs` in the background needs unlocking. */
export function needsUnlockAfter(awayMs: number): boolean {
  return awayMs >= APP_LOCK_GRACE_MS;
}

/** "بصمة الوجه" etc., for the switch and the lock screen. */
export function appLockMethodLabel(kind: AppLockStatus["kind"]): string {
  switch (kind) {
    case "face": return "بصمة الوجه";
    case "fingerprint": return "بصمة الإصبع";
    case "biometric": return "البصمة";
    default: return "رمز قفل الجهاز";
  }
}
