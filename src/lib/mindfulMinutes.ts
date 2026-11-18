/**
 * Tasbeeh time as mindful minutes in Apple Health (MindfulHealthPlugin).
 *
 * Opt in from Settings. A session runs from the first count to the last one
 * before a pause of two minutes (or leaving the Sebha); a session of at least
 * a minute is saved as a "Mindful Minutes" entry titled with the dhikr. Only
 * the times are written, nothing is read from Health.
 *
 * Android's Health Connect needs Google Play's health-apps declaration before
 * an app may ask for its permission, so it is not offered there yet.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

type MindfulHealthPlugin = {
  available(): Promise<{ available: boolean }>;
  requestAuthorization(): Promise<{ granted: boolean }>;
  log(options: { start: string; end: string }): Promise<void>;
};

let plugin: MindfulHealthPlugin | null = null;

function native(): MindfulHealthPlugin | null {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return null;
  plugin ??= registerPlugin<MindfulHealthPlugin>("MindfulHealth");
  return plugin;
}

export async function mindfulHealthAvailable(): Promise<boolean> {
  try {
    return (await native()?.available())?.available === true;
  } catch {
    return false;
  }
}

/** Ask Apple Health for permission to save mindful minutes. */
export async function requestMindfulHealth(): Promise<boolean> {
  try {
    return (await native()?.requestAuthorization())?.granted === true;
  } catch {
    return false;
  }
}

export async function logMindfulSession(start: Date, end: Date): Promise<void> {
  try {
    await native()?.log({ start: start.toISOString(), end: end.toISOString() });
  } catch {
    // Health is a bonus: counting works the same without it.
  }
}

/** A session ends after this long without a count. */
export const SESSION_IDLE_MS = 2 * 60_000;
/** Shorter sessions are not worth an entry. */
export const MIN_SESSION_MS = 60_000;

/**
 * Turns counts into sessions. `count()` on every count; `flush()` when the
 * person leaves. Calls `save(start, end)` for each session long enough.
 */
export function createMindfulSession(save: (start: Date, end: Date) => void, now: () => number = Date.now) {
  let start: number | null = null;
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (start !== null && last - start >= MIN_SESSION_MS) save(new Date(start), new Date(last));
    start = null;
  };

  return {
    count() {
      const at = now();
      if (start !== null && at - last > SESSION_IDLE_MS) flush();
      if (start === null) start = at;
      last = at;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, SESSION_IDLE_MS);
    },
    flush,
  };
}
