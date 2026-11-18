/**
 * Keeping the screen on while it is being read or listened to.
 *
 * Phones dim and lock after a short idle time, which in Athar meant the
 * Mushaf page going dark mid-page, the tasbeeh counter locking between
 * rounds, and the recitation check (Tasmee') losing the screen while the
 * person recited. The apps now use the phone's own switch for this
 * (ScreenAwakePlugin: the idle timer on iPhone, FLAG_KEEP_SCREEN_ON on
 * Android); a browser uses the Screen Wake Lock API where it has one.
 *
 * Several screens can ask at once: the screen stays on while any of them
 * holds it, and goes back to the phone's normal timeout when all let go.
 * The switch only applies while Athar is on screen, so it never keeps a
 * locked phone awake.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

type ScreenAwakePlugin = {
  keepAwake(): Promise<void>;
  allowSleep(): Promise<void>;
};

let plugin: ScreenAwakePlugin | null = null;

function native(): ScreenAwakePlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  plugin ??= registerPlugin<ScreenAwakePlugin>("ScreenAwake");
  return plugin;
}

type WakeLockSentinelLike = { release(): Promise<void>; released?: boolean };
type WakeLockNavigator = Navigator & { wakeLock?: { request(type: "screen"): Promise<WakeLockSentinelLike> } };

const holders = new Set<symbol>();
let webLock: WakeLockSentinelLike | null = null;
let visibilityListening = false;

async function requestWebLock(): Promise<void> {
  const wakeLock = (typeof navigator === "undefined" ? undefined : (navigator as WakeLockNavigator).wakeLock);
  if (!wakeLock || (webLock && !webLock.released)) return;
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  try {
    const lock = await wakeLock.request("screen");
    if (holders.size === 0) {
      void lock.release().catch(() => {});
      return;
    }
    webLock = lock;
  } catch {
    // Not allowed here (battery saver, an unfocused tab): the screen sleeps as usual.
  }
}

function onVisibilityChange() {
  // Browsers drop the lock when the page is hidden; take it again on return.
  if (holders.size > 0 && document.visibilityState === "visible") void requestWebLock();
}

function apply(on: boolean) {
  const bridge = native();
  if (bridge) {
    void (on ? bridge.keepAwake() : bridge.allowSleep()).catch(() => {});
    return;
  }
  if (on) {
    if (!visibilityListening && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
      visibilityListening = true;
    }
    void requestWebLock();
  } else {
    const lock = webLock;
    webLock = null;
    if (lock) void lock.release().catch(() => {});
  }
}

/** Keep the screen on until the returned function is called. */
export function holdScreenAwake(): () => void {
  const token = Symbol("screen-awake");
  holders.add(token);
  if (holders.size === 1) apply(true);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders.delete(token);
    if (holders.size === 0) apply(false);
  };
}

/** For tests. */
export function screenAwakeHolderCount(): number {
  return holders.size;
}
