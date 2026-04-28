import * as React from "react";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { PrayerCountdown } from "./PrayerCountdown";

export function PrayerWidget() {
  const { data, isLoading, error, isFetching } = usePrayerTimes();
  const [nowTs, setNowTs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const timings = data?.data?.timings;
  const date = data?.data?.date;
  const isCached = !!data?.__fromCache;
  const sourceLabel = data?.__sourceLabel ?? "المصدر الافتراضي";

  // Simple mapping
  const prayers = React.useMemo(
    () =>
      timings
        ? [
            { name: "Fajr", time: timings.Fajr, label: "الفجر" },
            { name: "Dhuhr", time: timings.Dhuhr, label: "الظهر" },
            { name: "Asr", time: timings.Asr, label: "العصر" },
            { name: "Maghrib", time: timings.Maghrib, label: "المغرب" },
            { name: "Isha", time: timings.Isha, label: "العشاء" },
          ]
        : [],
    [timings]
  );

  const prayerTimeline = React.useMemo(() => {
    const now = new Date(nowTs);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const withDate = prayers
      .map((p) => {
        const clean = String(p.time ?? "").trim().split(" ")[0] ?? "";
        const [hh, mm] = clean.split(":").map((x) => parseInt(x, 10));
        if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
        const at = new Date(dayStart);
        at.setHours(hh, mm, 0, 0);
        return { ...p, at };
      })
      .filter((x): x is { name: string; time: string; label: string; at: Date } => !!x)
      .sort((a, b) => a.at.getTime() - b.at.getTime());

    if (!withDate.length) return null;

    let next = withDate.find((p) => p.at.getTime() > now.getTime());
    if (!next) {
      const firstTomorrow = new Date(withDate[0].at);
      firstTomorrow.setDate(firstTomorrow.getDate() + 1);
      next = { ...withDate[0], at: firstTomorrow };
    }

    let previous = [...withDate].reverse().find((p) => p.at.getTime() <= now.getTime());
    if (!previous) {
      const lastYesterday = new Date(withDate[withDate.length - 1].at);
      lastYesterday.setDate(lastYesterday.getDate() - 1);
      previous = { ...withDate[withDate.length - 1], at: lastYesterday };
    }

    return { previous, next };
  }, [nowTs, prayers]);

  const format12h = (raw: string) => {
    const clean = String(raw ?? "").trim().split(" ")[0] ?? "";
    const [hh, mm] = clean.split(":").map((x) => parseInt(x, 10));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return clean;
    const d = new Date(2000, 0, 1, hh, mm);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(d);
  };

  if (isLoading) return <div className="text-xs opacity-50">... جارٍ تحميل مواقيت الصلاة</div>;
  if (error || !data || !date || !timings) {
    return (
      <Card className="p-4 mb-6">
        <div className="text-xs opacity-65">تعذر تحميل مواقيت الصلاة حاليًا.</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 mb-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[var(--accent)]" />
          <span className="font-semibold text-sm">مواقيت الصلاة</span>
          <span className="text-[11px] opacity-60">({sourceLabel})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] opacity-60 bg-white/5 px-2 py-1 rounded-full">
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
      <div className="mb-3">
        <PrayerCountdown timings={timings} />
      </div>
      <div className="grid grid-cols-5 gap-2 text-center">
        {prayers.map((p) => {
          const isNext = prayerTimeline?.next?.name === p.name;
          return (
            <div
              key={p.name}
              className={cn(
                "flex flex-col gap-1 rounded-2xl py-1.5",
                isNext && "bg-[var(--accent)]/10 border border-[var(--accent)]/20"
              )}
            >
              <span className={cn("text-[11px]", isNext ? "opacity-90 font-semibold" : "opacity-55")}>{p.label}</span>
              <span className={cn("text-sm font-medium tabular-nums", isNext && "text-[var(--accent)]")}>{format12h(p.time)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
