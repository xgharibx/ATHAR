import { TOTAL_QURAN_AYAHS } from "@/lib/quranMeta";
import { daysBetween, parseISO } from "@/lib/qadaa";

export type KhatmaPlanStatus = "active" | "expired" | "completed";

export type KhatmaDayRange = {
  dayIndex: number;
  days: number;
  firstAyah: number;
  lastAyah: number;
  count: number;
  /** The originally promised daily target; may exceed the final legacy range. */
  dailyTarget: number;
};

export type KhatmaScheduleVersion = 1 | 2;

export type KhatmaTimeline = {
  elapsedDays: number;
  startsInDays: number;
  daysRemaining: number;
  isUpcoming: boolean;
  isWithinPlan: boolean;
  isExpired: boolean;
};

/** Resolve plan timing from local civil-date keys, without UTC-midnight drift. */
export function getKhatmaTimeline(
  startISO: string,
  todayISO: string,
  plannedDays: number,
): KhatmaTimeline | null {
  if (parseISO(startISO) === null || parseISO(todayISO) === null) return null;
  const days = Math.max(1, Math.floor(Number.isFinite(plannedDays) ? plannedDays : 1));
  const elapsedDays = daysBetween(startISO, todayISO);
  return {
    elapsedDays,
    startsInDays: Math.max(0, -elapsedDays),
    daysRemaining: Math.max(0, days - Math.max(0, elapsedDays)),
    isUpcoming: elapsedDays < 0,
    isWithinPlan: elapsedDays >= 0 && elapsedDays < days,
    isExpired: elapsedDays >= days,
  };
}

/** Split a complete Quran reading into adjacent ranges that cover every ayah once. */
export function getKhatmaDayRange(
  dayIndex: number,
  days: number,
  totalAyahs = TOTAL_QURAN_AYAHS,
  version: KhatmaScheduleVersion = 2,
): KhatmaDayRange {
  const safeDays = Math.max(1, Math.floor(Number.isFinite(days) ? days : 1));
  const safeTotal = Math.max(0, Math.floor(Number.isFinite(totalAyahs) ? totalAyahs : TOTAL_QURAN_AYAHS));
  const safeIndex = Math.max(0, Math.min(safeDays - 1, Math.floor(Number.isFinite(dayIndex) ? dayIndex : 0)));
  const legacyDailyTarget = Math.ceil(safeTotal / safeDays);
  const through = version === 1
    ? Math.min(safeTotal, (safeIndex + 1) * legacyDailyTarget)
    : Math.floor((safeTotal * (safeIndex + 1)) / safeDays);
  const before = version === 1
    ? Math.max(0, through - legacyDailyTarget)
    : Math.floor((safeTotal * safeIndex) / safeDays);
  const count = Math.max(0, through - before);

  return {
    dayIndex: safeIndex,
    days: safeDays,
    firstAyah: before + 1,
    lastAyah: through,
    count,
    dailyTarget: version === 1 ? legacyDailyTarget : count,
  };
}

export function isKhatmaDateWithinPlan(
  dateISO: string,
  startISO: string,
  plannedDays: number,
): boolean {
  if (parseISO(dateISO) === null || parseISO(startISO) === null) return false;
  const days = Math.max(1, Math.floor(Number.isFinite(plannedDays) ? plannedDays : 1));
  const elapsed = daysBetween(startISO, dateISO);
  return elapsed >= 0 && elapsed < days;
}

export function countCompletedKhatmaDays(
  startISO: string,
  plannedDays: number,
  completed: Record<string, boolean> | null | undefined,
): number {
  return Object.entries(completed ?? {}).filter(
    ([dateISO, done]) => done && isKhatmaDateWithinPlan(dateISO, startISO, plannedDays),
  ).length;
}

/** Date expiry alone must not be presented as a completed reading plan. */
export function getKhatmaPlanStatus(
  elapsedDays: number,
  plannedDays: number,
  completedDays: number,
): KhatmaPlanStatus {
  const days = Math.max(1, Math.floor(Number.isFinite(plannedDays) ? plannedDays : 1));
  const completed = Math.max(0, Math.floor(Number.isFinite(completedDays) ? completedDays : 0));
  if (completed >= days) return "completed";
  if (elapsedDays >= days) return "expired";
  return "active";
}
