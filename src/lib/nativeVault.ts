/**
 * Keeps a native copy of everything the app saves in the web view's storage.
 *
 * Settings, adhkar progress, listening, hadith and miracles progress all live
 * in localStorage. Inside a phone app the system may clear a web view's
 * storage when the device runs low on space, and with it the person's
 * progress. So every save is mirrored, shortly after it happens, into the
 * app's own files (NativeUIPlugin: Application Support on iPhone, the app's
 * files on Android), which the system does not clear that way. When the app
 * starts, a script in index.html puts back anything the web storage lost
 * before the app's code reads it.
 *
 * Nothing changes in how the app reads or writes; this only watches.
 */
import { hasNativeUI, nativeVault } from "@/lib/nativeUI";

/** Short-lived keys that are not worth keeping (scroll positions and the like). */
const SKIP = /^(scroll_y:|scroll_active_path$|sb-.*-auth-token-code-verifier$)/;
/** One very large value is not mirrored; it would be slow to pass to the phone. */
const MAX_VALUE = 4_000_000;
const DELAY_MS = 1500;

const pending = new Map<string, string | null>();
let timer: number | null = null;
let started = false;

function schedule(key: string, value: string | null): void {
  if (SKIP.test(key)) return;
  if (value !== null && value.length > MAX_VALUE) return;
  pending.set(key, value);
  if (timer !== null) return;
  timer = window.setTimeout(flush, DELAY_MS);
}

function flush(): void {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  for (const [key, value] of pending) {
    if (value === null) void nativeVault.remove(key).catch(() => undefined);
    else void nativeVault.write(key, value).catch(() => undefined);
  }
  pending.clear();
}

/** Starts mirroring. Inside the app only; a browser keeps its own storage. */
export function startNativeVault(): void {
  if (started || !hasNativeUI() || typeof localStorage === "undefined") return;
  started = true;

  const proto = Storage.prototype;
  const setItem = proto.setItem;
  const removeItem = proto.removeItem;
  const clear = proto.clear;

  proto.setItem = function (this: Storage, key: string, value: string) {
    setItem.call(this, key, value);
    if (this === localStorage) schedule(String(key), String(value));
  };
  proto.removeItem = function (this: Storage, key: string) {
    removeItem.call(this, key);
    if (this === localStorage) {
      // At once: a removal that waited could come back at the next launch.
      schedule(String(key), null);
      flush();
    }
  };
  proto.clear = function (this: Storage) {
    clear.call(this);
    if (this === localStorage) {
      pending.clear();
      void nativeVault.clear().catch(() => undefined);
    }
  };

  // Save what is waiting when the app goes to the background.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);

  // Once per launch, when the phone is idle: bring the whole copy up to date
  // (covers saves made before mirroring started, and a first run after updating).
  const fullSync = () => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null) schedule(key, localStorage.getItem(key));
    }
  };
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  window.setTimeout(() => (idle ? idle(fullSync, { timeout: 5000 }) : fullSync()), 8000);
}

export const __test = { flush, schedule, pending };
