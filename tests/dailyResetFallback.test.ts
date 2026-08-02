/**
 * @vitest-environment jsdom
 *
 * The daily reset used to run only when a live Fajr time was available. Most
 * callers invoke ensureDailyResets() with no argument, and a device that is
 * offline or has no location permission never gets one — so for those users the
 * reset never ran at all. Adhkar progress and the quick tasbeeh accumulated
 * forever, and with them the *daily* leaderboard score.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useNoorStore } from "@/store/noorStore";

function todayISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

beforeEach(() => {
  useNoorStore.setState({
    progress: { "morning:0": 5, "evening:1": 3 },
    quickTasbeeh: { subhanallah: 120 },
    lastIbadahResetISO: "2020-01-01",
    lastCivilResetISO: "2020-01-01",
    lastKnownFajrTime: null,
  });
});

describe("ensureDailyResets without a live Fajr time", () => {
  it("still resets using the civil day when no Fajr clock is known", () => {
    useNoorStore.getState().ensureDailyResets();
    const s = useNoorStore.getState();
    expect(s.progress).toEqual({});
    expect(s.quickTasbeeh).toEqual({});
    expect(s.lastIbadahResetISO).toBe(todayISO());
  });

  it("falls back to the last Fajr clock this device saw", () => {
    useNoorStore.setState({ lastKnownFajrTime: "04:30" });
    useNoorStore.getState().ensureDailyResets();
    expect(useNoorStore.getState().progress).toEqual({});
    expect(useNoorStore.getState().quickTasbeeh).toEqual({});
  });

  it("is idempotent — a second call the same day does not re-clear", () => {
    useNoorStore.getState().ensureDailyResets();
    useNoorStore.setState({ progress: { "morning:0": 2 } });
    useNoorStore.getState().ensureDailyResets();
    // The counter added after today's reset must survive.
    expect(useNoorStore.getState().progress).toEqual({ "morning:0": 2 });
  });

  it("does not reset when today's reset already happened", () => {
    useNoorStore.setState({ lastIbadahResetISO: todayISO() });
    useNoorStore.getState().ensureDailyResets();
    expect(useNoorStore.getState().progress).toEqual({ "morning:0": 5, "evening:1": 3 });
  });

  it("prefers a live Fajr time over the cached one and caches it", () => {
    useNoorStore.setState({ lastKnownFajrTime: "04:30" });
    useNoorStore.getState().ensureDailyResets("05:15");
    expect(useNoorStore.getState().lastKnownFajrTime).toBe("05:15");
  });
});
