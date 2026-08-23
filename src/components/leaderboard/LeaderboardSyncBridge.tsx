import * as React from "react";

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useTodayKey } from "@/hooks/useTodayKey";
import { isRateLimited, syncLeaderboardAliasFromServer, syncLeaderboardSnapshot } from "@/lib/leaderboard";
import { buildLeaderboardScoreStats } from "@/lib/leaderboardScores";
import { useNoorStore } from "@/store/noorStore";

const AUTO_SYNC_DEBOUNCE_MS = 2500;

export function LeaderboardSyncBridge() {
  const endpoint = (import.meta.env.VITE_LEADERBOARD_ENDPOINT as string | undefined) ?? "";
  const { data } = useAdhkarDB();
  const prayerTimes = usePrayerTimes();
  const todayKey = useTodayKey({
    mode: "ibadah",
    fajrTime: prayerTimes.data?.data?.timings?.Fajr,
  });
  const progress = useNoorStore((state) => state.progress);
  const quranAyahsToday = useNoorStore((state) => state.quranDailyAyahs[todayKey] ?? 0);
  const prayersDone = useNoorStore((state) => state.dailyChecklist[todayKey] ?? {});
  const quickTasbeeh = useNoorStore((state) => state.quickTasbeeh);
  const lastIbadahResetISO = useNoorStore((state) => state.lastIbadahResetISO);
  const ensureDailyResets = useNoorStore((state) => state.ensureDailyResets);
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
        todayISO: todayKey
      }),
    [prayersDone, progress, quranAyahsToday, quickTasbeeh, sections, todayKey]
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
    if (!lastIbadahResetISO || lastIbadahResetISO < todayKey) {
      ensureDailyResets(prayerTimes.data?.data?.timings?.Fajr ?? null);
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
    prayerTimes.data?.data?.timings?.Fajr,
  ]);

  return null;
}