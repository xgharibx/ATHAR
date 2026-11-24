/**
 * «القرآن ٢» — the day's memorisation, the way it is taught in the halaqah:
 *   الجديد  the new lesson (sabaq): the next page or pages to learn;
 *   القريب  the near review (sabqi): your latest pages, every day, while they settle;
 *   البعيد  the far review (manzil): older pages, each when the memory model says
 *           its recall is about to fall below 90 %, weakest first.
 */
import { retrievability, type CardState } from "./fsrs";

export type HifzDirection = "end" | "start";

export type HifzRecord = CardState & { learnedAt: number };

export type HifzPlan = {
  newPages: number[];
  near: number[];
  far: number[];
};

const TOTAL_PAGES = 604;
export const FAR_PER_DAY = 20;

/** The next pages not yet memorised, from the end of the mushaf or its start. */
export function nextNewPages(hifz: Record<number, unknown>, direction: HifzDirection, count: number): number[] {
  const out: number[] = [];
  if (direction === "start") {
    for (let p = 1; p <= TOTAL_PAGES && out.length < count; p++) if (!hifz[p]) out.push(p);
  } else {
    // From the end the way children learn it: Juz' 'Amma first, then backwards.
    for (let p = TOTAL_PAGES; p >= 1 && out.length < count; p--) if (!hifz[p]) out.push(p);
  }
  return out;
}

/**
 * How many new pages today. Half a page a day is one new page every other
 * day: none today if a page was learned yesterday.
 */
export function newPagesToday(newPerDay: number, learnedToday: number, learnedYesterday: boolean): number {
  if (newPerDay >= 1) return Math.max(0, Math.floor(newPerDay) - learnedToday);
  return learnedToday > 0 || learnedYesterday ? 0 : 1;
}

export function buildPlan(options: {
  hifz: Record<number, HifzRecord>;
  now: number;
  newCount: number;
  direction: HifzDirection;
  nearCount: number;
  learnedToday: number[];
}): HifzPlan {
  const { hifz, now, newCount, direction, nearCount, learnedToday } = options;
  const pages = Object.keys(hifz).map(Number);
  const latest = [...pages]
    .filter((p) => !learnedToday.includes(p))
    .sort((a, b) => hifz[b]!.learnedAt - hifz[a]!.learnedAt)
    .slice(0, nearCount);
  const reviewedToday = (p: number) => new Date(hifz[p]!.last).toDateString() === new Date(now).toDateString();
  const near = latest.filter((p) => !reviewedToday(p));
  const far = pages
    .filter((p) => !latest.includes(p) && !learnedToday.includes(p) && hifz[p]!.due <= now)
    .sort((a, b) => retrievability(hifz[a]!, now) - retrievability(hifz[b]!, now))
    .slice(0, FAR_PER_DAY);
  return { newPages: nextNewPages(hifz, direction, newCount), near, far };
}

/** Recall (0–1) of every page memorised, for the memory map; null if not memorised. */
export function memoryMap(hifz: Record<number, CardState>, now: number): Array<number | null> {
  return Array.from({ length: TOTAL_PAGES }, (_, i) => {
    const card = hifz[i + 1];
    return card ? retrievability(card, now) : null;
  });
}
