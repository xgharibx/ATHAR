import * as React from "react";
import { useNavigate } from "react-router-dom";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Clock, Sunrise, CloudSun } from "lucide-react";
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
  const [isOnline, setIsOnline] = React.useState(() => navigator.onLine);
  React.useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const schedule = React.useMemo(
    () => (timings ? buildPrayerSchedule(timings, new Date(nowTs)) : null),
    [nowTs, timings]
  );

  if (isLoading) return <div className="text-xs opacity-50" role="status" aria-live="polite">... جارٍ تحميل مواقيت الصلاة</div>;
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
          <Clock size={16} aria-hidden="true" className="text-[var(--accent)]" />
          <span className="font-semibold text-sm">مواقيت الصلاة</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-[11px] opacity-60 bg-[var(--card)] px-2 py-1 rounded-full border border-[var(--stroke)]">
            {date.hijri.weekday.ar} • {date.hijri.date}
          </span>
          {isFetching && (
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" title="يتم التحديث..." />
          )}
        </div>
      </div>

      {isCached && !isOnline ? (
        <div className="mb-3 text-[11px] opacity-55">يتم عرض آخر نسخة محفوظة — تحقق من الاتصال.</div>
      ) : null}

      {/* Live countdown to next prayer */}
      <div className="mb-4 rounded-[28px] border border-[var(--stroke)] bg-[var(--card)] p-4">
        <PrayerCountdown timings={timings} compact />
      </div>

      {/* Prayer times grid — scrollable at high zoom so times are never clipped */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="grid grid-cols-5 gap-1 text-center" style={{ minWidth: "260px" }}>
        {schedule.primary.map((prayer) => {
          const isCurrent = schedule.current.name === prayer.name;
          const isNext = schedule.next.name === prayer.name;
          return (
            <div
              key={prayer.name}
              aria-current={isCurrent ? "true" : undefined}
              aria-label={`${prayer.label} ${prayer.timeLabel}${isCurrent ? " — الصلاة الحالية" : isNext ? " — الصلاة القادمة" : ""}`}
              className={cn(
                "flex flex-col gap-1 rounded-2xl py-1.5",
                isCurrent && "bg-accent-12 border border-accent-25",
                !isCurrent && isNext && "bg-[var(--card-2)] border border-[var(--stroke)]"
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
      </div>

      {/* P10: Golden hour — Sunrise / Ishraq / Duha */}
      {(() => {
        const sunriseMoment = schedule.extraMoments.find((m) => m.id === "sunrise");
        const duhaMoment    = schedule.extraMoments.find((m) => m.id === "duha");
        if (!sunriseMoment && !duhaMoment) return null;
        return (
          <div className="mt-3 flex items-center gap-2 flex-wrap border-t border-[var(--stroke)] pt-3 text-[11px] opacity-65">
            {sunriseMoment && (
              <div className="flex items-center gap-1.5">
                <Sunrise size={12} aria-hidden="true" className="text-[#ffd27d]" />
                <span>{sunriseMoment.label}</span>
                <span dir="ltr" className="tabular-nums font-medium">{sunriseMoment.value}</span>
              </div>
            )}
            {sunriseMoment && duhaMoment && <span className="opacity-30">·</span>}
            {duhaMoment && (
              <div className="flex items-center gap-1.5">
                <CloudSun size={12} aria-hidden="true" className="text-[#ffd27d]" />
                <span>{duhaMoment.label}</span>
                <span dir="ltr" className="tabular-nums font-medium">{duhaMoment.value}</span>
              </div>
            )}
          </div>
        );
      })()}

      <Button variant="secondary" className="mt-4 w-full justify-between" onClick={() => navigate("/prayer-times")}>
        عرض التفاصيل الكاملة للمواقيت
        <ArrowLeft size={16} aria-hidden="true" />
      </Button>
    </Card>
  );
}
