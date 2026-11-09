// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { syncSnapshot, retryUntil } = vi.hoisted(() => ({
  syncSnapshot: vi.fn(),
  retryUntil: { value: 0 },
}));

vi.mock("@/data/useAdhkarDB", () => ({
  useAdhkarDB: () => ({ data: { db: { sections: [{ id: "morning", title: "الصباح", content: [{ text: "سبحان الله", count: 3 }] }] } } }),
}));
vi.mock("@/hooks/usePrayerTimes", () => ({ usePrayerTimes: () => ({ data: undefined }) }));
vi.mock("@/hooks/useTodayKey", () => ({
  useTodayKey: ({ mode }: { mode?: string } = {}) => mode === "ibadah" ? "2026-11-09" : "2026-11-09",
}));
vi.mock("@/hooks/useAuthSession", () => ({ useAuthSession: () => ({ session: null, configured: false }) }));
vi.mock("@/hooks/useCloudSync", () => ({ useSyncStatus: () => ({ lastSyncedAt: "2026-11-09T08:00:00.000Z" }) }));
vi.mock("@/lib/leaderboard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/leaderboard")>();
  return {
    ...actual,
    isRateLimited: () => Date.now() < retryUntil.value,
    getRateLimitBackoffRemainingMs: () => Math.max(0, retryUntil.value - Date.now()),
    syncLeaderboardSnapshot: syncSnapshot,
  };
});

import { LeaderboardSyncBridge } from "@/components/leaderboard/LeaderboardSyncBridge";
import { useNoorStore } from "@/store/noorStore";
import { getLeaderboardNetworkRetryDelayMs } from "@/lib/leaderboardRetry";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-09T09:00:00.000Z"));
  vi.stubEnv("VITE_LEADERBOARD_ENDPOINT", "https://leaderboard.example/submit");
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  syncSnapshot.mockReset();
  retryUntil.value = 0;
  useNoorStore.setState({
    progress: {}, customPacks: [], quranDailyAyahs: {}, dailyChecklist: {}, prayerLog: {},
    quickTasbeeh: {}, tasbeehDayTotals: {}, lastKnownFajrTime: "04:30",
    lastIbadahResetISO: "2026-11-09",
  });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function renderBridge() {
  await act(async () => {
    root.render(<LeaderboardSyncBridge />);
    await Promise.resolve();
  });
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("leaderboard queue retry wakeups", () => {
  it("retries a failed submission with capped jitter while the app stays open", async () => {
    syncSnapshot
      .mockResolvedValueOnce({ ok: false, sent: 0, reason: "network_retry" })
      .mockResolvedValueOnce({ ok: true, sent: 1, reason: null });
    await renderBridge();

    await advance(2500);
    expect(syncSnapshot).toHaveBeenCalledOnce();
    await advance(3749);
    expect(syncSnapshot).toHaveBeenCalledOnce();

    await advance(1);
    await advance(0);
    expect(syncSnapshot).toHaveBeenCalledTimes(2);
  });

  it("waits for the server's Retry-After delay before retrying a rate-limited write", async () => {
    syncSnapshot
      .mockResolvedValueOnce({ ok: false, sent: 0, reason: "rate_limited", retryAfterMs: 6000 })
      .mockResolvedValueOnce({ ok: true, sent: 1, reason: null });
    await renderBridge();

    await advance(2500);
    expect(syncSnapshot).toHaveBeenCalledOnce();
    await advance(5999);
    expect(syncSnapshot).toHaveBeenCalledOnce();

    await advance(1);
    await advance(0);
    expect(syncSnapshot).toHaveBeenCalledTimes(2);
  });

  it("cancels the pending retry when the bridge unmounts", async () => {
    syncSnapshot.mockResolvedValue({ ok: false, sent: 0, reason: "network_retry" });
    await renderBridge();
    await advance(2500);
    expect(syncSnapshot).toHaveBeenCalledOnce();

    act(() => root.unmount());
    await advance(6000);

    expect(syncSnapshot).toHaveBeenCalledOnce();
  });

  it("wakes a queued write when a stored rate-limit window expires", async () => {
    retryUntil.value = Date.now() + 1000;
    syncSnapshot.mockResolvedValue({ ok: true, sent: 1, reason: null });
    await renderBridge();

    await advance(999);
    expect(syncSnapshot).not.toHaveBeenCalled();
    await advance(1);
    await advance(0);

    expect(syncSnapshot).toHaveBeenCalledOnce();
  });

  it("keeps exponential retry delays jittered and capped at five minutes", () => {
    expect(getLeaderboardNetworkRetryDelayMs(0, () => 0)).toBe(2500);
    expect(getLeaderboardNetworkRetryDelayMs(20, () => 1)).toBe(300_000);
  });
});
