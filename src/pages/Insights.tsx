import * as React from "react";
import { Flame, TrendingUp, Trophy, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { toPng } from "html-to-image";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useNoorStore } from "@/store/noorStore";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { coerceCount } from "@/data/types";
import { pct } from "@/lib/utils";
import { getSectionIdentity } from "@/lib/sectionIdentity";
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

function computeBestStreak(activity: Record<string, number>): number {
  const active = Object.keys(activity)
    .filter((d) => (activity[d] ?? 0) > 0)
    .sort();
  if (!active.length) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < active.length; i++) {
    const prev = new Date((active[i - 1] ?? "") + "T00:00:00");
    const curr = new Date((active[i] ?? "") + "T00:00:00");
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

type MilestoneType = "total" | "streak";
const MILESTONES: Array<{ id: string; label: string; emoji: string; req: number; type: MilestoneType }> = [
  { id: "total_100",   label: "بداية الطريق", emoji: "🌱", req: 100,   type: "total" },
  { id: "total_500",   label: "مثابر",         emoji: "⭐", req: 500,   type: "total" },
  { id: "total_1k",    label: "متقن",          emoji: "🌟", req: 1000,  type: "total" },
  { id: "total_5k",    label: "حافظ",          emoji: "🏆", req: 5000,  type: "total" },
  { id: "total_10k",   label: "ولي",           emoji: "💫", req: 10000, type: "total" },
  { id: "streak_7",    label: "أسبوع نور",     emoji: "🔥", req: 7,     type: "streak" },
  { id: "streak_30",   label: "شهر صبر",       emoji: "⚡", req: 30,    type: "streak" },
  { id: "streak_100",  label: "مئة يوم",        emoji: "🌙", req: 100,   type: "streak" },
];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_LABELS = ["أحد", "إثن", "ثلث", "أرب", "خمس", "جمع", "سبت"];

export function InsightsPage() {
  const navigate = useNavigate();
  const activity = useNoorStore((s) => s.activity);
  const dailyWirdDone = useNoorStore((s) => s.dailyWirdDone);
  const progressMap = useNoorStore((s) => s.progress);
  const { data: adhkarData } = useAdhkarDB();
  const streak = React.useMemo(() => computeStreak(activity), [activity]);
  const bestStreak = React.useMemo(() => computeBestStreak(activity), [activity]);

  const bestDay = React.useMemo(() => {
    let max = 0;
    let key = "";
    for (const [dayKey, value] of Object.entries(activity)) {
      const count = value ?? 0;
      if (count > max) {
        max = count;
        key = dayKey;
      }
    }
    return { count: max, key };
  }, [activity]);

  // Build 28-day heatmap aligned to Sunday columns
  const { heatmap, maxCount } = React.useMemo(() => {
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

    return { heatmap: weeks, maxCount };
  }, [activity]);

  const total = Object.values(activity).reduce((a, b) => a + (b ?? 0), 0);
  const todayKey = useTodayKey();

  const todayCount = activity[todayKey] ?? 0;

  const unlockedMilestones = React.useMemo(
    () => MILESTONES.map((m) => ({ ...m, unlocked: m.type === "total" ? total >= m.req : streak >= m.req })),
    [total, streak]
  );

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

  const last7Days = React.useMemo(() => {
    const today = new Date();
    const days: { key: string; count: number; isToday: boolean; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = dateKey(d);
      days.push({
        key: k,
        count: activity[k] ?? 0,
        isToday: i === 0,
        label: DAY_LABELS[d.getDay()] ?? "",
      });
    }
    return days;
  }, [activity]);

  const maxWeekDay = React.useMemo(
    () => Math.max(1, ...last7Days.map((d) => d.count)),
    [last7Days]
  );

  const isWirdDone = !!dailyWirdDone[todayKey];

  // Share progress card
  const shareCardRef = React.useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = React.useState(false);

  async function shareProgress() {
    if (!shareCardRef.current || sharing) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(shareCardRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "ATHAR-progress.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "تقدمي في ATHAR", text: `سلسلة ${streak} يوم • ${total} ذكر ✨` });
      } else {
        // Fallback: download
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "ATHAR-progress.png";
        a.click();
        toast.success("تم تحميل بطاقة التقدم");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("تعذر مشاركة البطاقة");
      }
    } finally {
      setSharing(false);
    }
  }

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
      {/* Hidden shareable progress card (off-screen) */}
      <div
        ref={shareCardRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "340px",
          padding: "28px 24px",
          background: "var(--bg)",
          borderRadius: "24px",
          color: "var(--fg)",
          fontFamily: "'Noto Sans Arabic', sans-serif",
          direction: "rtl",
          border: "2px solid rgba(255,255,255,0.12)",
        }}
      >
        <div style={{ fontSize: "13px", opacity: 0.6, marginBottom: "4px" }}>تقدمي في</div>
        <div style={{ fontSize: "26px", fontWeight: 800, marginBottom: "16px", color: "var(--accent)" }}>ATHAR</div>
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          {[
            { label: "السلسلة", value: `${streak} يوم`, emoji: streak >= 7 ? "🔥" : "✨" },
            { label: "الإجمالي", value: `${total}`, emoji: "📿" },
            { label: "اليوم", value: `${todayCount}`, emoji: "🌙" },
            { label: "أفضل", value: `${bestStreak}د`, emoji: "🏆" },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1,
              textAlign: "center",
              background: "rgba(255,255,255,0.07)",
              borderRadius: "14px",
              padding: "10px 4px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}>
              <div style={{ fontSize: "18px", marginBottom: "4px" }}>{s.emoji}</div>
              <div style={{ fontSize: "14px", fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: "10px", opacity: 0.55, marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{
          textAlign: "center",
          fontSize: "11px",
          opacity: 0.45,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: "12px",
        }}>
          {new Date().toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

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
        <div className="relative mt-4 grid grid-cols-5 gap-2">
          <MiniStatSmall label="اليوم" value={`${todayCount}`} accent />
          <MiniStatSmall label="الأسبوع" value={`${weekTotal}`} />
          <MiniStatSmall label="الإجمالي" value={`${total}`} />
          <MiniStatSmall label="أفضل يوم" value={bestDay.count > 0 ? `${bestDay.count}` : "—"} />
          <MiniStatSmall label="أفضل سلسلة" value={bestStreak > 0 ? `${bestStreak}` : "—"} />
        </div>
        {bestDay.key && (
          <div className="relative mt-3 text-[11px] opacity-55">
            أعلى نشاط كان في {new Date(bestDay.key + "T00:00:00").toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}
          </div>
        )}
        <div className="relative mt-4">
          <Button
            variant="secondary"
            onClick={shareProgress}
            disabled={sharing}
            className="w-full"
            aria-label="شارك تقدمك"
          >
            <Share2 size={15} />
            {sharing ? "جاري التحضير..." : "شارك تقدمك"}
          </Button>
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
                // Dynamic heat thresholds based on personal best
                const q1 = Math.max(1, Math.ceil(maxCount * 0.25));
                const q2 = Math.max(2, Math.ceil(maxCount * 0.5));
                const q3 = Math.max(3, Math.ceil(maxCount * 0.75));
                const heat = count === 0 ? 0 : count < q1 ? 1 : count < q2 ? 2 : count < q3 ? 3 : 4;
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

      {/* 7-day activity bar chart */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-[var(--accent)]" />
          <div className="font-semibold text-sm">نشاط الأسبوع</div>
          <span className="text-[11px] opacity-50 mr-auto tabular-nums">{weekTotal} إجمالي</span>
        </div>
        <div className="flex items-end gap-1.5" style={{ height: "80px" }}>
          {last7Days.map((day) => {
            const barH = day.count > 0 ? Math.max(6, Math.round((day.count / maxWeekDay) * 60)) : 3;
            return (
              <div key={day.key} className="flex-1 flex flex-col items-center gap-1" style={{ height: "100%", justifyContent: "flex-end" }}>
                {day.count > 0 && (
                  <span className="text-[9px] opacity-60 tabular-nums leading-none mb-0.5">{day.count}</span>
                )}
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${barH}px`,
                    background: day.isToday
                      ? "var(--accent)"
                      : day.count > 0
                        ? "color-mix(in srgb, var(--accent) 55%, transparent)"
                        : "rgba(255,255,255,0.06)",
                  }}
                />
                <span
                  className="text-[10px] leading-none mt-1 font-medium"
                  style={{ opacity: day.isToday ? 0.9 : 0.45, color: day.isToday ? "var(--accent)" : undefined }}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Milestone badges */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="font-semibold text-sm">شارات الإنجاز</div>
          <span className="text-[11px] opacity-50">
            {unlockedMilestones.filter((m) => m.unlocked).length}/{MILESTONES.length}
          </span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-0.5">
          {unlockedMilestones.map((m) => (
            <div
              key={m.id}
              className={[
                "flex-none flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-3xl border transition-all",
                m.unlocked
                  ? "border-[var(--accent)]/35 bg-[var(--accent)]/10"
                  : "border-white/8 bg-white/3 opacity-40 grayscale",
              ].join(" ")}
              title={m.unlocked ? `مفتوح — ${m.type === "total" ? `${m.req} ذكر` : `${m.req} يوم سلسلة`}` : `يتطلب ${m.type === "total" ? `${m.req} ذكر` : `${m.req} يوم متواصل`}`}
            >
              <span className="text-2xl leading-none">{m.emoji}</span>
              <span className="text-[11px] font-medium whitespace-nowrap">{m.label}</span>
              <span className="text-[10px] opacity-55 tabular-nums whitespace-nowrap">
                {m.type === "total" ? `${m.req}` : `${m.req}د`}
              </span>
            </div>
          ))}
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

      {/* Sections progress overview */}
      {adhkarData && adhkarData.db.sections.length > 0 && (
        <Card className="p-5">
          <div className="text-sm font-semibold mb-3">تقدّم الأقسام</div>
          <div className="space-y-2">
            {adhkarData.db.sections.map((s) => {
              const identity = getSectionIdentity(s.id);
              let done = 0;
              let total = 0;
              s.content.forEach((item, idx) => {
                const t = coerceCount(item.count);
                const c = Math.min(Math.max(0, Number(progressMap[`${s.id}:${idx}`]) || 0), t);
                total += t;
                done += c;
              });
              const percent = pct(done, total);
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="text-base shrink-0">{identity.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs truncate opacity-80">{s.title}</span>
                      <span className="text-[11px] opacity-50 tabular-nums shrink-0">{percent}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{ width: `${percent}%`, background: percent >= 100 ? "var(--ok)" : identity.accent }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
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
