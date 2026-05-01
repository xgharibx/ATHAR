import * as React from "react";
import { Flame, TrendingUp, Trophy, Share2, BookOpen, Target, Sparkles, BarChart2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { toPng } from "html-to-image";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useNoorStore } from "@/store/noorStore";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useQuranDB } from "@/data/useQuranDB";
import { coerceCount } from "@/data/types";
import { pct } from "@/lib/utils";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { useTodayKey } from "@/hooks/useTodayKey";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { TOTAL_QURAN_AYAHS, SURAH_JUZ } from "@/lib/quranMeta";
import { DAILY_CHECKLIST_ITEMS } from "@/data/dailyGrowth";

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
  { id: "total_10k",   label: "رفيق الذكر",     emoji: "💫", req: 10000, type: "total" },
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
  const quranStreak = useNoorStore((s) => s.quranStreak);
  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);
  const quranReadingHistory = useNoorStore((s) => s.quranReadingHistory);
  const quranDailyGoal = useNoorStore((s) => s.prefs.quranDailyGoal);
  const { data: quranData } = useQuranDB();
  const dailyChecklist = useNoorStore((s) => s.dailyChecklist);
  const quranLastRead = useNoorStore((s) => s.quranLastRead);
  const prayerTimes = usePrayerTimes();
  const fajrTime = prayerTimes.data?.data?.timings?.Fajr;
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
  const civilTodayKey = useTodayKey();
  const worshipDayKey = useTodayKey({ mode: "ibadah", fajrTime });

  const todayCount = activity[civilTodayKey] ?? 0;

  const unlockedMilestones = React.useMemo(
    () => MILESTONES.map((m) => ({ ...m, unlocked: m.type === "total" ? total >= m.req : streak >= m.req })),
    [total, streak]
  );
  const nextMilestone = React.useMemo(
    () => unlockedMilestones.find((m) => !m.unlocked) ?? null,
    [unlockedMilestones]
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

  const lastWeekTotal = React.useMemo(() => {
    const today = new Date();
    let sum = 0;
    for (let i = 7; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = dateKey(d);
      sum += activity[k] ?? 0;
    }
    return sum;
  }, [activity]);

  const monthTotal = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `${y}-${m}-`;
    return Object.entries(activity)
      .filter(([k]) => k.startsWith(prefix))
      .reduce((s, [, v]) => s + (v ?? 0), 0);
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

  // ── Quran daily-ayahs computed values (Phases 22 & 30) ────
  const quranLast7Days = React.useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const k = dateKey(d);
      return { key: k, count: quranDailyAyahs[k] ?? 0, isToday: i === 6, label: DAY_LABELS[d.getDay()] ?? "" };
    });
  }, [quranDailyAyahs]);

  const quranMaxWeekDay = React.useMemo(
    () => Math.max(1, ...quranLast7Days.map((d) => d.count)),
    [quranLast7Days]
  );

  const quranWeekTotal = React.useMemo(
    () => quranLast7Days.reduce((s, d) => s + d.count, 0),
    [quranLast7Days]
  );

  const quranMonthTotal = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `${y}-${m}-`;
    return Object.entries(quranDailyAyahs)
      .filter(([k]) => k.startsWith(prefix))
      .reduce((s, [, v]) => s + (v ?? 0), 0);
  }, [quranDailyAyahs]);

  const todayQuranAyahs = quranDailyAyahs[civilTodayKey] ?? 0;
  const quranGoal = Math.max(1, quranDailyGoal ?? 10);
  const quranGoalPct = Math.min(100, Math.round((todayQuranAyahs / quranGoal) * 100));

  const quranSurahLengths = React.useMemo(() => {
    if (!quranData) return {} as Record<number, number>;
    const m: Record<number, number> = {};
    for (const s of quranData) m[s.id] = s.ayahs.length;
    return m;
  }, [quranData]);

  const quranStats = React.useMemo(() => {
    if (!quranData) return { started: 0, completed: 0, totalAyahs: 0 };
    let started = 0, completed = 0, totalAyahs = 0;
    for (const s of quranData) {
      const maxRead = quranReadingHistory[String(s.id)] ?? 0;
      if (maxRead > 0) {
        started++;
        totalAyahs += Math.min(maxRead, s.ayahs.length);
        if (maxRead >= s.ayahs.length) completed++;
      }
    }
    return { started, completed, totalAyahs };
  }, [quranData, quranReadingHistory]);

  const overallQuranProgress = React.useMemo(
    () => Math.min(100, Math.round((quranStats.totalAyahs / TOTAL_QURAN_AYAHS) * 100)),
    [quranStats.totalAyahs]
  );

  // Quran progress share card ref
  const quranShareCardRef = React.useRef<HTMLDivElement>(null);
  const [quranSharing, setQuranSharing] = React.useState(false);

  async function shareQuranProgress() {
    if (!quranShareCardRef.current || quranSharing) return;
    setQuranSharing(true);
    try {
      const dataUrl = await toPng(quranShareCardRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "ATHAR-quran-progress.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "تقدمي في القرآن", text: `${quranStats.completed} سورة مكتملة • ${overallQuranProgress}% ✨` });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "ATHAR-quran-progress.png";
        a.click();
        toast.success("تم تحميل بطاقة التقدم");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") toast.error("تعذر مشاركة البطاقة");
    } finally {
      setQuranSharing(false);
    }
  }

  // D9: per-section dhikr progress
  const sectionProgress = React.useMemo(() => {
    if (!adhkarData) return [];
    return adhkarData.db.sections
      .map((s) => {
        let done = 0, total = 0;
        s.content.forEach((item, i) => {
          const t = coerceCount(item.count);
          const c = Math.min(t, Math.max(0, Number(progressMap[`${s.id}:${i}`]) || 0));
          total += t;
          done += c;
        });
        const pctVal = total > 0 ? Math.round((done / total) * 100) : 0;
        const identity = getSectionIdentity(s.id);
        return { id: s.id, title: s.title, done, total, pctVal, icon: identity.icon, accent: identity.accent };
      })
      .filter((s) => s.total > 0)
      .sort((a, b) => b.pctVal - a.pctVal);
  }, [adhkarData, progressMap]);

  const isWirdDone = !!dailyWirdDone[worshipDayKey];
  const dailyChecklistToday = dailyChecklist[worshipDayKey] ?? {};
  const checklistDoneCount = DAILY_CHECKLIST_ITEMS.filter((item) => !!dailyChecklistToday[item.id]).length;
  const checklistTotal = DAILY_CHECKLIST_ITEMS.length;
  const checklistPct = Math.round((checklistDoneCount / checklistTotal) * 100);

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
          left: 0,
          top: 0,
          transform: "translateX(-120vw)",
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

      {/* ── يومك اليوم — Daily Snapshot ─────────────── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-[var(--accent)]" />
          <div className="text-xs font-semibold opacity-65">يومك اليوم</div>
          <div className="text-[10px] opacity-35 mr-auto">
            {new Date().toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {/* Adhkar */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex flex-col items-center rounded-2xl bg-white/5 border border-white/8 px-2 py-3 gap-0.5 transition hover:bg-white/8 active:scale-[.97]"
          >
            <span className="text-lg leading-none mb-0.5">📿</span>
            <span
              className="text-xl font-bold tabular-nums leading-none mt-0.5"
              style={{ color: todayCount > 0 ? "var(--accent)" : undefined }}
            >{todayCount}</span>
            <span className="text-[10px] opacity-50 mt-0.5">ذكر اليوم</span>
            {streak > 0 ? (
              <span
                className="text-[9px] mt-1 font-medium tabular-nums"
                style={{ color: streak >= 7 ? "#fb923c" : "var(--accent)" }}
              >🔥 {streak} يوم</span>
            ) : (
              <span className="text-[9px] mt-1 opacity-30">—</span>
            )}
          </button>
          {/* Quran */}
          <button
            type="button"
            onClick={() => navigate(quranLastRead ? `/quran/${quranLastRead.surahId}?a=${quranLastRead.ayahIndex}` : "/quran")}
            className="flex flex-col items-center rounded-2xl bg-white/5 border border-white/8 px-2 py-3 gap-0.5 transition hover:bg-white/8 active:scale-[.97]"
          >
            <span className="text-lg leading-none mb-0.5">📖</span>
            <span
              className="text-xl font-bold tabular-nums leading-none mt-0.5"
              style={{ color: quranGoalPct >= 100 ? "var(--ok)" : todayQuranAyahs > 0 ? "var(--accent)" : undefined }}
            >{todayQuranAyahs}</span>
            <span className="text-[10px] opacity-50 mt-0.5">/ {quranGoal} آية</span>
            <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${quranGoalPct}%`, background: quranGoalPct >= 100 ? "var(--ok)" : "var(--accent)" }}
              />
            </div>
          </button>
          {/* Checklist */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex flex-col items-center rounded-2xl bg-white/5 border border-white/8 px-2 py-3 gap-0.5 transition hover:bg-white/8 active:scale-[.97]"
          >
            <span className="text-lg leading-none mb-0.5">✅</span>
            <span
              className="text-xl font-bold tabular-nums leading-none mt-0.5"
              style={{ color: checklistPct >= 100 ? "var(--ok)" : checklistDoneCount > 0 ? "var(--accent)" : undefined }}
            >{checklistDoneCount}<span className="text-sm opacity-40 font-normal">/{checklistTotal}</span></span>
            <span className="text-[10px] opacity-50 mt-0.5">من القائمة</span>
            <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${checklistPct}%`, background: checklistPct >= 100 ? "var(--ok)" : "var(--accent)" }}
              />
            </div>
          </button>
        </div>
        {/* Perfect day banner */}
        {todayCount > 0 && quranGoalPct >= 100 && checklistPct >= 100 && (
          <div
            className="mt-3 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-xs font-semibold"
            style={{ background: "rgba(52,211,153,0.12)", color: "var(--ok)", border: "1px solid rgba(52,211,153,0.25)" }}
          >
            <span className="text-base leading-none">✨</span>
            <span>يوم مثالي — أنجزت الثلاثة اليوم</span>
          </div>
        )}
      </Card>

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
        {/* Monthly total */}
        {monthTotal > 0 && (
          <div className="relative mt-2 flex items-center gap-1.5 text-[11px] opacity-50">
            <span>هذا الشهر:</span>
            <span className="tabular-nums font-semibold opacity-100" style={{ color: "var(--accent)" }}>{monthTotal.toLocaleString("ar-SA")}</span>
            <span>ذكر</span>
          </div>
        )}
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
          {lastWeekTotal > 0 && (
            <span
              className={`text-[10px] tabular-nums font-semibold px-2 py-0.5 rounded-full border`}
              style={
                weekTotal >= lastWeekTotal
                  ? { background: "rgba(52,211,153,0.12)", color: "var(--ok)", borderColor: "rgba(52,211,153,0.25)" }
                  : { background: "rgba(248,113,113,0.10)", color: "rgb(248,113,113)", borderColor: "rgba(248,113,113,0.2)" }
              }
              title={`الأسبوع الماضي: ${lastWeekTotal}`}
            >
              {weekTotal >= lastWeekTotal ? "▲" : "▼"} {Math.abs(weekTotal - lastWeekTotal)}
            </span>
          )}
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

      {/* ── Phase 22: Quran Reading Analytics Card ─────────────── */}
      {(quranStreak > 0 || quranWeekTotal > 0 || todayQuranAyahs > 0) && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-[var(--accent)]" />
              <div className="font-semibold text-sm">إحصاءات القرآن</div>
            </div>
            {quranStreak > 0 && (
              <div className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                <Flame size={11} className="text-[var(--accent)]" />
                <span className="tabular-nums">{quranStreak} يوم</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <MiniStatSmall label="اليوم" value={`${todayQuranAyahs}`} accent />
            <MiniStatSmall label="الأسبوع" value={`${quranWeekTotal}`} />
            <MiniStatSmall label="الإجمالي" value={`${quranStats.totalAyahs.toLocaleString("ar-SA")}`} />
          </div>
          {/* Monthly ayahs */}
          {quranMonthTotal > 0 && (
            <div className="mb-4 -mt-2 flex items-center gap-1.5 text-[11px] opacity-50">
              <span>هذا الشهر:</span>
              <span className="tabular-nums font-semibold opacity-100" style={{ color: "var(--accent)" }}>{quranMonthTotal.toLocaleString("ar-SA")}</span>
              <span>آية</span>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5 text-xs opacity-65">
              <div className="flex items-center gap-1.5">
                <Target size={11} />
                <span>هدف اليوم: {todayQuranAyahs}/{quranGoal} آية</span>
              </div>
              <span className={`tabular-nums font-medium ${quranGoalPct >= 100 ? "text-[var(--ok)]" : ""}`}>
                {quranGoalPct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/8 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${quranGoalPct}%`, background: quranGoalPct >= 100 ? "var(--ok)" : "var(--accent)" }}
              />
            </div>
          </div>

          {quranWeekTotal > 0 && (
            <>
              <div className="text-xs opacity-50 mb-2 flex items-center justify-between">
                <span>نشاط القراءة (7 أيام)</span>
                <span className="tabular-nums">{quranWeekTotal} آية</span>
              </div>
              <div className="flex items-end gap-1.5" style={{ height: "64px" }}>
                {quranLast7Days.map((day) => {
                  const barH = day.count > 0 ? Math.max(6, Math.round((day.count / quranMaxWeekDay) * 48)) : 3;
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
            </>
          )}
        </Card>
      )}

      {/* Milestone badges */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="font-semibold text-sm">شارات الإنجاز</div>
          <span className="text-[11px] opacity-50">
            {unlockedMilestones.filter((m) => m.unlocked).length}/{MILESTONES.length}
          </span>
        </div>
        {nextMilestone ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] opacity-55">الشارة القادمة</div>
              <div className="mt-1 text-sm font-semibold truncate">{nextMilestone.label}</div>
            </div>
            <span className="shrink-0 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-semibold tabular-nums text-[var(--accent)]">
              {Math.max(0, nextMilestone.req - (nextMilestone.type === "total" ? total : streak)).toLocaleString("ar-SA")}
              {nextMilestone.type === "total" ? " ذكر" : " يوم"}
            </span>
          </div>
        ) : null}
        <div className="grid grid-cols-4 gap-2">
          {unlockedMilestones.map((m) => (
            <div
              key={m.id}
              className={[
                "flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all",
                m.unlocked
                  ? "border-[var(--accent)]/35 bg-[var(--accent)]/10"
                  : "border-white/8 bg-white/3 opacity-40 grayscale",
              ].join(" ")}
              title={m.unlocked ? `مفتوح — ${m.type === "total" ? `${m.req} ذكر` : `${m.req} يوم سلسلة`}` : `يتطلب ${m.type === "total" ? `${m.req} ذكر` : `${m.req} يوم متواصل`}`}
            >
              <span className="text-2xl leading-none">{m.emoji}</span>
              <span className="text-[11px] font-medium text-center leading-tight">{m.label}</span>
              <span className="text-[10px] opacity-55 tabular-nums">
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



      {/* ── Phase 36: 30-Juz Progress Grid ─────────────────── */}
      {quranStats.started > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-[var(--accent)]" />
            <div className="font-semibold text-sm">تقدّم الأجزاء (30 جزءًا)</div>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
            {Array.from({ length: 30 }, (_, i) => {
              const juzNum = i + 1;
              // Collect all surah IDs whose starting juz === juzNum
              let juzTotalAyahs = 0;
              let juzReadAyahs = 0;
              for (let sid = 1; sid <= 114; sid++) {
                if ((SURAH_JUZ[sid] ?? 1) !== juzNum) continue;
                const total = quranSurahLengths[sid] ?? 0;
                const read = Math.min(total, quranReadingHistory[String(sid)] ?? 0);
                juzTotalAyahs += total;
                juzReadAyahs += read;
              }
              const jpct = juzTotalAyahs > 0 ? Math.min(100, Math.round((juzReadAyahs / juzTotalAyahs) * 100)) : 0;
              const isDone = jpct >= 100;
              return (
                <button
                  key={juzNum}
                  onClick={() => navigate(`/quran?juz=${juzNum}`)}
                  title={`الجزء ${juzNum}: ${jpct}%`}
                  className="aspect-square flex flex-col items-center justify-center rounded-2xl border text-center transition hover:scale-105 active:scale-95"
                  style={{
                    border: isDone ? '1px solid var(--ok)' : jpct > 0 ? '1px solid rgba(var(--accent-raw,0,0,0),0.25)' : '1px solid rgba(255,255,255,0.08)',
                    background: isDone
                      ? 'rgba(var(--ok-rgb, 52,211,153), 0.15)'
                      : jpct > 0
                        ? `color-mix(in srgb, var(--accent) ${Math.round(10 + jpct * 0.55)}%, transparent)`
                        : 'rgba(255,255,255,0.04)',
                  }}
                >
                  <span className="text-[10px] font-bold tabular-nums leading-tight" style={{ color: isDone ? 'var(--ok)' : jpct > 0 ? 'var(--accent)' : undefined, opacity: jpct === 0 ? 0.4 : 1 }}>{juzNum}</span>
                  {jpct > 0 && <span className="text-[8px] opacity-60 tabular-nums leading-none mt-0.5">{jpct}%</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 justify-end text-[11px] opacity-55 flex-wrap">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,255,255,0.07)' }} /><span>لم يبدأ</span>
            <div className="w-3 h-3 rounded-sm" style={{ background: 'color-mix(in srgb, var(--accent) 50%, transparent)' }} /><span>جزئي</span>
            <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--ok)' }} /><span>مكتمل</span>
          </div>
        </Card>
      )}

      {/* ── Phase 30: Quran Progress Share Card ─────────────── */}
      {quranStats.started > 0 && (
        <div ref={quranShareCardRef}>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-[var(--accent)]" />
              <div className="font-semibold text-sm">خريطة ختمة القرآن</div>
            </div>
            <Button variant="secondary" onClick={shareQuranProgress} disabled={quranSharing}>
              <Share2 size={14} />
              {quranSharing ? "جاري التحضير..." : "مشاركة"}
            </Button>
          </div>

          <div
            aria-label="خريطة تقدم السور"
            className="grid gap-1"
            style={{ gridTemplateColumns: "repeat(19, 1fr)" }}
          >
            {Array.from({ length: 114 }, (_, i) => {
              const sId = i + 1;
              const maxRead = quranReadingHistory[String(sId)] ?? 0;
              const totalSurahAyahs = quranSurahLengths[sId] ?? 1;
              const cpct = Math.min(100, Math.round((maxRead / totalSurahAyahs) * 100));
              return (
                <div
                  key={sId}
                  title={`سورة ${sId}: ${cpct}%`}
                  className="aspect-square rounded-sm transition-colors"
                  style={{
                    background:
                      cpct === 0
                        ? "rgba(255,255,255,0.07)"
                        : cpct >= 100
                          ? "var(--ok)"
                          : `color-mix(in srgb, var(--accent) ${Math.round(20 + cpct * 0.65)}%, transparent)`,
                  }}
                />
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2 justify-end text-[11px] opacity-60 flex-wrap">
            <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,255,255,0.07)" }} />
            <span>لم يُقرأ</span>
            <div className="w-3 h-3 rounded-sm" style={{ background: "color-mix(in srgb, var(--accent) 50%, transparent)" }} />
            <span>جزئي</span>
            <div className="w-3 h-3 rounded-sm" style={{ background: "var(--ok)" }} />
            <span>مكتمل</span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs opacity-55 flex-wrap">
            <span className="tabular-nums">{quranStats.completed} سورة مكتملة</span>
            <span className="tabular-nums">{quranStats.started} سورة بدأت</span>
            <span className="tabular-nums">{overallQuranProgress}% من القرآن</span>
          </div>
        </Card>
        </div>
      )}

      {/* D9: Per-category dhikr progress */}
      {sectionProgress.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} className="text-[var(--accent)]" />
            <div className="text-xs font-semibold opacity-65">تقدم الأقسام</div>
          </div>
          <div className="space-y-2">
            {sectionProgress.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="text-sm w-5 text-center shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[11px] opacity-75 truncate">{s.title}</span>
                    <span className="text-[10px] tabular-nums opacity-50 shrink-0">{s.pctVal}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${s.pctVal}%`, background: s.pctVal >= 100 ? 'var(--ok)' : s.accent ?? 'var(--accent)' }}
                    />
                  </div>
                </div>
              </div>
            ))}
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
