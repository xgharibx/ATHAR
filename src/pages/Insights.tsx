import * as React from "react";
import { Flame, TrendingUp, Trophy, Share2, BookOpen, Target, Sparkles, BarChart2, Zap, Bell, FileDown, BellOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { toPng } from "html-to-image";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useNoorStore } from "@/store/noorStore";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useQuranDB } from "@/data/useQuranDB";
import { coerceCount } from "@/data/types";

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
  { id: "total_100",   label: "Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„Ø·Ø±ÙŠÙ‚", emoji: "ðŸŒ±", req: 100,   type: "total" },
  { id: "total_500",   label: "Ù…Ø«Ø§Ø¨Ø±",         emoji: "â­", req: 500,   type: "total" },
  { id: "total_1k",    label: "Ù…ØªÙ‚Ù†",          emoji: "ðŸŒŸ", req: 1000,  type: "total" },
  { id: "total_5k",    label: "Ø­Ø§ÙØ¸",          emoji: "ðŸ†", req: 5000,  type: "total" },
  { id: "total_10k",   label: "Ø±ÙÙŠÙ‚ Ø§Ù„Ø°ÙƒØ±",     emoji: "ðŸ’«", req: 10000, type: "total" },
  { id: "streak_7",    label: "Ø£Ø³Ø¨ÙˆØ¹ Ù†ÙˆØ±",     emoji: "ðŸ”¥", req: 7,     type: "streak" },
  { id: "streak_30",   label: "Ø´Ù‡Ø± ØµØ¨Ø±",       emoji: "âš¡", req: 30,    type: "streak" },
  { id: "streak_100",  label: "Ù…Ø¦Ø© ÙŠÙˆÙ…",        emoji: "ðŸŒ™", req: 100,   type: "streak" },
];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_LABELS = ["Ø£Ø­Ø¯", "Ø¥Ø«Ù†", "Ø«Ù„Ø«", "Ø£Ø±Ø¨", "Ø®Ù…Ø³", "Ø¬Ù…Ø¹", "Ø³Ø¨Øª"];

// â”€â”€ I6: XP / Level system â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type XpLevel = { label: string; minXp: number; maxXp: number; emoji: string; color: string };
const XP_LEVELS: XpLevel[] = [
  { label: "Ù…Ø¨ØªØ¯Ø¦",  minXp: 0,      maxXp: 999,    emoji: "ðŸŒ±", color: "#6ee7b7" },
  { label: "Ù…ÙˆØ§Ø¸Ø¨",  minXp: 1000,   maxXp: 4999,   emoji: "â­", color: "#fbbf24" },
  { label: "Ø­Ø§ÙØ¸",   minXp: 5000,   maxXp: 19999,  emoji: "ðŸ†", color: "#fb923c" },
  { label: "Ø¥Ù…Ø§Ù…",   minXp: 20000,  maxXp: Infinity, emoji: "ðŸ’Ž", color: "#a78bfa" },
];

function computeXp(
  total: number,
  quranTotalAyahs: number,
  prayerLogTotal: number,
  tasbeehTotal: number
): number {
  return total + quranTotalAyahs * 3 + prayerLogTotal * 10 + tasbeehTotal;
}

function getXpLevel(xp: number): XpLevel & { xpInLevel: number; xpForLevel: number; pct: number } {
  const lvl = [...XP_LEVELS].reverse().find((l) => xp >= l.minXp) ?? (XP_LEVELS[0] as XpLevel);
  const xpInLevel = xp - lvl.minXp;
  const xpForLevel = lvl.maxXp === Infinity ? 10000 : lvl.maxXp - lvl.minXp;
  return { ...lvl, xpInLevel, xpForLevel, pct: Math.min(100, Math.round((xpInLevel / xpForLevel) * 100)) };
}

// â”€â”€ Radar chart for I4 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RadarChart(props: { values: { label: string; pct: number; color: string }[]; size?: number }) {
  const { values, size = 160 } = props;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.72;
  const n = values.length;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, radius: number) => ({
    x: cx + Math.cos(angle(i)) * radius,
    y: cy + Math.sin(angle(i)) * radius,
  });

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1].map((fr) =>
    values.map((_, i) => pt(i, r * fr)).map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ") + " Z"
  );

  // Data polygon
  const dataPts = values.map((v, i) => pt(i, r * (v.pct / 100)));
  const dataPath = dataPts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Ù…Ø®Ø·Ø· Ø§Ù„Ø±Ø§Ø¯Ø§Ø±">
      {/* Grid */}
      {rings.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      ))}
      {/* Axes */}
      {values.map((_, i) => {
        const p = pt(i, r);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />;
      })}
      {/* Data */}
      <path d={dataPath} fill="rgba(var(--accent-raw,99,102,241),0.18)" stroke="var(--accent)" strokeWidth={2} />
      {values.map((v, i) => {
        const p = pt(i, r * (v.pct / 100));
        return <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={v.color} />;
      })}
      {/* Labels */}
      {values.map((v, i) => {
        const lp = pt(i, r * 1.22);
        return (
          <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fill="rgba(255,255,255,0.7)" fontFamily="inherit">
            {v.label}
          </text>
        );
      })}
    </svg>
  );
}

// â”€â”€ Build heatmap for I1 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildHeatmap(
  activity: Record<string, number>,
  days: number // 7, 28, or 90
): { key: string; count: number; isToday: boolean }[][] {
  const today = new Date();
  const todayK = dateKey(today);
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - today.getDay());

  const totalDays = days;
  const weeks = Math.ceil(totalDays / 7);
  const result: { key: string; count: number; isToday: boolean }[][] = [];

  for (let week = weeks - 1; week >= 0; week--) {
    const row: { key: string; count: number; isToday: boolean }[] = [];
    for (let day = 0; day < 7; day++) {
      const d = new Date(lastSunday);
      d.setDate(lastSunday.getDate() - week * 7 + day);
      const k = dateKey(d);
      const isFuture = d > today;
      row.push({ key: k, count: isFuture ? -1 : (activity[k] ?? 0), isToday: k === todayK });
    }
    result.push(row);
  }
  return result;
}

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
  const prayerLog = useNoorStore((s) => s.prayerLog);
  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);
  const prayerTimes = usePrayerTimes();
  const fajrTime = prayerTimes.data?.data?.timings?.Fajr;
  const weeklyReportSentISO = useNoorStore((s) => s.weeklyReportSentISO);
  const setWeeklyReportSentISO = useNoorStore((s) => s.setWeeklyReportSentISO);

  // I1: Heatmap view toggle
  const [heatmapView, setHeatmapView] = React.useState<7 | 28 | 90>(28);

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

  // I1: dynamic heatmap based on view
  const { heatmap, maxCount } = React.useMemo(() => {
    const weeks = buildHeatmap(activity, heatmapView);
    const maxCount = Math.max(1, ...Object.values(activity).map(v => v ?? 0));
    return { heatmap: weeks, maxCount };
  }, [activity, heatmapView]);

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

  // â”€â”€ Quran daily-ayahs computed values (Phases 22 & 30) â”€â”€â”€â”€
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

  // I2: Prayer consistency - last 28 days from prayerLog
  const prayerConsistency = React.useMemo(() => {
    const today = new Date();
    const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    return Array.from({ length: 28 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (27 - i));
      const k = dateKey(d);
      const dayLog = prayerLog[k] ?? {};
      const done = PRAYERS.filter((p) => !!dayLog[p]).length;
      return { key: k, done, isToday: i === 27 };
    });
  }, [prayerLog]);

  const prayerConsistencyAvg = React.useMemo(() => {
    const withData = prayerConsistency.filter((d) => d.done > 0);
    if (!withData.length) return 0;
    return Math.round(withData.reduce((s, d) => s + d.done, 0) / prayerConsistency.length * 10) / 10;
  }, [prayerConsistency]);

  // I3: Quran pages per day (estimated from ayahs; 6236 ayahs / 604 pages â‰ˆ 10.32 ayahs/page)
  const AYAHS_PER_PAGE = 6236 / 604;
  const quranPageLast7Days = React.useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const k = dateKey(d);
      const ayahs = quranDailyAyahs[k] ?? 0;
      const pages = ayahs > 0 ? Math.max(0.5, ayahs / AYAHS_PER_PAGE) : 0;
      return { key: k, ayahs, pages, isToday: i === 6, label: DAY_LABELS[d.getDay()] ?? "" };
    });
  }, [quranDailyAyahs]);

  const quranMaxPageDay = React.useMemo(
    () => Math.max(1, ...quranPageLast7Days.map((d) => d.pages)),
    [quranPageLast7Days]
  );

  // I4: Category radar chart values
  const radarValues = React.useMemo(() => {
    if (!adhkarData) return [];
    const RADAR_IDS = ["morning", "evening", "sleep", "post_prayer", "mosque"];
    const result: { label: string; pct: number; color: string }[] = [];
    const LABELS: Record<string, string> = {
      morning: "ØµØ¨Ø§Ø­", evening: "Ù…Ø³Ø§Ø¡", sleep: "Ù†ÙˆÙ…",
      post_prayer: "Ø¨Ø¹Ø¯ Ø§Ù„ØµÙ„Ø§Ø©", mosque: "Ù…Ø³Ø¬Ø¯",
    };
    const COLORS: Record<string, string> = {
      morning: "#fbbf24", evening: "#818cf8", sleep: "#34d399",
      post_prayer: "#f472b6", mosque: "#38bdf8",
    };
    for (const sid of RADAR_IDS) {
      const sec = adhkarData.db.sections.find((s) => s.id === sid);
      if (!sec) continue;
      let done = 0, total = 0;
      sec.content.forEach((item, i) => {
        const t = coerceCount(item.count);
        const c = Math.min(t, Math.max(0, Number(progressMap[`${sec.id}:${i}`]) || 0));
        total += t;
        done += c;
      });
      result.push({
        label: LABELS[sid] ?? sid,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
        color: COLORS[sid] ?? "var(--accent)",
      });
    }
    return result;
  }, [adhkarData, progressMap]);

  // I6: XP and level
  const tasbeehTotal = React.useMemo(
    () => Object.values(quickTasbeeh).reduce((s, v) => s + (v ?? 0), 0),
    [quickTasbeeh]
  );
  const prayerLogTotal = React.useMemo(
    () => Object.values(prayerLog).reduce((s, day) => s + Object.values(day).filter(Boolean).length, 0),
    [prayerLog]
  );
  const xp = React.useMemo(
    () => computeXp(total, quranStats.totalAyahs, prayerLogTotal, tasbeehTotal),
    [total, quranStats.totalAyahs, prayerLogTotal, tasbeehTotal]
  );
  const xpLevel = React.useMemo(() => getXpLevel(xp), [xp]);

  // I7: prayerLog weekly total (must be before the useEffect below)
  const prayerLogWeekTotal = React.useMemo(() => {
    const today = new Date();
    const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = dateKey(d);
      count += PRAYERS.filter((p) => !!prayerLog[k]?.[p]).length;
    }
    return count;
  }, [prayerLog]);

  // I7: Weekly report notification (Sunday auto-trigger)
  React.useEffect(() => {
    const today = new Date();
    if (today.getDay() !== 0) return; // Only on Sunday
    const thisWeekISO = dateKey(today);
    if (weeklyReportSentISO === thisWeekISO) return;
    if (!("Notification" in globalThis)) return;

    const sendReport = () => {
      const msg = `Ø£Ø­Ø³Ù†Øª! Ù‡Ø°Ø§ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹: ${weekTotal} Ø°ÙƒØ±ØŒ ${quranWeekTotal} Ø¢ÙŠØ©ØŒ ${prayerLogWeekTotal} ØµÙ„Ø§Ø© âœ¨`;
      if (Notification.permission === "granted") {
        new Notification("ØªÙ‚Ø±ÙŠØ±Ùƒ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠ â€” ATHAR", { body: msg, icon: "/icons/icon-192.png" });
        setWeeklyReportSentISO(thisWeekISO);
      } else if (Notification.permission !== "denied") {
        void Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            new Notification("ØªÙ‚Ø±ÙŠØ±Ùƒ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠ â€” ATHAR", { body: msg, icon: "/icons/icon-192.png" });
            setWeeklyReportSentISO(thisWeekISO);
          }
        });
      }
    };
    sendReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyReportSentISO]);

  // I8: Ibadat summary card ref
  const ibadatCardRef = React.useRef<HTMLDivElement>(null);
  const [ibadatSharing, setIbadatSharing] = React.useState(false);

  async function shareIbadatCard() {
    if (!ibadatCardRef.current || ibadatSharing) return;
    setIbadatSharing(true);
    try {
      const dataUrl = await toPng(ibadatCardRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "ATHAR-ibadat.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø¹Ø¨Ø§Ø¯Ø©", text: "Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø¹Ø¨Ø§Ø¯Ø© Ø§Ù„ÙŠÙˆÙ… Ù…Ù† ØªØ·Ø¨ÙŠÙ‚ ATHAR âœ¨" });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "ATHAR-ibadat.png";
        a.click();
        toast.success("ØªÙ… ØªØ­Ù…ÙŠÙ„ Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø¹Ø¨Ø§Ø¯Ø©");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") toast.error("ØªØ¹Ø°Ø± Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ø¨Ø·Ø§Ù‚Ø©");
    } finally {
      setIbadatSharing(false);
    }
  }

  // I5: Export insights as printable PDF
  const insightsExportRef = React.useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = React.useState(false);

  async function exportInsightsPdf() {
    if (!insightsExportRef.current || exporting) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(insightsExportRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "var(--bg)" });
      const win = window.open("", "_blank");
      if (win) {
        win.document.open();
        win.document.title = "Ø¥Ø­ØµØ§Ø¡Ø§Øª ATHAR";
        const img = win.document.createElement("img");
        img.src = dataUrl;
        img.style.cssText = "max-width:420px;width:100%;border-radius:16px;display:block;margin:20px auto";
        win.document.body.style.cssText = "margin:0;background:#0f172a;display:flex;justify-content:center";
        win.document.body.appendChild(img);
        setTimeout(() => win.print(), 400);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") toast.error("ØªØ¹Ø°Ø± ØªØµØ¯ÙŠØ± Ø§Ù„Ø¥Ø­ØµØ§Ø¡Ø§Øª");
    } finally {
      setExporting(false);
    }
  }

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
        await navigator.share({ files: [file], title: "ØªÙ‚Ø¯Ù…ÙŠ ÙÙŠ Ø§Ù„Ù‚Ø±Ø¢Ù†", text: `${quranStats.completed} Ø³ÙˆØ±Ø© Ù…ÙƒØªÙ…Ù„Ø© â€¢ ${overallQuranProgress}% âœ¨` });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "ATHAR-quran-progress.png";
        a.click();
        toast.success("ØªÙ… ØªØ­Ù…ÙŠÙ„ Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„ØªÙ‚Ø¯Ù…");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") toast.error("ØªØ¹Ø°Ø± Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ø¨Ø·Ø§Ù‚Ø©");
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
  const tasbeehLifetime = useNoorStore((s) => s.tasbeehLifetime);
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
        await navigator.share({ files: [file], title: "ØªÙ‚Ø¯Ù…ÙŠ ÙÙŠ ATHAR", text: `Ø³Ù„Ø³Ù„Ø© ${streak} ÙŠÙˆÙ… â€¢ ${total} Ø°ÙƒØ± âœ¨` });
      } else {
        // Fallback: download
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "ATHAR-progress.png";
        a.click();
        toast.success("ØªÙ… ØªØ­Ù…ÙŠÙ„ Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„ØªÙ‚Ø¯Ù…");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("ØªØ¹Ø°Ø± Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ø¨Ø·Ø§Ù‚Ø©");
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
    streak >= 30 ? "Ù…Ø§Ø´Ø§Ø¡ Ø§Ù„Ù„Ù‡! ðŸ”¥" :
    streak >= 7  ? "Ø£Ø³Ø¨ÙˆØ¹ Ù…ØªÙˆØ§ØµÙ„ âœ¨" :
    streak >= 3  ? "Ø«Ù„Ø§Ø«Ø© Ø£ÙŠØ§Ù… ðŸŒŸ" :
    streak >= 2  ? "ÙŠÙˆÙ…Ø§Ù† Ù…ØªÙˆØ§ØµÙ„Ø§Ù† âœ¨" :
    streak >= 1  ? "Ø§Ù†Ø·Ù„Ø§Ù‚Ø© Ø¬ÙŠØ¯Ø© âœ¨" : "Ø§Ø¨Ø¯Ø£ Ø§Ù„ÙŠÙˆÙ…";

  // I7: Notification permission state
  const [notifPermission, setNotifPermission] = React.useState<NotificationPermission | "unsupported">(
    "Notification" in globalThis ? Notification.permission : "unsupported"
  );

  async function requestWeeklyNotif() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      const today = new Date();
      const thisWeekISO = dateKey(today);
      const msg = `Ø£Ø­Ø³Ù†Øª! Ù‡Ø°Ø§ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹: ${weekTotal} Ø°ÙƒØ±ØŒ ${quranWeekTotal} Ø¢ÙŠØ©ØŒ ${prayerLogWeekTotal} ØµÙ„Ø§Ø© âœ¨`;
      new Notification("ØªÙ‚Ø±ÙŠØ±Ùƒ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠ â€” ATHAR", { body: msg, icon: "/icons/icon-192.png" });
      setWeeklyReportSentISO(thisWeekISO);
      toast.success("ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠ");
    } else {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === "granted") toast.success("ØªÙ… ØªÙØ¹ÙŠÙ„ Ø¥Ø´Ø¹Ø§Ø± Ø§Ù„Ø£Ø­Ø¯");
      else toast.error("Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª");
    }
  }

  return (
    <div className="space-y-4 page-enter">
      {/* I6: XP Level badge */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl border border-white/10"
              style={{ background: `${xpLevel.color}22` }}
            >
              {xpLevel.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Zap size={13} style={{ color: xpLevel.color }} />
                <span className="text-sm font-bold" style={{ color: xpLevel.color }}>{xpLevel.label}</span>
                <span className="text-[10px] opacity-40 tabular-nums">{xp.toLocaleString("ar-SA")} Ù†Ù‚Ø·Ø©</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${xpLevel.pct}%`, background: xpLevel.color }}
                  />
                </div>
                {xpLevel.maxXp < Infinity && (
                  <span className="text-[10px] opacity-45 tabular-nums">{xpLevel.xpInLevel}/{xpLevel.xpForLevel}</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-[10px] opacity-40 text-left leading-5">
            {XP_LEVELS.map((l) => (
              <div key={l.label} style={{ color: xp >= l.minXp ? l.color : undefined, opacity: xp >= l.minXp ? 1 : 0.3 }}>
                {l.emoji} {l.label}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* I8: Ibadat summary card */}
      <div ref={ibadatCardRef}>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-[var(--accent)]" />
            <div className="text-xs font-semibold opacity-65">Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø¹Ø¨Ø§Ø¯Ø©</div>
            <div className="text-[10px] opacity-35 mr-auto">
              {new Date().toLocaleDateString("ar-SA", { weekday: "short", day: "numeric", month: "short" })}
            </div>
            <button
              type="button"
              onClick={shareIbadatCard}
              disabled={ibadatSharing}
              className="text-[10px] opacity-60 hover:opacity-100 flex items-center gap-1 transition"
              aria-label="Ù…Ø´Ø§Ø±ÙƒØ© Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø¹Ø¨Ø§Ø¯Ø©"
            >
              <Share2 size={11} />
              <span>{ibadatSharing ? "..." : "Ø´Ø§Ø±Ùƒ"}</span>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {/* Prayers */}
            <div className="col-span-4 flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] opacity-50">Ø§Ù„ØµÙ„ÙˆØ§Øª:</span>
              <div className="flex gap-1.5">
                {["Ø§Ù„ÙØ¬Ø±","Ø§Ù„Ø¸Ù‡Ø±","Ø§Ù„Ø¹ØµØ±","Ø§Ù„Ù…ØºØ±Ø¨","Ø§Ù„Ø¹Ø´Ø§Ø¡"].map((p, i) => {
                  const keys = ["Fajr","Dhuhr","Asr","Maghrib","Isha"];
                  const done = !!prayerLog[civilTodayKey]?.[keys[i] ?? ""];
                  return (
                    <div
                      key={p}
                      title={p}
                      className="w-6 h-6 rounded-full border text-[8px] flex items-center justify-center font-bold transition"
                      style={{
                        background: done ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.05)",
                        borderColor: done ? "var(--ok)" : "rgba(255,255,255,0.12)",
                        color: done ? "var(--ok)" : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {done ? "âœ“" : "Â·"}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/8 px-2 py-2.5 text-center">
              <div className="text-[10px] opacity-45">Ø°ÙƒØ±</div>
              <div className="text-sm font-bold tabular-nums mt-0.5" style={{ color: todayCount > 0 ? "var(--accent)" : undefined }}>{todayCount}</div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/8 px-2 py-2.5 text-center">
              <div className="text-[10px] opacity-45">Ø¢ÙŠØ©</div>
              <div className="text-sm font-bold tabular-nums mt-0.5" style={{ color: todayQuranAyahs > 0 ? "var(--accent)" : undefined }}>{todayQuranAyahs}</div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/8 px-2 py-2.5 text-center">
              <div className="text-[10px] opacity-45">Ù‡Ø¯Ù</div>
              <div className="text-sm font-bold tabular-nums mt-0.5" style={{ color: quranGoalPct >= 100 ? "var(--ok)" : undefined }}>{quranGoalPct}%</div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/8 px-2 py-2.5 text-center">
              <div className="text-[10px] opacity-45">Ù…Ø³ØªÙˆÙ‰</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: xpLevel.color }}>{xpLevel.emoji}</div>
            </div>
          </div>
        </Card>
      </div>
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
        <div style={{ fontSize: "13px", opacity: 0.6, marginBottom: "4px" }}>ØªÙ‚Ø¯Ù…ÙŠ ÙÙŠ</div>
        <div style={{ fontSize: "26px", fontWeight: 800, marginBottom: "16px", color: "var(--accent)" }}>ATHAR</div>
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          {[
            { label: "Ø§Ù„Ø³Ù„Ø³Ù„Ø©", value: `${streak} ÙŠÙˆÙ…`, emoji: streak >= 7 ? "ðŸ”¥" : "âœ¨" },
            { label: "Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ", value: `${total}`, emoji: "ðŸ“¿" },
            { label: "Ø§Ù„ÙŠÙˆÙ…", value: `${todayCount}`, emoji: "ðŸŒ™" },
            { label: "Ø£ÙØ¶Ù„", value: `${bestStreak}Ø¯`, emoji: "ðŸ†" },
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

      {/* â”€â”€ ÙŠÙˆÙ…Ùƒ Ø§Ù„ÙŠÙˆÙ… â€” Daily Snapshot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-[var(--accent)]" />
          <div className="text-xs font-semibold opacity-65">ÙŠÙˆÙ…Ùƒ Ø§Ù„ÙŠÙˆÙ…</div>
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
            <span className="text-lg leading-none mb-0.5">ðŸ“¿</span>
            <span
              className="text-xl font-bold tabular-nums leading-none mt-0.5"
              style={{ color: todayCount > 0 ? "var(--accent)" : undefined }}
            >{todayCount}</span>
            <span className="text-[10px] opacity-50 mt-0.5">Ø°ÙƒØ± Ø§Ù„ÙŠÙˆÙ…</span>
            {streak > 0 ? (
              <span
                className="text-[9px] mt-1 font-medium tabular-nums"
                style={{ color: streak >= 7 ? "#fb923c" : "var(--accent)" }}
              >ðŸ”¥ {streak} ÙŠÙˆÙ…</span>
            ) : (
              <span className="text-[9px] mt-1 opacity-30">â€”</span>
            )}
          </button>
          {/* Quran */}
          <button
            type="button"
            onClick={() => navigate(quranLastRead ? `/mushaf?surah=${quranLastRead.surahId}&ayah=${quranLastRead.ayahIndex}` : "/quran")}
            className="flex flex-col items-center rounded-2xl bg-white/5 border border-white/8 px-2 py-3 gap-0.5 transition hover:bg-white/8 active:scale-[.97]"
          >
            <span className="text-lg leading-none mb-0.5">ðŸ“–</span>
            <span
              className="text-xl font-bold tabular-nums leading-none mt-0.5"
              style={{ color: quranGoalPct >= 100 ? "var(--ok)" : todayQuranAyahs > 0 ? "var(--accent)" : undefined }}
            >{todayQuranAyahs}</span>
            <span className="text-[10px] opacity-50 mt-0.5">/ {quranGoal} Ø¢ÙŠØ©</span>
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
            <span className="text-lg leading-none mb-0.5">âœ…</span>
            <span
              className="text-xl font-bold tabular-nums leading-none mt-0.5"
              style={{ color: checklistPct >= 100 ? "var(--ok)" : checklistDoneCount > 0 ? "var(--accent)" : undefined }}
            >{checklistDoneCount}<span className="text-sm opacity-40 font-normal">/{checklistTotal}</span></span>
            <span className="text-[10px] opacity-50 mt-0.5">Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©</span>
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
            <span className="text-base leading-none">âœ¨</span>
            <span>ÙŠÙˆÙ… Ù…Ø«Ø§Ù„ÙŠ â€” Ø£Ù†Ø¬Ø²Øª Ø§Ù„Ø«Ù„Ø§Ø«Ø© Ø§Ù„ÙŠÙˆÙ…</span>
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
              <div className="text-xs opacity-60">Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª</div>
            </div>
            <div className="text-3xl font-bold tabular-nums leading-none">
              {streak}
              <span className="text-base font-normal opacity-70 mr-1">ÙŠÙˆÙ…</span>
            </div>
            <div className={`text-sm mt-1 font-medium ${streakFireClass}`}>{streakLabel}</div>
          </div>

          {/* Flame badge */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl glass border border-white/10 ${streak >= 1 ? "streak-fire" : "opacity-40"}`}>
            {streak >= 30 ? "ðŸ”¥" : streak >= 7 ? "âš¡" : streak >= 1 ? "âœ¨" : "ðŸ•¯ï¸"}
          </div>
        </div>

        {/* Mini stats row */}
        <div className="relative mt-4 grid grid-cols-5 gap-2">
          <MiniStatSmall label="Ø§Ù„ÙŠÙˆÙ…" value={`${todayCount}`} accent />
          <MiniStatSmall label="Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹" value={`${weekTotal}`} />
          <MiniStatSmall label="Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ" value={`${total}`} />
          <MiniStatSmall label="Ø£ÙØ¶Ù„ ÙŠÙˆÙ…" value={bestDay.count > 0 ? `${bestDay.count}` : "â€”"} />
          <MiniStatSmall label="Ø£ÙØ¶Ù„ Ø³Ù„Ø³Ù„Ø©" value={bestStreak > 0 ? `${bestStreak}` : "â€”"} />
        </div>
        {/* Monthly total */}
        {monthTotal > 0 && (
          <div className="relative mt-2 flex items-center gap-1.5 text-[11px] opacity-50">
            <span>Ù‡Ø°Ø§ Ø§Ù„Ø´Ù‡Ø±:</span>
            <span className="tabular-nums font-semibold opacity-100" style={{ color: "var(--accent)" }}>{monthTotal.toLocaleString("ar-SA")}</span>
            <span>Ø°ÙƒØ±</span>
          </div>
        )}
        {bestDay.key && (
          <div className="relative mt-3 text-[11px] opacity-55">
            Ø£Ø¹Ù„Ù‰ Ù†Ø´Ø§Ø· ÙƒØ§Ù† ÙÙŠ {new Date(bestDay.key + "T00:00:00").toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}
          </div>
        )}
        <div className="relative mt-4">
          <Button
            variant="secondary"
            onClick={shareProgress}
            disabled={sharing}
            className="w-full"
            aria-label="Ø´Ø§Ø±Ùƒ ØªÙ‚Ø¯Ù…Ùƒ"
          >
            <Share2 size={15} />
            {sharing ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ø¶ÙŠØ±..." : "Ø´Ø§Ø±Ùƒ ØªÙ‚Ø¯Ù…Ùƒ"}
          </Button>
        </div>
      </Card>

      {/* 28-Day Heatmap â€” I1: with view toggle */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} className="text-[var(--accent)]" />
          <div className="font-semibold text-sm">Ù†Ø´Ø§Ø· Ø§Ù„Ø£Ø°ÙƒØ§Ø±</div>
          <div className="mr-auto flex gap-1">
            {([7, 28, 90] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setHeatmapView(v)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                  heatmapView === v
                    ? "border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "border-white/10 opacity-50"
                }`}
              >
                {v === 7 ? "Ù§ Ø£ÙŠØ§Ù…" : v === 28 ? "Ù¢Ù¨ ÙŠÙˆÙ…Ù‹Ø§" : "Ù©Ù  ÙŠÙˆÙ…Ù‹Ø§"}
              </button>
            ))}
          </div>
        </div>

        {/* Day labels â€” only for 7-day and 28-day */}
        {heatmapView <= 28 && (
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {DAY_LABELS.map((l) => (
              <div key={l} className="text-center text-[11px] opacity-55 font-medium">{l}</div>
            ))}
          </div>
        )}

        {/* Weeks */}
        <div className="space-y-1.5">
          {heatmap.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1.5">
              {week.map((cell) => {
                const isFuture = cell.count < 0;
                const count = Math.max(0, cell.count);
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
          <span className="text-[11px] opacity-55">Ø£Ù‚Ù„</span>
          {[0,1,2,3,4].map((h) => (
            <div key={h} className={`w-3 h-3 rounded-sm ${
              h === 0 ? "bg-white/5" :
              h === 1 ? "bg-[var(--accent)]/25" :
              h === 2 ? "bg-[var(--accent)]/50" :
              h === 3 ? "bg-[var(--accent)]/75" :
                         "bg-[var(--accent)]"
            }`} />
          ))}
          <span className="text-[11px] opacity-55">Ø£ÙƒØ«Ø±</span>
        </div>
      </Card>

      {/* 7-day activity bar chart */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-[var(--accent)]" />
          <div className="font-semibold text-sm">Ù†Ø´Ø§Ø· Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹</div>
          <span className="text-[11px] opacity-50 mr-auto tabular-nums">{weekTotal} Ø¥Ø¬Ù…Ø§Ù„ÙŠ</span>
          {lastWeekTotal > 0 && (
            <span
              className={`text-[10px] tabular-nums font-semibold px-2 py-0.5 rounded-full border`}
              style={
                weekTotal >= lastWeekTotal
                  ? { background: "rgba(52,211,153,0.12)", color: "var(--ok)", borderColor: "rgba(52,211,153,0.25)" }
                  : { background: "rgba(248,113,113,0.10)", color: "rgb(248,113,113)", borderColor: "rgba(248,113,113,0.2)" }
              }
              title={`Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ Ø§Ù„Ù…Ø§Ø¶ÙŠ: ${lastWeekTotal}`}
            >
              {weekTotal >= lastWeekTotal ? "â–²" : "â–¼"} {Math.abs(weekTotal - lastWeekTotal)}
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

      {/* â”€â”€ Phase 22: Quran Reading Analytics Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {(quranStreak > 0 || quranWeekTotal > 0 || todayQuranAyahs > 0) && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-[var(--accent)]" />
              <div className="font-semibold text-sm">Ø¥Ø­ØµØ§Ø¡Ø§Øª Ø§Ù„Ù‚Ø±Ø¢Ù†</div>
            </div>
            {quranStreak > 0 && (
              <div className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                <Flame size={11} className="text-[var(--accent)]" />
                <span className="tabular-nums">{quranStreak} ÙŠÙˆÙ…</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <MiniStatSmall label="Ø§Ù„ÙŠÙˆÙ…" value={`${todayQuranAyahs}`} accent />
            <MiniStatSmall label="Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹" value={`${quranWeekTotal}`} />
            <MiniStatSmall label="Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ" value={`${quranStats.totalAyahs.toLocaleString("ar-SA")}`} />
          </div>
          {/* Monthly ayahs */}
          {quranMonthTotal > 0 && (
            <div className="mb-4 -mt-2 flex items-center gap-1.5 text-[11px] opacity-50">
              <span>Ù‡Ø°Ø§ Ø§Ù„Ø´Ù‡Ø±:</span>
              <span className="tabular-nums font-semibold opacity-100" style={{ color: "var(--accent)" }}>{quranMonthTotal.toLocaleString("ar-SA")}</span>
              <span>Ø¢ÙŠØ©</span>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5 text-xs opacity-65">
              <div className="flex items-center gap-1.5">
                <Target size={11} />
                <span>Ù‡Ø¯Ù Ø§Ù„ÙŠÙˆÙ…: {todayQuranAyahs}/{quranGoal} Ø¢ÙŠØ©</span>
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
                <span>Ù†Ø´Ø§Ø· Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© (7 Ø£ÙŠØ§Ù…)</span>
                <span className="tabular-nums">{quranWeekTotal} Ø¢ÙŠØ©</span>
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

      {/* I2: Prayer consistency chart (28 days) */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} className="text-[var(--accent)]" />
          <div className="font-semibold text-sm">Ø«Ø¨Ø§Øª Ø§Ù„ØµÙ„Ø§Ø©</div>
          <span className="text-[11px] opacity-50 mr-auto tabular-nums">
            Ù…ØªÙˆØ³Ø· {prayerConsistencyAvg} / 5
          </span>
        </div>
        {prayerConsistency.every((d) => d.done === 0) ? (
          <div className="text-xs opacity-50 text-center py-3">
            Ù„Ù… ÙŠØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ØµÙ„ÙˆØ§Øª Ø¨Ø¹Ø¯. Ø§Ø¨Ø¯Ø£ Ø¨Ø§Ù„ØªØªØ¨Ø¹ Ù…Ù† ØµÙØ­Ø© Ø§Ù„ØµÙ„Ø§Ø©.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 mb-1.5">
              {DAY_LABELS.map((l) => (
                <div key={l} className="text-center text-[9px] opacity-45">{l}</div>
              ))}
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
              {prayerConsistency.map((d) => {
                const c =
                  d.done === 0 ? "bg-white/5" :
                  d.done <= 2 ? "bg-yellow-400/40" :
                  d.done <= 4 ? "bg-orange-400/60" :
                                "bg-[var(--ok)]/70";
                return (
                  <div
                    key={d.key}
                    title={`${d.key}: ${d.done}/5 ØµÙ„ÙˆØ§Øª`}
                    className={`aspect-square rounded-sm ${c} ${d.isToday ? "ring-2 ring-[var(--accent)]" : ""}`}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2 justify-end text-[10px] opacity-55 flex-wrap">
              <div className="w-3 h-3 rounded-sm bg-white/5" /><span>Ù </span>
              <div className="w-3 h-3 rounded-sm bg-yellow-400/40" /><span>Ù¡-Ù¢</span>
              <div className="w-3 h-3 rounded-sm bg-orange-400/60" /><span>Ù£-Ù¤</span>
              <div className="w-3 h-3 rounded-sm bg-[var(--ok)]/70" /><span>Ù¥ ÙƒØ§Ù…Ù„Ø©</span>
            </div>
          </>
        )}
      </Card>

      {/* I3: Quran pages per day */}
      {quranPageLast7Days.some((d) => d.pages > 0) && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={14} className="text-[var(--accent)]" />
            <div className="font-semibold text-sm">ØµÙØ­Ø§Øª Ø§Ù„Ù‚Ø±Ø¢Ù† (7 Ø£ÙŠØ§Ù…)</div>
            <span className="text-[11px] opacity-50 mr-auto tabular-nums">
              {quranPageLast7Days.reduce((s, d) => s + d.pages, 0).toFixed(1)} ØµÙØ­Ø©
            </span>
          </div>
          <div className="flex items-end gap-1.5" style={{ height: "72px" }}>
            {quranPageLast7Days.map((day) => {
              const barH = day.pages > 0 ? Math.max(6, Math.round((day.pages / quranMaxPageDay) * 56)) : 3;
              return (
                <div key={day.key} className="flex-1 flex flex-col items-center gap-1" style={{ height: "100%", justifyContent: "flex-end" }}>
                  {day.pages > 0 && (
                    <span className="text-[9px] opacity-60 tabular-nums leading-none mb-0.5">{day.pages.toFixed(1)}</span>
                  )}
                  <div
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${barH}px`,
                      background: day.isToday ? "var(--accent)"
                        : day.pages > 0 ? "color-mix(in srgb, var(--accent) 55%, transparent)"
                        : "rgba(255,255,255,0.06)",
                    }}
                  />
                  <span className="text-[10px] leading-none mt-1" style={{ opacity: day.isToday ? 0.9 : 0.45, color: day.isToday ? "var(--accent)" : undefined }}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-[10px] opacity-40">* ØªÙ‚Ø¯ÙŠØ±ÙŠ Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø§Ù„Ø¢ÙŠØ§Øª Ø§Ù„Ù…Ù‚Ø±ÙˆØ¡Ø© (Ù¦Ù¢Ù£Ù¦ Ø¢ÙŠØ© / Ù¦Ù Ù¤ ØµÙØ­Ø©)</div>
        </Card>
      )}

      {/* I4: Category radar chart */}
      {radarValues.length >= 3 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={14} className="text-[var(--accent)]" />
            <div className="font-semibold text-sm">Ù…Ø®Ø·Ø· Ø§Ù„Ø£Ù‚Ø³Ø§Ù…</div>
          </div>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <RadarChart values={radarValues} size={180} />
            <div className="space-y-1.5">
              {radarValues.map((v) => (
                <div key={v.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: v.color }} />
                  <span className="text-[11px] opacity-75">{v.label}</span>
                  <span className="text-[11px] tabular-nums font-semibold mr-auto" style={{ color: v.pct >= 80 ? "var(--ok)" : undefined }}>
                    {v.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* I5: Export insights as PDF */}
      <div ref={insightsExportRef}>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                <FileDown size={16} className="text-[var(--accent)]" />
              </div>
              <div>
                <div className="text-sm font-semibold">ØªØµØ¯ÙŠØ± Ø§Ù„Ø¥Ø­ØµØ§Ø¡Ø§Øª</div>
                <div className="text-xs opacity-50 mt-0.5">Ø·Ø¨Ø§Ø¹Ø© Ø£Ùˆ Ù…Ø´Ø§Ø±ÙƒØ© Ù…Ù„Ø®Øµ Ø§Ù„ØªÙ‚Ø¯Ù…</div>
              </div>
            </div>
            <Button variant="secondary" onClick={exportInsightsPdf} disabled={exporting}>
              <FileDown size={14} />
              {exporting ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ø¶ÙŠØ±..." : "ØªØµØ¯ÙŠØ± PDF"}
            </Button>
          </div>
        </Card>
      </div>

      {/* I7: Weekly report notification */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-2xl border flex items-center justify-center ${
              notifPermission === "granted" ? "border-[var(--ok)]/30 bg-[var(--ok)]/10" : "border-white/10 bg-white/5"
            }`}>
              {notifPermission === "granted" ? <Bell size={15} className="text-[var(--ok)]" /> : <BellOff size={15} className="opacity-50" />}
            </div>
            <div>
              <div className="text-sm font-semibold">Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠ</div>
              <div className="text-xs opacity-50 mt-0.5">
                {notifPermission === "granted"
                  ? "ÙŠÙˆÙ… Ø§Ù„Ø£Ø­Ø¯: Ù…Ù„Ø®Øµ Ø£Ø°ÙƒØ§Ø±ÙƒØŒ Ø¢ÙŠØ§ØªÙƒ ÙˆØµÙ„ÙˆØ§ØªÙƒ"
                  : notifPermission === "denied"
                    ? "Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ù…Ø­Ø¸ÙˆØ±Ø© ÙÙŠ Ø§Ù„Ù…ØªØµÙØ­"
                    : notifPermission === "unsupported"
                      ? "Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª ØºÙŠØ± Ù…Ø¯Ø¹ÙˆÙ…Ø©"
                      : "Ø§Ø¶ØºØ· Ù„ØªÙØ¹ÙŠÙ„ Ø¥Ø´Ø¹Ø§Ø± ÙŠÙˆÙ… Ø§Ù„Ø£Ø­Ø¯"}
              </div>
            </div>
          </div>
          {notifPermission !== "denied" && notifPermission !== "unsupported" && (
            <Button variant="secondary" onClick={requestWeeklyNotif} aria-label="ØªÙØ¹ÙŠÙ„ Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠ">
              <Bell size={14} />
              {notifPermission === "granted" ? "Ø§Ø®ØªØ¨Ø±" : "ØªÙØ¹ÙŠÙ„"}
            </Button>
          )}
        </div>
        {notifPermission === "granted" && (
          <div className="mt-2 text-[11px] opacity-45 leading-5">
            Ø¢Ø®Ø± ØªÙ‚Ø±ÙŠØ±: {weekTotal} Ø°ÙƒØ± â€¢ {quranWeekTotal} Ø¢ÙŠØ© â€¢ {prayerLogWeekTotal} ØµÙ„Ø§Ø©
          </div>
        )}
      </Card>

      {/* Milestone badges */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="font-semibold text-sm">Ø´Ø§Ø±Ø§Øª Ø§Ù„Ø¥Ù†Ø¬Ø§Ø²</div>
          <span className="text-[11px] opacity-50">
            {unlockedMilestones.filter((m) => m.unlocked).length}/{MILESTONES.length}
          </span>
        </div>
        {nextMilestone ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] opacity-55">Ø§Ù„Ø´Ø§Ø±Ø© Ø§Ù„Ù‚Ø§Ø¯Ù…Ø©</div>
              <div className="mt-1 text-sm font-semibold truncate">{nextMilestone.label}</div>
            </div>
            <span className="shrink-0 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-semibold tabular-nums text-[var(--accent)]">
              {Math.max(0, nextMilestone.req - (nextMilestone.type === "total" ? total : streak)).toLocaleString("ar-SA")}
              {nextMilestone.type === "total" ? " Ø°ÙƒØ±" : " ÙŠÙˆÙ…"}
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
              title={m.unlocked ? `Ù…ÙØªÙˆØ­ â€” ${m.type === "total" ? `${m.req} Ø°ÙƒØ±` : `${m.req} ÙŠÙˆÙ… Ø³Ù„Ø³Ù„Ø©`}` : `ÙŠØªØ·Ù„Ø¨ ${m.type === "total" ? `${m.req} Ø°ÙƒØ±` : `${m.req} ÙŠÙˆÙ… Ù…ØªÙˆØ§ØµÙ„`}`}
            >
              <span className="text-2xl leading-none">{m.emoji}</span>
              <span className="text-[11px] font-medium text-center leading-tight">{m.label}</span>
              <span className="text-[10px] opacity-55 tabular-nums">
                {m.type === "total" ? `${m.req}` : `${m.req}Ø¯`}
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
              {isWirdDone ? "âœ…" : "ðŸ“–"}
            </div>
            <div>
              <div className="text-sm font-semibold">ÙˆØ±Ø¯ Ø§Ù„ÙŠÙˆÙ…</div>
              <div className="text-xs opacity-60 mt-0.5">{isWirdDone ? "Ø§ÙƒØªÙ…Ù„ Ø§Ù„ÙŠÙˆÙ…" : "Ù„Ù… ÙŠÙƒØªÙ…Ù„ Ø¨Ø¹Ø¯"}</div>
            </div>
          </div>
          <Button variant="secondary" onClick={() => navigate("/leaderboard")}>
            <Trophy size={15} />
            ØªØ±ØªÙŠØ¨ÙŠ
          </Button>
        </div>
      </Card>

      {/* Note */}
      <div className="text-xs opacity-50 leading-6 px-1">
        Ù…Ù„Ø§Ø­Ø¸Ø©: Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ù…Ø­Ù„ÙŠØ© Ø¹Ù„Ù‰ Ø¬Ù‡Ø§Ø²Ùƒ. Ø¥Ø°Ø§ Ø­Ø°ÙØª Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ØªØµÙØ­/Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø³ÙŠØªÙ… ÙÙ‚Ø¯Ù‡Ø§.
      </div>

      {/* Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØªØ³Ø¨ÙŠØ­ Ù…Ø¯Ù‰ Ø§Ù„Ø­ÙŠØ§Ø© */}
      {Object.keys(tasbeehLifetime).length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">ðŸ“¿</span>
            <div className="font-semibold text-sm">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØªØ³Ø¨ÙŠØ­ Ù…Ø¯Ù‰ Ø§Ù„Ø­ÙŠØ§Ø©</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "subhanallah", label: "Ø³Ø¨Ø­Ø§Ù† Ø§Ù„Ù„Ù‡", emoji: "âœ¨" },
              { key: "alhamdulillah", label: "Ø§Ù„Ø­Ù…Ø¯ Ù„Ù„Ù‡", emoji: "ðŸŒ¿" },
              { key: "la_ilaha_illallah", label: "Ù„Ø§ Ø¥Ù„Ù‡ Ø¥Ù„Ø§ Ø§Ù„Ù„Ù‡", emoji: "ðŸŒŸ" },
              { key: "allahu_akbar", label: "Ø§Ù„Ù„Ù‡ Ø£ÙƒØ¨Ø±", emoji: "ðŸ’«" },
            ].map(({ key, label, emoji }) => {
              const count = tasbeehLifetime[key] ?? 0;
              return (
                <div
                  key={key}
                  className="rounded-2xl p-3 text-center"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
                >
                  <div className="text-xl mb-1">{emoji}</div>
                  <div
                    className="text-lg font-bold tabular-nums"
                    style={{ color: count > 0 ? "var(--accent)" : "var(--fg)", opacity: count > 0 ? 1 : 0.4 }}
                  >
                    {count.toLocaleString("ar-SA")}
                  </div>
                  <div className="text-xs mt-1 opacity-65" style={{ color: "var(--fg)" }}>{label}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}



      {/* â”€â”€ Phase 36: 30-Juz Progress Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {quranStats.started > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-[var(--accent)]" />
            <div className="font-semibold text-sm">ØªÙ‚Ø¯Ù‘Ù… Ø§Ù„Ø£Ø¬Ø²Ø§Ø¡ (30 Ø¬Ø²Ø¡Ù‹Ø§)</div>
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
                  title={`Ø§Ù„Ø¬Ø²Ø¡ ${juzNum}: ${jpct}%`}
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
            <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,255,255,0.07)' }} /><span>Ù„Ù… ÙŠØ¨Ø¯Ø£</span>
            <div className="w-3 h-3 rounded-sm" style={{ background: 'color-mix(in srgb, var(--accent) 50%, transparent)' }} /><span>Ø¬Ø²Ø¦ÙŠ</span>
            <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--ok)' }} /><span>Ù…ÙƒØªÙ…Ù„</span>
          </div>
        </Card>
      )}

      {/* â”€â”€ Phase 30: Quran Progress Share Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {quranStats.started > 0 && (
        <div ref={quranShareCardRef}>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-[var(--accent)]" />
              <div className="font-semibold text-sm">Ø®Ø±ÙŠØ·Ø© Ø®ØªÙ…Ø© Ø§Ù„Ù‚Ø±Ø¢Ù†</div>
            </div>
            <Button variant="secondary" onClick={shareQuranProgress} disabled={quranSharing}>
              <Share2 size={14} />
              {quranSharing ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ø¶ÙŠØ±..." : "Ù…Ø´Ø§Ø±ÙƒØ©"}
            </Button>
          </div>

          <div
            aria-label="Ø®Ø±ÙŠØ·Ø© ØªÙ‚Ø¯Ù… Ø§Ù„Ø³ÙˆØ±"
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
                  title={`Ø³ÙˆØ±Ø© ${sId}: ${cpct}%`}
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
            <span>Ù„Ù… ÙŠÙÙ‚Ø±Ø£</span>
            <div className="w-3 h-3 rounded-sm" style={{ background: "color-mix(in srgb, var(--accent) 50%, transparent)" }} />
            <span>Ø¬Ø²Ø¦ÙŠ</span>
            <div className="w-3 h-3 rounded-sm" style={{ background: "var(--ok)" }} />
            <span>Ù…ÙƒØªÙ…Ù„</span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs opacity-55 flex-wrap">
            <span className="tabular-nums">{quranStats.completed} Ø³ÙˆØ±Ø© Ù…ÙƒØªÙ…Ù„Ø©</span>
            <span className="tabular-nums">{quranStats.started} Ø³ÙˆØ±Ø© Ø¨Ø¯Ø£Øª</span>
            <span className="tabular-nums">{overallQuranProgress}% Ù…Ù† Ø§Ù„Ù‚Ø±Ø¢Ù†</span>
          </div>
        </Card>
        </div>
      )}

      {/* D9: Per-category dhikr progress */}
      {sectionProgress.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} className="text-[var(--accent)]" />
            <div className="text-xs font-semibold opacity-65">ØªÙ‚Ø¯Ù… Ø§Ù„Ø£Ù‚Ø³Ø§Ù…</div>
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

