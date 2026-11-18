/**
 * How today's worship shows in the garden.
 *
 * «…وأنّ غِراسَها: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر»
 * — رواه الترمذي (٣٤٦٢) وحسّنه الألباني.
 *
 * Every tasbeeh and every dhikr ticked off plants flowers; keeping a streak
 * of three days or more brings dates to the palm; finishing today's wird of
 * the Quran brings pomegranates to the tree.
 */
import * as React from "react";
import { useNoorStore } from "@/store/noorStore";
import { useTodayKey } from "@/hooks/useTodayKey";
import { shiftDateKey } from "@/lib/dayBoundaries";
import { bloomTarget } from "@/components/ufuq/garden/gardenMath";

export const GARDEN_BASE_BLOOMS = bloomTarget(0, 0);

export type GardenGrowth = {
  blooms: number;
  /** Flowers planted today by remembrance (beyond the garden's own). */
  planted: number;
  streak: number;
  palmFruit: boolean;
  treeFruit: boolean;
};

export function useGardenGrowth(): GardenGrowth {
  const today = useTodayKey();
  const tasbeehDailyLog = useNoorStore((s) => s.tasbeehDailyLog);
  const activity = useNoorStore((s) => s.activity);
  const dailyWirdDone = useNoorStore((s) => s.dailyWirdDone);
  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);
  const quranGoal = useNoorStore((s) => s.prefs.quranDailyGoal);

  return React.useMemo(() => {
    const tasbeehToday = Object.values(tasbeehDailyLog[today] ?? {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const dhikrToday = Number(activity[today] ?? 0);
    const blooms = bloomTarget(tasbeehToday, dhikrToday);

    let streak = 0;
    let key = (activity[today] ?? 0) > 0 ? today : shiftDateKey(today, -1);
    for (let i = 0; i < 400 && (activity[key] ?? 0) > 0; i++) {
      streak += 1;
      key = shiftDateKey(key, -1);
    }

    const goal = quranGoal > 0 ? quranGoal : 10;
    const treeFruit = Boolean(dailyWirdDone[today]) || Number(quranDailyAyahs[today] ?? 0) >= goal;
    return { blooms, planted: blooms - GARDEN_BASE_BLOOMS, streak, palmFruit: streak >= 3, treeFruit };
  }, [activity, dailyWirdDone, quranDailyAyahs, quranGoal, tasbeehDailyLog, today]);
}
