/**
 * «مراجعة اليوم» across the Quran and the hadith: one queue in two parts.
 * The Quran's memorisation session counts pages (quran2/hifz/plan.ts); the
 * hadith cards count cards due by the day (HadithMemoCard.due is YYYY-MM-DD).
 * Each side shows the other's count and opens it, and the daily memorisation
 * reminder names both.
 */
import type { HadithMemoCard } from "@/data/hadithTypes";

/** YYYY-MM-DD of a moment, on this phone's calendar. */
export function localDayKey(ms: number = Date.now()): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** How many hadith cards are due on or before `day`. */
export function hadithDueOn(cards: Record<string, HadithMemoCard>, day: string): number {
  let n = 0;
  for (const card of Object.values(cards)) if (card.due <= day) n++;
  return n;
}
