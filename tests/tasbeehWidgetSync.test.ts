// @vitest-environment jsdom
/**
 * Native widget bridge — merges home-screen tasbeeh widget taps into the
 * app's real stats. Covers the "delta-based, not last-write-wins" merge
 * strategy the 2026-07-19 audit confirmed as correct (idempotent on repeat
 * foreground merges, can't double-count), plus the edge cases it flagged
 * as unverified: non-Android platforms, and a widget counter that resets
 * to a lower value mid-day.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNoorStore } from "@/store/noorStore";

const mocks = vi.hoisted(() => {
  return {
    mockCapacitor: { getPlatform: vi.fn(() => "android") },
    mockPreferencesGet: vi.fn(async () => ({ value: null as string | null })),
  };
});

vi.mock("@capacitor/core", () => ({ Capacitor: mocks.mockCapacitor }));
vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: mocks.mockPreferencesGet },
}));

import { mergeTasbeehFromWidget } from "@/lib/tasbeehWidgetSync";

const TOTALS_KEY = "noor_widget_tasbeeh_totals_v1";
const TODAY = "2026-07-19";

function setWidgetTotals(counts: Record<string, number>, date = TODAY) {
  mocks.mockPreferencesGet.mockImplementation(async ({ key }: { key: string }) => {
    if (key === TOTALS_KEY) {
      return { value: JSON.stringify({ date, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) }) };
    }
    return { value: null };
  });
}

describe("mergeTasbeehFromWidget", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.mockCapacitor.getPlatform.mockReturnValue("android");
    mocks.mockPreferencesGet.mockReset();
    mocks.mockPreferencesGet.mockResolvedValue({ value: null });
    useNoorStore.setState({ tasbeehDailyLog: {}, tasbeehLifetime: {}, activity: {} });
  });

  it("does nothing on non-Android platforms", async () => {
    mocks.mockCapacitor.getPlatform.mockReturnValue("ios");
    setWidgetTotals({ subhanallah: 33 });
    await mergeTasbeehFromWidget();
    expect(useNoorStore.getState().tasbeehLifetime.subhanallah ?? 0).toBe(0);
  });

  it("does nothing when the widget has no stored totals", async () => {
    await mergeTasbeehFromWidget();
    expect(useNoorStore.getState().tasbeehLifetime).toEqual({});
  });

  it("merges the full widget count into the store on first sync", async () => {
    setWidgetTotals({ subhanallah: 33 });
    await mergeTasbeehFromWidget();
    expect(useNoorStore.getState().tasbeehLifetime.subhanallah).toBe(33);
    expect(useNoorStore.getState().tasbeehDailyLog[TODAY]?.subhanallah).toBe(33);
  });

  it("is additive: a second sync only adds the NEW delta, not the full count again", async () => {
    setWidgetTotals({ subhanallah: 33 });
    await mergeTasbeehFromWidget();
    setWidgetTotals({ subhanallah: 50 }); // user tapped 17 more on the widget
    await mergeTasbeehFromWidget();
    expect(useNoorStore.getState().tasbeehLifetime.subhanallah).toBe(50);
  });

  it("is idempotent: re-running with the same unchanged total does not double-count", async () => {
    setWidgetTotals({ subhanallah: 33 });
    await mergeTasbeehFromWidget();
    await mergeTasbeehFromWidget();
    await mergeTasbeehFromWidget();
    expect(useNoorStore.getState().tasbeehLifetime.subhanallah).toBe(33);
  });

  it("ignores a widget counter that resets to a lower value mid-day (documented edge case)", async () => {
    setWidgetTotals({ subhanallah: 33 });
    await mergeTasbeehFromWidget();
    setWidgetTotals({ subhanallah: 10 }); // widget reset lower than its last-merged peak
    await mergeTasbeehFromWidget();
    // Negative delta is filtered out — no crash, no count reduction.
    expect(useNoorStore.getState().tasbeehLifetime.subhanallah).toBe(33);
  });

  it("resets the merge baseline on a new day so the new day's counts merge from zero", async () => {
    setWidgetTotals({ subhanallah: 33 }, TODAY);
    await mergeTasbeehFromWidget();
    setWidgetTotals({ subhanallah: 5 }, "2026-07-20");
    await mergeTasbeehFromWidget();
    expect(useNoorStore.getState().tasbeehLifetime.subhanallah).toBe(38);
    expect(useNoorStore.getState().tasbeehDailyLog["2026-07-20"]?.subhanallah).toBe(5);
  });

  it("merges multiple dhikr phrases independently", async () => {
    setWidgetTotals({ subhanallah: 10, alhamdulillah: 20 });
    await mergeTasbeehFromWidget();
    expect(useNoorStore.getState().tasbeehLifetime.subhanallah).toBe(10);
    expect(useNoorStore.getState().tasbeehLifetime.alhamdulillah).toBe(20);
  });
});
