import * as React from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { arNum } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import { useNoorStore, ibadahDayKeyOf } from "@/store/noorStore";
import { buildReview } from "@/lib/weeklyReview";
import { completionRate, type WirdAuto } from "@/lib/wird";
import { deedsFor } from "@/data/muhasabaCatalog";
import { weeklyScores } from "@/lib/muhasaba";
import { parseISO } from "@/lib/qadaa";

const DAY = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const pct = (x: number) => `${arNum(Math.round(x * 100))}٪`;

/**
 * "أسبوعك": the one card that says what the numbers below mean. It draws on
 * everything the app tracks — prayers, Quran, adhkar, the wird table, the
 * muhasaba table and qadaa — and leaves out whatever the person does not use.
 */
export function WeeklyReviewCard() {
  const today = useNoorStore((s) => ibadahDayKeyOf(s));
  const prayerLog = useNoorStore((s) => s.prayerLog);
  const ayahs = useNoorStore((s) => s.quranDailyAyahs);
  const goal = useNoorStore((s) => s.prefs.quranDailyGoal ?? 10);
  const sections = useNoorStore((s) => s.sectionCompletions);
  const wirdItems = useNoorStore((s) => s.wirdItems);
  const wirdLog = useNoorStore((s) => s.wirdLog);
  const muhasabaLog = useNoorStore((s) => s.muhasabaLog);
  const gender = useNoorStore((s) => s.muhasabaGender);
  const hidden = useNoorStore((s) => s.muhasabaHidden);
  const qadaaDayTotals = useNoorStore((s) => s.qadaaDayTotals);

  const review = React.useMemo(() => {
    const items = Object.values(wirdItems);
    const external = (auto: WirdAuto, day: string) =>
      auto === "quranAyahs" ? ayahs?.[day] ?? 0 : (sections?.[auto === "morningAdhkar" ? "morning" : "evening"] ?? []).includes(day) ? 1 : 0;
    const deeds = deedsFor(gender).filter((d) => !hidden[d.id]);
    return buildReview({
      today,
      prayerLog: prayerLog ?? {},
      quranDailyAyahs: ayahs ?? {},
      quranDailyGoal: goal,
      sectionCompletions: sections ?? {},
      wirdRate: (end, days) => (items.length ? completionRate(wirdLog, items, end, days, external) : null),
      muhasabaMean: (end) => {
        if (!gender) return null;
        const w = weeklyScores(muhasabaLog, deeds, end, 1)[0];
        return w?.score ?? null;
      },
      qadaaDayTotals: qadaaDayTotals ?? {},
    });
  }, [today, prayerLog, ayahs, goal, sections, wirdItems, wirdLog, muhasabaLog, gender, hidden, qadaaDayTotals]);

  if (review.consistency === null) {
    return (
      <Card className="p-5 space-y-2" data-testid="weekly-review">
        <h2 className="text-base font-semibold">أسبوعك</h2>
        <p className="text-sm text-[var(--muted)] leading-7">
          تتبّع صلاتك أو قرآنك أو أذكارك بضعة أيام وسأكتب لك هنا مراجعة أسبوعك: أين أنت أقوى، وأين تحتاج عناية.
        </p>
        <div className="flex gap-2 text-sm">
          <Link to="/wird" className="underline text-[var(--accent)]">جدول الورد</Link>
          <Link to="/muhasaba" className="underline text-[var(--accent)]">جدول المحاسبة</Link>
        </div>
      </Card>
    );
  }

  const max = Math.max(0.01, ...review.days.map((d) => d.value));
  return (
    <Card className="p-5 space-y-4" data-testid="weekly-review">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">أسبوعك</h2>
        <div className="text-end">
          <div className="text-2xl font-bold leading-none">{pct(review.consistency)}</div>
          <div className="text-[10px] text-[var(--muted)]">الثبات</div>
        </div>
      </div>

      <div className="flex items-end gap-1.5 h-16" aria-label="الأيام السبعة الأخيرة">
        {review.days.map((d) => {
          const ms = parseISO(d.day);
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${d.day}: ${pct(d.value)}`}>
              <div
                className={cn("w-full rounded-t-md", d.day === review.bestDay ? "bg-[var(--accent)]" : "bg-[var(--accent)]/45")}
                style={{ height: `${Math.max(4, (d.value / max) * 100)}%`, opacity: d.value === 0 ? 0.25 : 1 }}
              />
              <span className="text-[9px] text-[var(--muted)]">{ms === null ? "" : DAY[new Date(ms).getUTCDay()]}</span>
            </div>
          );
        })}
      </div>

      <ul className="space-y-1.5 text-sm leading-7">
        {review.lines.map((l) => <li key={l}>{l}</li>)}
      </ul>

      <div className="grid grid-cols-2 gap-2">
        {review.areas.map((a) => (
          <div key={a.id} className="rounded-2xl bg-[var(--card)] px-3 py-2.5">
            <div className="flex justify-between text-xs">
              <span>{a.label}</span>
              <span className="text-[var(--muted)]">{pct(a.score)}</span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-[var(--stroke)] overflow-hidden">
              <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.round(a.score * 100)}%` }} />
            </div>
            {a.delta !== null && Math.abs(a.delta) >= 0.05 && (
              <div className="text-[10px] mt-1 text-[var(--muted)]">{a.delta > 0 ? "↑" : "↓"} {pct(Math.abs(a.delta))} عن الأسبوع الماضي</div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-3 text-xs">
        <Link to="/wird" className="underline text-[var(--accent)]">جدول الورد</Link>
        <Link to="/muhasaba" className="underline text-[var(--accent)]">جدول المحاسبة</Link>
        <Link to="/qadaa" className="underline text-[var(--accent)]">القضاء</Link>
      </div>
    </Card>
  );
}
