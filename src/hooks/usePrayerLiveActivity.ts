import * as React from "react";
import {
  buildPrayerActivityRequest,
  isPrayerLiveActivitySupported,
  resetPrayerLiveActivityCache,
  syncPrayerLiveActivity,
  type LiveActivityPrayerDay,
} from "@/lib/prayerLiveActivity";
import { listenForAppResume } from "@/lib/reminderAppResume";

/** How soon to look again when no prayer is close enough to count down to. */
const RECHECK_MS = 30 * 60 * 1000;

/**
 * Keeps the iOS next-prayer Live Activity on the right prayer: when prayer
 * times load, when a prayer arrives while the app is open, and each time the
 * app comes back to the foreground (the only time iOS lets an app start one).
 */
export function usePrayerLiveActivity(enabled: boolean, days: readonly LiveActivityPrayerDay[]): void {
  const daysKey = JSON.stringify(days);

  React.useEffect(() => {
    if (!isPrayerLiveActivitySupported()) return;
    if (!enabled) {
      void syncPrayerLiveActivity(null);
      return;
    }

    const parsedDays = JSON.parse(daysKey) as LiveActivityPrayerDay[];
    if (!parsedDays.some((day) => day.timings)) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const run = () => {
      if (timer !== null) clearTimeout(timer);
      const now = Date.now();
      const request = buildPrayerActivityRequest(new Date(now), parsedDays);
      void syncPrayerLiveActivity(request);
      const wait = request ? Math.min(request.at - now + 1000, RECHECK_MS) : RECHECK_MS;
      timer = setTimeout(run, Math.max(1000, wait));
    };

    run();
    const stopListening = listenForAppResume(() => {
      // iOS may have ended the countdown while the app was away.
      resetPrayerLiveActivityCache();
      run();
    });
    return () => {
      if (timer !== null) clearTimeout(timer);
      stopListening();
    };
  }, [enabled, daysKey]);
}
