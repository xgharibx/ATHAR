import * as React from "react";
import { useNavigate } from "react-router-dom";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Clock } from "lucide-react";
import { buildPrayerSchedule } from "@/lib/prayerSchedule";
import { PrayerCountdown } from "./PrayerCountdown";

export function PrayerWidget() {
  const navigate = useNavigate();
  const { data, isLoading, error, isFetching } = usePrayerTimes();
  const [nowTs, setNowTs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = globalThis.setInterval(() => setNowTs(Date.now()), 30_000);
    return () => globalThis.clearInterval(id);
  }, []);

  const timings = data?.data?.timings;
  const date = data?.data?.date;
  const isCached = !!data?.__fromCache;
  const sourceLabel = data?.__sourceLabel ?? "المصدر الافتراضي";
  const schedule = React.useMemo(
    () => (timings ? buildPrayerSchedule(timings, new Date(nowTs)) : null),
    [nowTs, timings]
  );

  if (isLoading) return <div className="text-xs opacity-50">... جارٍ تحميل مواقيت الصلاة</div>;
  if (error || !data || !date || !timings || !schedule) {
    return (
      <Card className="p-4 mb-6">
        <div className="text-xs opacity-65">تعذر تحميل مواقيت الصلاة حاليًا.</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 mb-6 relative overflow-hidden">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[var(--accent)]" />
          <span className="font-semibold text-sm">مواقيت الصلاة</span>
          <span className="text-[11px] opacity-60">{sourceLabel}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-[11px] opacity-60 bg-white/5 px-2 py-1 rounded-full border border-white/10">
            {date.hijri.weekday.ar} • {date.hijri.date}
          </span>
          {isFetching && (
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" title="يتم التحديث..." />
          )}
        </div>
      </div>

      {isCached ? (
        <div className="mb-3 text-[11px] opacity-55">يتم عرض آخر نسخة محفوظة بدون اتصال.</div>
      ) : null}

      {/* Live countdown to next prayer */}
      <div className="mb-4 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/8 to-white/3 p-4">
        <PrayerCountdown timings={timings} compact />
      </div>

      <div className="grid grid-cols-5 gap-2 text-center">
        {schedule.primary.map((prayer) => {
          const isCurrent = schedule.current.name === prayer.name;
          const isNext = schedule.next.name === prayer.name;
          return (
            <div
              key={prayer.name}
              className={cn(
                "flex flex-col gap-1 rounded-2xl py-1.5",
                isCurrent && "bg-[var(--accent)]/12 border border-[var(--accent)]/25",
                !isCurrent && isNext && "bg-white/6 border border-white/12"
              )}
            >
              <span className={cn("text-[11px]", isCurrent ? "opacity-95 font-semibold" : isNext ? "opacity-85" : "opacity-55")}>
                {prayer.label}
              </span>
              <span dir="ltr" className={cn("text-sm font-medium tabular-nums", isCurrent && "text-[var(--accent)]")}>
                {prayer.timeLabel}
              </span>
            </div>
          );
        })}
      </div>

      <Button variant="secondary" className="mt-4 w-full justify-between" onClick={() => navigate("/prayer-times")}>
        عرض التفاصيل الكاملة للمواقيت
        <ArrowLeft size={16} />
      </Button>
    </Card>
  );
}
