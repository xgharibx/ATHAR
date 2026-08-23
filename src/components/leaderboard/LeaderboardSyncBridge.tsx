import * as React from "react";

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useTodayKey } from "@/hooks/useTodayKey";
import { isRateLimited, syncLeaderboardAliasFromServer, syncLeaderboardSnapshot } from "@/lib/leaderboard";
import { buildLeaderboardScoreStats } from "@/lib/leaderboardScores";
import { useNoorStore } from "@/store/noorStore";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useSyncStatus } from "@/hooks/useCloudSync";

const AUTO_SYNC_DEBOUNCE_MS = 2500;

/** How long to wait for a first cloud reconcile before posting anyway. Keeps a
 *  signed-in user who is offline from silently vanishing from the board. */
const SYNC_GRACE_MS = 45_000;

export function LeaderboardSyncBridge() {
  const endpoint = (import.meta.env.VITE_LEADERBOARD_ENDPOINT as string | undefined) ?? "";
  const { data } = useAdhkarDB();
  const prayerTimes = usePrayerTimes();
  // Must use the SAME Fajr value ensureDailyResets falls back to, or the two
  // day keys disagree between midnight and Fajr on a device whose prayer times
  // have not loaded — and the guard below would then stall submissions.
  const lastKnownFajrTime = useNoorStore((state) => state.lastKnownFajrTime);
  const effectiveFajr = prayerTimes.data?.data?.timings?.Fajr ?? lastKnownFajrTime ?? undefined;
  const todayKey = useTodayKey({ mode: "ibadah", fajrTime: effectiveFajr });
  const progress = useNoorStore((state) => state.progress);
  const quranAyahsToday = useNoorStore((state) => state.quranDailyAyahs[todayKey] ?? 0);
  const prayersDone = useNoorStore((state) => state.dailyChecklist[todayKey] ?? {});
  const quickTasbeeh = useNoorStore((state) => state.quickTasbeeh);
  const tasbeehTodayTotal = useNoorStore((state) => state.tasbeehDayTotals?.[todayKey] ?? 0);
  const lastIbadahResetISO = useNoorStore((state) => state.lastIbadahResetISO);
  const ensureDailyResets = useNoorStore((state) => state.ensureDailyResets);
  // Two devices on one account must report the SAME score. They already share
  // one leaderboard identity (it travels in the account's sync document), so
  // there are never duplicate rows — but each device scores its own local
  // `progress`. A device that has just been opened holds a stale snapshot, and
  // since the server now takes the newest submission, that stale value would
  // overwrite the other device's newer one until sync caught up.
  //
  // So when signed in, wait for one cloud reconcile before posting: by then
  // `progress` is the merged state both devices agree on. The grace period
  // stops a signed-in user with no connectivity from dropping off the board.
  const { session, configured } = useAuthSession();
  const syncStatus = useSyncStatus();
  const mountedAtRef = React.useRef(Date.now());
  const awaitingFirstSync =
    configured &&
    Boolean(session?.user?.id) &&
    syncStatus.lastSyncedAt === null &&
    Date.now() - mountedAtRef.current < SYNC_GRACE_MS;

  const [retryTick, setRetryTick] = React.useState(0);
  const lastSyncedKeyRef = React.useRef("");
  const syncingRef = React.useRef(false);
  const pendingSyncRef = React.useRef(false);

  const sections = React.useMemo(() => data?.db.sections ?? [], [data]);
  const stats = React.useMemo(
    () =>
      buildLeaderboardScoreStats({
        sections,
        progress,
        quranAyahsToday,
        prayersDone,
        quickTasbeeh,
        tasbeehTodayTotal,
        todayISO: todayKey
      }),
    [prayersDone, progress, quranAyahsToday, quickTasbeeh, tasbeehTodayTotal, sections, todayKey]
  );

  const snapshotKey = React.useMemo(
    () => JSON.stringify({ day: todayKey, scores: stats.scores }),
    [stats.scores, todayKey]
  );

  React.useEffect(() => {
    const triggerRetry = () => setRetryTick((value) => value + 1);
    const onVisible = () => {
      if (document.visibilityState === "visible") triggerRetry();
    };
    // Cloud sync can hand this device a different leaderboard identity (rank
    // follows the account now). Today's scores were posted under the old id, so
    // clear the "already sent this" guard or they would never be posted under
    // the new one and the day would look empty.
    const onIdentityChanged = () => {
      lastSyncedKeyRef.current = "";
      triggerRetry();
    };

    window.addEventListener("focus", triggerRetry);
    window.addEventListener("online", triggerRetry);
    window.addEventListener("athar-leaderboard-identity-changed", onIdentityChanged);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", triggerRetry);
      window.removeEventListener("online", triggerRetry);
      window.removeEventListener("athar-leaderboard-identity-changed", onIdentityChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  React.useEffect(() => {
    if (!endpoint || sections.length === 0) return;

    // The day key flips at Fajr on its own timer; `progress` only clears when
    // ensureDailyResets runs. Nothing used to couple the two, so in the window
    // between them this bridge would post YESTERDAY's totals under TODAY's
    // date — and because the server rolls scores up with max(), that inflated
    // number then stuck for the whole day and the later zero could never pull
    // it back down. That is the "it didn't reset at Fajr" symptom.
    //
    // So: never submit while the reset for this day is still outstanding.
    // Nudge it along and wait — lastIbadahResetISO is in the dep list, so the
    // effect re-runs the moment the reset lands.
    if (awaitingFirstSync) return;

    if (lastIbadahResetISO !== todayKey) {
      // Two mirror-image races, and only exact agreement rules out both:
      //
      //   marker BEHIND the day key — the day rolled over but the reset has not
      //   run, so `progress` still holds yesterday's totals. Submitting posts
      //   them under today: the inflated scores we saw.
      //
      //   marker AHEAD of the day key — the reset ran first and zeroed
      //   `progress` while the key still points at yesterday. Submitting posts
      //   a zero under a day the user actually worked, and now that rollups
      //   accept a newer lower value, that zero WINS and erases the day.
      //
      // Both keys derive from the same Fajr value above, so they converge
      // within a tick; lastIbadahResetISO is in the dep list, so this re-runs
      // the moment they agree.
      ensureDailyResets(effectiveFajr ?? null);
      return;
    }

    if (snapshotKey === lastSyncedKeyRef.current) return;
    if (isRateLimited()) return;

    const timeoutId = window.setTimeout(async () => {
      if (syncingRef.current) {
        pendingSyncRef.current = true;
        return;
      }
      if (isRateLimited()) return;
      syncingRef.current = true;
      try {
        const flush = await syncLeaderboardSnapshot(endpoint, todayKey, stats.scores);
        if (!flush.ok) return;
        lastSyncedKeyRef.current = snapshotKey;
        if (flush.alias) {
          syncLeaderboardAliasFromServer(flush.alias);
        }
      } finally {
        syncingRef.current = false;
        if (pendingSyncRef.current) {
          pendingSyncRef.current = false;
          setRetryTick((value) => value + 1);
        }
      }
    }, AUTO_SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    endpoint,
    retryTick,
    sections.length,
    snapshotKey,
    stats.scores,
    todayKey,
    lastIbadahResetISO,
    ensureDailyResets,
    effectiveFajr,
    awaitingFirstSync,
  ]);

  return null;
}