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

export function InsightsPage() {
  const activity = useNoorStore((s) => s.activity);
  const dailyChecklist = useNoorStore((s) => s.dailyChecklist);
  const missedRecoveryDone = useNoorStore((s) => s.missedRecoveryDone);
  const missedTrackingStartISO = useNoorStore((s) => s.missedTrackingStartISO);
  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);
  const quranBookmarks = useNoorStore((s) => s.quranBookmarks);
  const quranNotes = useNoorStore((s) => s.quranNotes);
  const dailyWirdDone = useNoorStore((s) => s.dailyWirdDone);
  const streak = React.useMemo(() => computeStreak(activity), [activity]);

  const last14 = React.useMemo(() => {
    const today = new Date();
    const arr: { day: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const key = `${yyyy}-${mm}-${dd}`;
      arr.push({ day: key, count: activity[key] ?? 0 });
    }
    return arr;
  }, [activity]);

  const total = Object.values(activity).reduce((a, b) => a + (b ?? 0), 0);

  const todayKey = useTodayKey();

  const quickTotal = React.useMemo(() => {
    return Object.values(quickTasbeeh).reduce((acc, v) => acc + (v ?? 0), 0);
  }, [quickTasbeeh]);

  const bookmarkCount = React.useMemo(() => Object.values(quranBookmarks).filter(Boolean).length, [quranBookmarks]);
  const notesCount = React.useMemo(() => Object.values(quranNotes).filter((v) => (v ?? "").trim().length > 0).length, [quranNotes]);
  const isWirdDone = !!dailyWirdDone[todayKey];

  const qadaa = React.useMemo(() => {
    const targetIds = new Set(["fajr_on_time", "five_prayers", "morning_evening", "quran_reading"]);
    const startISO = missedTrackingStartISO ?? todayKey;

    const doneKeys = Object.entries(missedRecoveryDone)
      .filter(([k, done]) => {
        if (!done) return false;
        const date = String(k).split(":")[0] ?? "";
        return date >= startISO;
      })
      .map(([k]) => k);

    const doneTotal = doneKeys.length;
    const done7d = doneKeys.filter((key) => {
      const date = String(key).split(":")[0] ?? "";
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return false;
      const now = new Date();
      const diff = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / (24 * 60 * 60 * 1000));
      return diff >= 0 && diff <= 6;
    }).length;

    let outstanding = 0;
    const now = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const day = `${yyyy}-${mm}-${dd}`;
      if (day < startISO) continue;
      const row = dailyChecklist[day] ?? {};
      for (const id of targetIds) {
        if (!row[id] && !missedRecoveryDone[`${day}:${id}`]) outstanding += 1;
      }
    }

    return { doneTotal, done7d, outstanding, startISO };
  }, [dailyChecklist, missedRecoveryDone, missedTrackingStartISO, todayKey]);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-[var(--accent)]" />
          <div className="font-semibold">الإحصائيات</div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniStat label="الاستمرارية" value={`${streak} يوم`} icon={<Flame size={18} />} />
          <MiniStat label="إجمالي النشاط" value={`${total}`} />
          <MiniStat label="تسبيح مختارات اليوم" value={`${quickTotal}`} />
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniStat label="علامات المصحف" value={`${bookmarkCount}`} />
          <MiniStat label="ملاحظات الآيات" value={`${notesCount}`} />
          <MiniStat label="ورد اليوم" value={isWirdDone ? "منجز" : "غير منجز"} />
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniStat label="قضاء منجز (7 أيام)" value={`${qadaa.done7d}`} />
          <MiniStat label="قضاء منجز (إجمالي)" value={`${qadaa.doneTotal}`} />
          <MiniStat label="القضاء المتبقي (30 يوم)" value={`${qadaa.outstanding}`} />
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {last14.map((d) => (
            <div key={d.day} className="glass rounded-2xl p-3 border border-white/10 text-center">
              <div className="text-[10px] opacity-60">{d.day.slice(5)}</div>
              <div className="text-sm font-semibold tabular-nums mt-1">{d.count}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs opacity-60 leading-6">
          ملاحظة: الإحصائيات محلية على جهازك. إذا حذفت بيانات المتصفح/التطبيق سيتم فقدها.
        </div>
        <div className="mt-1 text-[11px] opacity-55">
          بداية تتبع القضاء: {qadaa.startISO}
        </div>
      </Card>
    </div>
  );
}

function MiniStat(props: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="glass rounded-3xl p-4 border border-white/10">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs opacity-60">{props.label}</div>
        <div className="opacity-70">{props.icon}</div>
      </div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{props.value}</div>
    </div>
  );
}
