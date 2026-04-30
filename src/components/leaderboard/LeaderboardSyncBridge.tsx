import * as React from "react";

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useTodayKey } from "@/hooks/useTodayKey";
import { syncLeaderboardAliasFromServer, syncLeaderboardSnapshot } from "@/lib/leaderboard";
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
  const quranLastRead = useNoorStore((state) => state.quranLastRead);
  const prayersDone = useNoorStore((state) => state.dailyChecklist[todayKey] ?? {});
  const quickTasbeeh = useNoorStore((state) => state.quickTasbeeh);
  const [retryTick, setRetryTick] = React.useState(0);
  const lastSyncedKeyRef = React.useRef("");
  const syncingRef = React.useRef(false);

  const sections = data?.db.sections ?? [];
  const stats = React.useMemo(
    () =>
      buildLeaderboardScoreStats({
        sections,
        progress,
        quranAyahIndex: quranLastRead?.ayahIndex ?? 0,
        prayersDone,
        quickTasbeeh,
        todayISO: todayKey
      }),
    [prayersDone, progress, quranLastRead?.ayahIndex, quickTasbeeh, sections, todayKey]
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

    window.addEventListener("focus", triggerRetry);
    window.addEventListener("online", triggerRetry);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", triggerRetry);
      window.removeEventListener("online", triggerRetry);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  React.useEffect(() => {
    if (!endpoint || sections.length === 0) return;
    if (snapshotKey === lastSyncedKeyRef.current) return;

    const timeoutId = window.setTimeout(async () => {
      if (syncingRef.current) return;
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
      }
    }, AUTO_SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [endpoint, retryTick, sections.length, snapshotKey, stats.scores, todayKey]);

  return null;
}