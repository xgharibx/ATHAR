import * as React from "react";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { Card } from "@/components/ui/Card";
import { Clock, RefreshCcw } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

export function PrayerWidget() {
  const { data, isLoading, error, refetch, isFetching } = usePrayerTimes();
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

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.max(0, Math.floor(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes} د`;
    return `${hours} س ${String(minutes).padStart(2, "0")} د`;
  };

  const untilNext = prayerTimeline
    ? formatDuration(prayerTimeline.next.at.getTime() - nowTs)
    : "—";
  const sincePrevious = prayerTimeline
    ? formatDuration(nowTs - prayerTimeline.previous.at.getTime())
    : "—";

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
          <span className="text-[10px] opacity-60">({sourceLabel})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] opacity-60 bg-white/5 px-2 py-1 rounded-full">
            {date.hijri.weekday.ar} • {date.hijri.date}
          </span>
          <IconButton
            aria-label="تحديث مواقيت الصلاة"
            title="تحديث"
            onClick={() => void refetch()}
            className={isFetching ? "opacity-60 pointer-events-none" : undefined}
          >
            <RefreshCcw size={14} className={isFetching ? "animate-spin" : undefined} />
          </IconButton>
        </div>
      </div>

      {isCached ? (
        <div className="mb-3 text-[10px] opacity-55">يتم عرض آخر نسخة محفوظة بدون اتصال.</div>
      ) : null}

      {prayerTimeline ? (
        <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[10px] opacity-55">المتبقي للصلاة القادمة</div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold">{prayerTimeline.next.label}</span>
              <span className="tabular-nums">{untilNext}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[10px] opacity-55">المنقضي منذ آخر صلاة</div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold">{prayerTimeline.previous.label}</span>
              <span className="tabular-nums">{sincePrevious}</span>
            </div>
          </div>
        </div>
      ) : null}
      
      <div className="grid grid-cols-5 gap-2 text-center">
        {prayers.map((p) => (
          <div key={p.name} className="flex flex-col gap-1">
            <span className="text-[10px] opacity-50">{p.label}</span>
            <span className="text-sm font-medium tabular-nums">{format12h(p.time)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
