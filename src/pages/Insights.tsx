import * as React from "react";
import { Flame, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { useNoorStore } from "@/store/noorStore";
import { useTodayKey } from "@/hooks/useTodayKey";

function computeStreak(activity: Record<string, number>) {
  const days = Object.keys(activity).sort(); // ISO yyyy-mm-dd sorts naturally
  if (!days.length) return 0;

  const set = new Set(days.filter((d) => (activity[d] ?? 0) > 0));
  let streak = 0;

  const today = new Date();
  for (let i = 0; i < 3650; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;
    if (set.has(key)) streak++;
    else break;
  }
  return streak;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_LABELS = ["أحد", "إثن", "ثلث", "أرب", "خمس", "جمع", "سبت"];

export function InsightsPage() {
  const activity = useNoorStore((s) => s.activity);
  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);
  const quranBookmarks = useNoorStore((s) => s.quranBookmarks);
  const quranNotes = useNoorStore((s) => s.quranNotes);
  const dailyWirdDone = useNoorStore((s) => s.dailyWirdDone);
  const streak = React.useMemo(() => computeStreak(activity), [activity]);

  // Build 28-day heatmap aligned to Sunday columns
  const { heatmap, weekLabels } = React.useMemo(() => {
    const today = new Date();
    const todayKey = dateKey(today);
    // Find the last Sunday on or before today
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay());

    // Build 4 weeks (28 days): rows = weeks, cols = day of week
    const maxCount = Math.max(1, ...Object.values(activity).map(v => v ?? 0));
    const weeks: { key: string; count: number; isToday: boolean; dayLabel: string }[][] = [];

    for (let week = 3; week >= 0; week--) {
      const row: { key: string; count: number; isToday: boolean; dayLabel: string }[] = [];
      for (let day = 0; day < 7; day++) {
        const d = new Date(lastSunday);
        d.setDate(lastSunday.getDate() - week * 7 + day);
        const k = dateKey(d);
        const count = activity[k] ?? 0;
        const isFuture = d > today;
        row.push({
          key: k,
          count: isFuture ? -1 : count,
          isToday: k === todayKey,
          dayLabel: d.toLocaleDateString("ar-SA", { day: "numeric", month: "numeric" }),
        });
      }
      weeks.push(row);
    }

    return { heatmap: weeks, weekLabels: DAY_LABELS, maxCount };
  }, [activity]);

  const total = Object.values(activity).reduce((a, b) => a + (b ?? 0), 0);
  const todayKey = useTodayKey();

  const quickTotal = React.useMemo(() => {
    return Object.values(quickTasbeeh).reduce((acc, v) => acc + (v ?? 0), 0);
  }, [quickTasbeeh]);

  const bookmarkCount = React.useMemo(() => Object.values(quranBookmarks).filter(Boolean).length, [quranBookmarks]);
  const notesCount = React.useMemo(() => Object.values(quranNotes).filter((v) => (v ?? "").trim().length > 0).length, [quranNotes]);
  const isWirdDone = !!dailyWirdDone[todayKey];

  const streakFireClass =
    streak >= 30 ? "text-orange-400" :
    streak >= 7  ? "text-yellow-400" :
    streak >= 1  ? "text-[var(--accent)]" : "opacity-40";

  const streakLabel =
    streak >= 30 ? "ماشاء الله! 🔥" :
    streak >= 7  ? "أسبوع متواصل ✨" :
    streak >= 3  ? "ثلاثة أيام 🌟" :
    streak >= 1  ? `${streak} يوم` : "ابدأ اليوم";

  return (
    <div className="space-y-4 page-enter">
      {/* Hero Streak Card */}
      <Card className="p-5 relative overflow-hidden">
        <div className={`absolute inset-0 opacity-10 pointer-events-none ${
          streak >= 30 ? "bg-gradient-to-br from-orange-500 to-red-500" :
          streak >= 7  ? "bg-gradient-to-br from-yellow-400 to-amber-500" :
          streak >= 1  ? "bg-gradient-to-br from-[var(--accent)] to-blue-400" : ""
        }`} />

        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-[var(--accent)]" />
              <div className="text-xs opacity-60">الإحصائيات</div>
            </div>
            <div className="text-3xl font-bold tabular-nums leading-none">
              {streak}
              <span className="text-base font-normal opacity-70 mr-1">يوم</span>
            </div>
            <div className={`text-sm mt-1 font-medium ${streakFireClass}`}>{streakLabel}</div>
          </div>

          {/* Flame badge */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl glass border border-white/10 ${streak >= 1 ? "streak-fire" : "opacity-40"}`}>
            {streak >= 30 ? "🔥" : streak >= 7 ? "⚡" : streak >= 1 ? "✨" : "🕯️"}
          </div>
        </div>

        {/* Mini stats row */}
        <div className="relative mt-4 grid grid-cols-4 gap-2">
          <MiniStatSmall label="الكل" value={`${total}`} />
          <MiniStatSmall label="تسبيح" value={`${quickTotal}`} />
          <MiniStatSmall label="عناصر القرآن" value={`${bookmarkCount}`} />
          <MiniStatSmall label="الورد" value={isWirdDone ? "✅" : "○"} />
        </div>
      </Card>

      {/* 28-Day Heatmap */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Flame size={16} className="text-[var(--accent)]" />
          <div className="font-semibold text-sm">نشاط 28 يومًا</div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {DAY_LABELS.map((l) => (
            <div key={l} className="text-center text-[11px] opacity-55 font-medium">{l}</div>
          ))}
        </div>

        {/* Weeks */}
        <div className="space-y-1.5">
          {heatmap.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1.5">
              {week.map((cell) => {
                const isFuture = cell.count < 0;
                const count = Math.max(0, cell.count);
                // Heat level 0-4
                const heat = count === 0 ? 0 : count < 5 ? 1 : count < 15 ? 2 : count < 40 ? 3 : 4;
                const bg =
                  isFuture ? "bg-white/3 opacity-30" :
                  heat === 0 ? "bg-white/5" :
                  heat === 1 ? "bg-[var(--accent)]/25" :
                  heat === 2 ? "bg-[var(--accent)]/50" :
                  heat === 3 ? "bg-[var(--accent)]/75" :
                               "bg-[var(--accent)]";
                return (
                  <div
                    key={cell.key}
                    title={`${cell.key}: ${count}`}
                    className={`aspect-square rounded-md transition-colors ${bg} ${cell.isToday ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-transparent" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-1.5 justify-end">
          <span className="text-[11px] opacity-55">أقل</span>
          {[0,1,2,3,4].map((h) => (
            <div key={h} className={`w-3 h-3 rounded-sm ${
              h === 0 ? "bg-white/5" :
              h === 1 ? "bg-[var(--accent)]/25" :
              h === 2 ? "bg-[var(--accent)]/50" :
              h === 3 ? "bg-[var(--accent)]/75" :
                         "bg-[var(--accent)]"
            }`} />
          ))}
          <span className="text-[11px] opacity-55">أكثر</span>
        </div>
      </Card>

      {/* Note */}
      <div className="text-xs opacity-50 leading-6 px-1">
        ملاحظة: الإحصائيات محلية على جهازك. إذا حذفت بيانات المتصفح/التطبيق سيتم فقدها.
      </div>
    </div>
  );
}

function MiniStatSmall(props: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-2.5 border border-white/10 text-center">
      <div className="text-[11px] opacity-55 truncate">{props.label}</div>
      <div className="text-sm font-bold mt-0.5 tabular-nums">{props.value}</div>
    </div>
  );
}
