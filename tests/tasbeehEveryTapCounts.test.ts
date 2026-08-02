/**
 * @vitest-environment jsdom
 *
 * The sebha's visible counter deliberately stops at your target. What must not
 * stop is the *record* of the dhikr: the lifetime total, the daily log, and the
 * activity feed that drives streaks and Insights.
 *
 * Those three used to sit below an early `return` that fired at the target, so
 * a target of 33 tapped 300 times recorded 267 taps nowhere at all.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useNoorStore } from "@/store/noorStore";

function todayISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const KEY = "subhanallah";

beforeEach(() => {
  useNoorStore.setState({
    quickTasbeeh: {},
    tasbeehLifetime: {},
    tasbeehDailyLog: {},
    activity: {},
    asmaHusnaCounts: {},
    // Pin today's reset as already done, so ensureDailyResets() cannot clear
    // the counters underneath the assertions.
    lastIbadahResetISO: todayISO(),
    lastCivilResetISO: todayISO(),
    lastKnownFajrTime: null,
  });
});

describe("every tap counts, even past the target", () => {
  it("records all 300 taps at a target of 33", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    for (let i = 0; i < 300; i += 1) inc(KEY, 33);

    const s = useNoorStore.getState();
    expect(s.tasbeehLifetime[KEY]).toBe(300);
    expect(s.tasbeehDailyLog[todayISO()]?.[KEY]).toBe(300);
    expect(s.activity[todayISO()]).toBe(300);
  });

  it("still caps the visible counter at the target", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    for (let i = 0; i < 300; i += 1) inc(KEY, 33);
    expect(useNoorStore.getState().quickTasbeeh[KEY]).toBe(33);
  });

  it("keeps returning the same number past the target, so haptics stay suppressed", () => {
    // QuickTasbeehFab and Sebha both detect "at target" by getting back the
    // number they already had. Breaking that would buzz on every dead tap.
    const inc = useNoorStore.getState().incQuickTasbeeh;
    for (let i = 0; i < 33; i += 1) inc(KEY, 33);
    expect(inc(KEY, 33)).toBe(33);
    expect(inc(KEY, 33)).toBe(33);
  });

  it("counts normally below the target", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    expect(inc(KEY, 33)).toBe(1);
    expect(inc(KEY, 33)).toBe(2);
    const s = useNoorStore.getState();
    expect(s.quickTasbeeh[KEY]).toBe(2);
    expect(s.tasbeehLifetime[KEY]).toBe(2);
  });

  it("tracks separate phrases independently", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    for (let i = 0; i < 40; i += 1) inc(KEY, 33);
    for (let i = 0; i < 5; i += 1) inc("alhamdulillah", 33);

    const s = useNoorStore.getState();
    expect(s.tasbeehLifetime[KEY]).toBe(40);
    expect(s.tasbeehLifetime.alhamdulillah).toBe(5);
    expect(s.quickTasbeeh[KEY]).toBe(33);
    expect(s.quickTasbeeh.alhamdulillah).toBe(5);
    // Activity is a per-day total across every phrase.
    expect(s.activity[todayISO()]).toBe(45);
  });
});

describe("asma al-husna counter", () => {
  it("records every tap after a name is permanently maxed", () => {
    // asmaHusnaCounts is never cleared by the daily reset, so a name that
    // reaches its target is maxed for good. With the lifetime and daily-log
    // writes below the old early return, every later tap on that name vanished.
    const inc = useNoorStore.getState().incAsmaHusnaCount;
    for (let i = 0; i < 150; i += 1) inc(7, 100);

    const s = useNoorStore.getState();
    expect(s.asmaHusnaCounts[7]).toBe(100); // visible counter still capped
    expect(s.tasbeehLifetime["asma:7"]).toBe(150); // but all 150 counted
    expect(s.tasbeehDailyLog[todayISO()]?.["asma:7"]).toBe(150);
  });

  it("contributes to the activity feed that drives streaks", () => {
    // This was missing entirely, unlike incQuickTasbeeh — counting the names
    // of Allah did nothing for streaks or Insights.
    const inc = useNoorStore.getState().incAsmaHusnaCount;
    for (let i = 0; i < 12; i += 1) inc(3, 100);
    expect(useNoorStore.getState().activity[todayISO()]).toBe(12);
  });

  it("keeps returning the same number past the target", () => {
    const inc = useNoorStore.getState().incAsmaHusnaCount;
    for (let i = 0; i < 100; i += 1) inc(1, 100);
    expect(inc(1, 100)).toBe(100);
  });

  it("counts each name separately", () => {
    const inc = useNoorStore.getState().incAsmaHusnaCount;
    inc(1, 100);
    inc(2, 100);
    inc(2, 100);
    const s = useNoorStore.getState();
    expect(s.asmaHusnaCounts[1]).toBe(1);
    expect(s.asmaHusnaCounts[2]).toBe(2);
  });
});
