/** Keeps the Hijri offset helper (src/lib/hijri.ts) in step with the saved preference. */
import { setHijriOffsetDays } from "@/lib/hijri";
import { useNoorStore } from "@/store/noorStore";

let started = false;

export function startHijriOffsetSync(): void {
  if (started) return;
  started = true;
  setHijriOffsetDays(useNoorStore.getState().prefs.hijriOffsetDays);
  useNoorStore.subscribe((state, previous) => {
    if (state.prefs.hijriOffsetDays !== previous.prefs.hijriOffsetDays) setHijriOffsetDays(state.prefs.hijriOffsetDays);
  });
}
