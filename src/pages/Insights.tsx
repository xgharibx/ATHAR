import * as React from "react";
import { Flame, TrendingUp, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
  const navigate = useNavigate();
  const activity = useNoorStore((s) => s.activity);
  const dailyWirdDone = useNoorStore((s) => s.dailyWirdDone);
  const streak = React.useMemo(() => computeStreak(activity), [activity]);

  const bestDay = React.useMemo(() => {
    let max = 0;
    for (const v of Object.values(activity)) {
      if ((v ?? 0) > max) max = v ?? 0;
    }
    return max;
  }, [activity]);

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

  const todayCount = activity[todayKey] ?? 0;

  const weekTotal = React.useMemo(() => {
    const today = new Date();
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      sum += activity[k] ?? 0;
    }
    return sum;
  }, [activity]);

  const isWirdDone = !!dailyWirdDone[todayKey];

  const streakFireClass =
    streak >= 30 ? "text-orange-400" :
    streak >= 7  ? "text-yellow-400" :
    streak >= 1  ? "text-[var(--accent)]" : "opacity-40";

  const streakLabel =
    streak >= 30 ? "ماشاء الله! 🔥" :
    streak >= 7  ? "أسبوع متواصل ✨" :
    streak >= 3  ? "ثلاثة أيام 🌟" :
    streak >= 2  ? "يومان متواصلان ✨" :
    streak >= 1  ? "انطلاقة جيدة ✨" : "ابدأ اليوم";

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
          <MiniStatSmall label="اليوم" value={`${todayCount}`} accent />
          <MiniStatSmall label="الأسبوع" value={`${weekTotal}`} />
          <MiniStatSmall label="الإجمالي" value={`${total}`} />
          <MiniStatSmall label="أفضل يوم" value={`${bestDay}`} />
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

      {/* Wird status + leaderboard link */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-lg border ${isWirdDone ? "border-[var(--ok)]/30 bg-[var(--ok)]/10" : "border-white/10 bg-white/5"}`}>
              {isWirdDone ? "✅" : "📖"}
            </div>
            <div>
              <div className="text-sm font-semibold">ورد اليوم</div>
              <div className="text-xs opacity-60 mt-0.5">{isWirdDone ? "اكتمل اليوم" : "لم يكتمل بعد"}</div>
            </div>
          </div>
          <Button variant="secondary" onClick={() => navigate("/leaderboard")}>
            <Trophy size={15} />
            ترتيبي
          </Button>
        </div>
      </Card>

      {/* Note */}
      <div className="text-xs opacity-50 leading-6 px-1">
        ملاحظة: الإحصائيات محلية على جهازك. إذا حذفت بيانات المتصفح/التطبيق سيتم فقدها.
      </div>
    </div>
  );
}

function MiniStatSmall(props: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`glass rounded-2xl p-2.5 border text-center ${props.accent ? "border-[var(--accent)]/30 bg-[var(--accent)]/8" : "border-white/10"}`}>
      <div className="text-[11px] opacity-55 truncate">{props.label}</div>
      <div className={`text-sm font-bold mt-0.5 tabular-nums ${props.accent ? "text-[var(--accent)]" : ""}`}>{props.value}</div>
    </div>
  );
}
