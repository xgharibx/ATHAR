/**
 * «تحدي الأسبوع» — one small, concrete goal each week, counted from what the
 * reader actually does in the app.
 *
 * It used to be a row of seven buttons the reader ticked by hand, over the
 * last seven days rather than the week itself, with days keyed in UTC (so an
 * evening's adhkar could land on the next day), and progress reset on Monday.
 * Now:
 *   - the week runs Saturday to Friday, by the phone's own date;
 *   - a day counts when the app saw it done (the adhkar finished, the daily
 *     wird reached, al-Kahf read to its end), or when the reader marks a past
 *     day themselves (reading from a printed mushaf, say);
 *   - four challenges take turns, one a week.
 */
import { getLocalDateKey, parseDateKey, shiftDateKey } from "@/lib/dayBoundaries";

export type WeeklyChallengeKind = "morning_adhkar_5days" | "al_kahf" | "evening_adhkar_5days" | "wird_5days";

export const WEEKLY_CHALLENGES: Record<WeeklyChallengeKind, {
  title: string;
  desc: string;
  emoji: string;
  target: number;
  targetLabel: string;
  /** Where the reader goes to do it. */
  route: string;
  action: string;
}> = {
  morning_adhkar_5days: {
    title: "أذكار الصباح ٥ أيام",
    desc: "داوم على أذكار الصباح خمسة أيام من هذا الأسبوع",
    emoji: "🌅",
    target: 5,
    targetLabel: "٥ أيام من ٧",
    route: "/c/morning",
    action: "افتح أذكار الصباح",
  },
  al_kahf: {
    title: "اقرأ سورة الكهف",
    desc: "أتمّ قراءة سورة الكهف هذا الأسبوع",
    emoji: "📖",
    target: 1,
    targetLabel: "مرة واحدة هذا الأسبوع",
    route: "/mushaf?surah=18",
    action: "افتح سورة الكهف",
  },
  evening_adhkar_5days: {
    title: "أذكار المساء ٥ أيام",
    desc: "داوم على أذكار المساء خمسة أيام من هذا الأسبوع",
    emoji: "🌙",
    target: 5,
    targetLabel: "٥ أيام من ٧",
    route: "/c/evening",
    action: "افتح أذكار المساء",
  },
  wird_5days: {
    title: "وردك اليومي ٥ أيام",
    desc: "أتمّ وردك من القرآن خمسة أيام من هذا الأسبوع",
    emoji: "📿",
    target: 5,
    targetLabel: "٥ أيام من ٧",
    route: "/mushaf",
    action: "افتح المصحف",
  },
};

const ROTATION: WeeklyChallengeKind[] = ["morning_adhkar_5days", "al_kahf", "evening_adhkar_5days", "wird_5days"];

/** The Saturday that starts the week holding `dateKey`. */
export function weekStartOf(dateKey: string): string {
  const date = parseDateKey(dateKey) ?? new Date();
  // getDay(): Sunday 0 … Saturday 6. Days since the last Saturday:
  const sinceSaturday = (date.getDay() + 1) % 7;
  return shiftDateKey(getLocalDateKey(date), -sinceSaturday);
}

/** The seven days of the week starting `weekStart`, Saturday to Friday. */
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => shiftDateKey(weekStart, index));
}

/** The challenge of the week starting `weekStart`; every week of the year in turn. */
export function challengeOfWeek(weekStart: string): WeeklyChallengeKind {
  const start = parseDateKey(weekStart) ?? new Date();
  const weekNumber = Math.floor(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) / (7 * 86_400_000));
  return ROTATION[((weekNumber % ROTATION.length) + ROTATION.length) % ROTATION.length]!;
}

export type ChallengeEvidence = {
  sectionCompletions: Record<string, string[] | undefined>;
  quranDailyAyahs: Record<string, number | undefined>;
  quranDailyGoal: number;
  kahfReadOn: string[];
};

/** The days of the week the app saw the challenge done. */
export function autoDoneDays(kind: WeeklyChallengeKind, days: string[], evidence: ChallengeEvidence): Set<string> {
  const done = new Set<string>();
  const goal = Math.max(1, evidence.quranDailyGoal || 1);
  for (const day of days) {
    if (kind === "morning_adhkar_5days" && evidence.sectionCompletions.morning?.includes(day)) done.add(day);
    if (kind === "evening_adhkar_5days" && evidence.sectionCompletions.evening?.includes(day)) done.add(day);
    if (kind === "wird_5days" && (evidence.quranDailyAyahs[day] ?? 0) >= goal) done.add(day);
    if (kind === "al_kahf" && evidence.kahfReadOn.includes(day)) done.add(day);
  }
  return done;
}

export type ChallengeStatus = {
  kind: WeeklyChallengeKind;
  weekStart: string;
  days: Array<{ key: string; label: string; isToday: boolean; isFuture: boolean; auto: boolean; manual: boolean }>;
  count: number;
  target: number;
  completed: boolean;
};

const WEEKDAY_LABELS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function challengeStatus(today: string, manual: Record<string, boolean>, evidence: ChallengeEvidence): ChallengeStatus {
  const weekStart = weekStartOf(today);
  const kind = challengeOfWeek(weekStart);
  const keys = weekDays(weekStart);
  const auto = autoDoneDays(kind, keys, evidence);
  const days = keys.map((key) => ({
    key,
    label: WEEKDAY_LABELS[parseDateKey(key)!.getDay()]!,
    isToday: key === today,
    isFuture: key > today,
    auto: auto.has(key),
    manual: Boolean(manual[key]) && !auto.has(key),
  }));
  const count = days.filter((day) => day.auto || day.manual).length;
  const target = WEEKLY_CHALLENGES[kind].target;
  return { kind, weekStart, days, count, target, completed: count >= target };
}
