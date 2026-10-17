/**
 * The weekly review behind رؤيتي.
 *
 * A dashboard shows numbers; a review says what they mean. This takes the last
 * seven days and the seven before, scores each area the person actually uses
 * (an area with no data is left out rather than scored zero), and turns the
 * differences into a few plain sentences: what is strongest, what needs
 * attention, what moved.
 *
 * Pure: plain data in, a review out.
 */
import { addDays } from "@/lib/qadaa";

export type ReviewInput = {
  today: string;
  /** Civil day -> prayer name -> prayed. */
  prayerLog: Record<string, Record<string, boolean>>;
  /** Day -> ayahs read. */
  quranDailyAyahs: Record<string, number>;
  quranDailyGoal: number;
  /** "morning" / "evening" -> days completed. */
  sectionCompletions: Record<string, string[]>;
  /** Share of due wird items met over a window, or null when there are none. */
  wirdRate: (end: string, days: number) => number | null;
  /** Mean muhasaba day-score over a window, or null when nothing was recorded. */
  muhasabaMean: (end: string, days: number) => number | null;
  /** Qadaa made up per day. */
  qadaaDayTotals: Record<string, number>;
};

export type AreaId = "prayer" | "quran" | "adhkar" | "wird" | "muhasaba";

export const AREA_LABEL: Record<AreaId, string> = {
  prayer: "الصلاة",
  quran: "القرآن",
  adhkar: "الأذكار",
  wird: "الورد",
  muhasaba: "المحاسبة",
};

export type AreaScore = { id: AreaId; label: string; score: number; previous: number | null; delta: number | null };

export type DayBar = { day: string; value: number };

export type Review = {
  /** 0..1 over the areas with data, or null when there is nothing to judge. */
  consistency: number | null;
  previousConsistency: number | null;
  areas: AreaScore[];
  strongest: AreaScore | null;
  weakest: AreaScore | null;
  /** Largest move (either way) of at least `MOVE`, or null. */
  mover: AreaScore | null;
  /** Per day overall, oldest first, over the 7 days. */
  days: DayBar[];
  bestDay: string | null;
  qadaaMadeUp: number;
  lines: string[];
};

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const MOVE = 0.1;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const window7 = (end: string) => Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));

function prayerDay(i: ReviewInput, day: string): number | null {
  const d = i.prayerLog[day];
  if (!d) return null;
  return PRAYERS.filter((p) => d[p]).length / PRAYERS.length;
}

function quranDay(i: ReviewInput, day: string): number | null {
  const n = i.quranDailyAyahs[day];
  if (typeof n !== "number") return null;
  return Math.min(1, n / Math.max(1, i.quranDailyGoal));
}

function adhkarDay(i: ReviewInput, day: string): number {
  const m = (i.sectionCompletions.morning ?? []).includes(day) ? 1 : 0;
  const e = (i.sectionCompletions.evening ?? []).includes(day) ? 1 : 0;
  return (m + e) / 2;
}

/** An area's score over seven days ending at `end`; null if the person has no data in it. */
function areaScore(i: ReviewInput, id: AreaId, end: string): number | null {
  const days = window7(end);
  switch (id) {
    case "prayer": {
      const xs = days.map((d) => prayerDay(i, d)).filter((x): x is number => x !== null);
      // A week with only a day or two logged is a week of not logging, not of not praying.
      return xs.length >= 2 ? (xs.reduce((a, b) => a + b, 0) / 7) : null;
    }
    case "quran": {
      const xs = days.map((d) => quranDay(i, d) ?? 0);
      return days.some((d) => quranDay(i, d) !== null) ? xs.reduce((a, b) => a + b, 0) / 7 : null;
    }
    case "adhkar": {
      const any = days.some((d) => adhkarDay(i, d) > 0);
      return any ? days.reduce((s, d) => s + adhkarDay(i, d), 0) / 7 : null;
    }
    case "wird":
      return i.wirdRate(end, 7);
    case "muhasaba":
      return i.muhasabaMean(end, 7);
  }
}

const pct = (x: number) => Math.round(x * 100);
const AR = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

export function buildReview(i: ReviewInput): Review {
  const ids: AreaId[] = ["prayer", "quran", "adhkar", "wird", "muhasaba"];
  const prevEnd = addDays(i.today, -7);
  const areas: AreaScore[] = [];
  for (const id of ids) {
    const score = areaScore(i, id, i.today);
    if (score === null) continue;
    const previous = areaScore(i, id, prevEnd);
    areas.push({ id, label: AREA_LABEL[id], score, previous, delta: previous === null ? null : score - previous });
  }

  const prevScores = ids.map((id) => areaScore(i, id, prevEnd)).filter((x): x is number => x !== null);
  const consistency = mean(areas.map((a) => a.score));
  const previousConsistency = mean(prevScores);

  const sorted = [...areas].sort((a, b) => b.score - a.score);
  const strongest = sorted[0] ?? null;
  const weakest = sorted.length > 1 ? sorted[sorted.length - 1] : null;
  const movers = areas.filter((a) => a.delta !== null && Math.abs(a.delta) >= MOVE).sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!));
  const mover = movers[0] ?? null;

  const days: DayBar[] = window7(i.today).map((day) => {
    const parts = [prayerDay(i, day), quranDay(i, day), (i.sectionCompletions.morning ?? []).includes(day) || (i.sectionCompletions.evening ?? []).includes(day) ? adhkarDay(i, day) : null]
      .filter((x): x is number => x !== null);
    return { day, value: parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0 };
  });
  const best = [...days].sort((a, b) => b.value - a.value)[0];
  const bestDay = best && best.value > 0 ? best.day : null;
  const qadaaMadeUp = window7(i.today).reduce((s, d) => s + (i.qadaaDayTotals[d] ?? 0), 0);

  const lines: string[] = [];
  if (consistency !== null) {
    if (previousConsistency !== null) {
      const d = consistency - previousConsistency;
      lines.push(
        d >= MOVE ? `أسبوعك أفضل من الذي قبله بنحو ${AR(pct(d))}٪. استمر على ما فعلت.`
        : d <= -MOVE ? `أسبوعك أقل من الذي قبله بنحو ${AR(pct(-d))}٪. لا بأس، ابدأ بأسهل عبادة وارجع.`
        : "أسبوعك قريب من الذي قبله، والثبات نعمة.",
      );
    } else {
      lines.push(`التزامك هذا الأسبوع ${AR(pct(consistency))}٪ فيما تتابعه.`);
    }
  }
  if (strongest) lines.push(`أكثر ما تلتزم به: ${strongest.label} (${AR(pct(strongest.score))}٪).`);
  if (weakest && strongest && weakest.id !== strongest.id && weakest.score < 0.6) {
    lines.push(`يحتاج اهتمامًا أكثر: ${weakest.label} (${AR(pct(weakest.score))}٪).`);
  }
  if (mover && mover.id !== strongest?.id && mover.delta !== null) {
    lines.push(mover.delta > 0 ? `${mover.label} تحسنت ${AR(pct(mover.delta))}٪ عن الأسبوع الماضي.` : `${mover.label} انخفضت ${AR(pct(-mover.delta))}٪ عن الأسبوع الماضي.`);
  }
  if (qadaaMadeUp > 0) lines.push(`قضيتَ هذا الأسبوع ${AR(qadaaMadeUp)} من الصلوات الفائتة.`);

  return { consistency, previousConsistency, areas, strongest, weakest, mover, days, bestDay, qadaaMadeUp, lines };
}
