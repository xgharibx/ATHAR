import * as React from "react";
import { Flame, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { useNoorStore } from "@/store/noorStore";

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

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-[var(--accent)]" />
          <div className="font-semibold">الإحصائيات</div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniStat label="الاستمرارية" value={`${streak} يوم`} icon={<Flame size={18} />} />
          <MiniStat label="إجمالي العدّ" value={`${total}`} />
          <MiniStat label="آخر 14 يوم" value=" " />
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
