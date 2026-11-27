/**
 * Reading plans («خطط القراءة»): a book read in order, a share each day.
 * Progress is how far into the book you have read (its position in the
 * book's table of contents); the reader moves it on as you read in order.
 */
import { localDayKey } from "@/lib/reviewToday";

export type HadithPlanId = "nawawi" | "qudsi" | "bukhari-year" | "muslim-year";

export type HadithPlanDef = {
  id: HadithPlanId;
  book: string;
  title: string;
  line: string;
  /** Hadiths a day, or the days to finish in (the share a day follows from the book's size). */
  perDay?: number;
  days?: number;
};

export const HADITH_PLANS: HadithPlanDef[] = [
  { id: "nawawi", book: "nawawi", title: "الأربعون النووية", line: "حديث كل يوم", perDay: 1 },
  { id: "qudsi", book: "qudsi", title: "الأربعون القدسية", line: "حديث كل يوم", perDay: 1 },
  { id: "bukhari-year", book: "bukhari", title: "صحيح البخاري في سنة", line: "نحو عشرين حديثًا كل يوم", days: 365 },
  { id: "muslim-year", book: "muslim", title: "صحيح مسلم في سنة", line: "نحو عشرين حديثًا كل يوم", days: 365 },
];

export type HadithPlanState = {
  id: HadithPlanId;
  /** Day the plan began (YYYY-MM-DD). */
  start: string;
  /** Hadiths read from the start of the book, in order. */
  read: number;
  /** Daily reminder time «HH:MM» on phones, or null. */
  reminder: string | null;
};

export function planDef(id: HadithPlanId): HadithPlanDef {
  return HADITH_PLANS.find((p) => p.id === id) ?? HADITH_PLANS[0]!;
}

export function planPerDay(def: HadithPlanDef, total: number): number {
  return def.perDay ?? Math.max(1, Math.ceil(total / (def.days ?? 365)));
}

function daysBetween(from: string, to: string): number {
  const [a, b] = [from, to].map((d) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y!, m! - 1, day!);
  });
  return Math.max(0, Math.round((b! - a!) / 86_400_000));
}

export type PlanToday = {
  day: number;
  days: number;
  perDay: number;
  /** Where today's share ends (exclusive), as a count from the start of the book. */
  target: number;
  /** Today's share still unread. */
  left: number;
  done: boolean;
  finished: boolean;
  /** How far behind (or ahead, negative) the plan you are, in hadiths. */
  behind: number;
};

export function planToday(state: HadithPlanState, total: number, today: string = localDayKey()): PlanToday {
  const def = planDef(state.id);
  const perDay = planPerDay(def, total);
  const day = daysBetween(state.start, today) + 1;
  const days = Math.ceil(total / perDay);
  const target = Math.min(total, perDay * day);
  const read = Math.min(state.read, total);
  return {
    day: Math.min(day, days),
    days,
    perDay,
    target,
    left: Math.max(0, target - read),
    done: read >= target,
    finished: read >= total,
    behind: Math.max(0, perDay * (day - 1) - read),
  };
}
