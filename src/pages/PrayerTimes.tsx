import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Clock3, CloudSun, MoonStar, Sunrise, Sunset, TimerReset } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PrayerCountdown } from "@/components/layout/PrayerCountdown";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { buildPrayerSchedule, type PrayerDetailRow } from "@/lib/prayerSchedule";
import { cn } from "@/lib/utils";

function rowIcon(row: PrayerDetailRow) {
  if (row.type === "forbidden") return AlertTriangle;
  if (row.id === "sunrise") return Sunrise;
  if (row.id === "sunset") return Sunset;
  if (row.id === "duha") return CloudSun;
  if (row.id === "tahajjud") return MoonStar;
  return Clock3;
}

function rowStyles(row: PrayerDetailRow, active: boolean, next: boolean) {
  if (active) {
    return "bg-[var(--accent)]/12 border-[var(--accent)]/30";
  }
  if (next && row.type === "prayer") {
    return "bg-white/7 border-white/15";
  }
  switch (row.type) {
    case "forbidden":
      return "bg-[#ff9b9b]/12 border-[#ffb1b1]/25";
    case "marker":
      return "bg-[#ffd27d]/12 border-[#ffd27d]/25";
    case "moment":
      return "bg-[#90d8ff]/10 border-[#90d8ff]/22";
    default:
      return "bg-white/4 border-white/10";
  }
}

export function PrayerTimesPage() {
  const navigate = useNavigate();
  const prayerTimes = usePrayerTimes();
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = globalThis.setInterval(() => setNow(new Date()), 30_000);
    return () => globalThis.clearInterval(id);
  }, []);

  const data = prayerTimes.data;
  const timings = data?.data?.timings;
  const date = data?.data?.date;
  const schedule = React.useMemo(() => (timings ? buildPrayerSchedule(timings, now) : null), [now, timings]);

  if (prayerTimes.isLoading) {
    return <div className="p-4 text-sm opacity-60">... جارٍ تحميل مواقيت الصلاة</div>;
  }

  if (prayerTimes.error || !data || !timings || !date || !schedule) {
    return (
      <div className="p-4">
        <Card className="p-5 text-sm opacity-70">تعذر تحميل صفحة مواقيت الصلاة حاليًا.</Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-bold">مواقيت الصلاة</div>
          <div className="mt-1 text-xs opacity-60 leading-6">عرض يومي ذكي يشمل أوقات الصلوات والضحى والتهجد وأوقات النهي.</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowRight size={15} />
          رجوع
        </Button>
      </div>

      <Card className="p-5 overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ background: "radial-gradient(circle at top right, var(--accent), transparent 55%)" }} />
        <div className="relative">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Badge className="text-[11px]">{data.__sourceLabel ?? "المصدر الافتراضي"}</Badge>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Badge className="text-[11px]">{date.readable}</Badge>
              <Badge className="text-[11px]">{date.hijri.date} {date.hijri.month.ar}</Badge>
            </div>
          </div>

          <div className="mt-4 rounded-[30px] border border-white/10 bg-gradient-to-br from-white/8 to-white/3 p-4 md:p-5">
            <PrayerCountdown timings={timings} />
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {schedule.extraMoments.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                <div className="text-[11px] opacity-55">{item.label}</div>
                <div className="mt-1 text-sm font-semibold tabular-nums">{item.value}</div>
              </div>
            ))}
          </div>

          {data.__fromCache ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] opacity-60">
              <TimerReset size={12} />
              يتم عرض آخر نسخة محفوظة بدون اتصال.
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-sm font-semibold">تفاصيل اليوم</div>
          <div className="text-[11px] opacity-55">الحالية: {schedule.current.label}</div>
        </div>

        <div className="space-y-2.5">
          {schedule.detailRows.map((row) => {
            const Icon = rowIcon(row);
            const isActive = row.prayerName === schedule.current.name;
            const isNext = row.prayerName === schedule.next.name;
            return (
              <div
                key={row.id}
                className={cn(
                  "rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 transition",
                  rowStyles(row, isActive, isNext)
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-black/10 grid place-items-center shrink-0">
                    <Icon size={18} className="opacity-80" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-semibold">{row.label}</div>
                      {isActive ? <Badge className="text-[10px] bg-[var(--accent)]/16 border-[var(--accent)]/20 text-white">الآن</Badge> : null}
                      {!isActive && isNext ? <Badge className="text-[10px]">التالي</Badge> : null}
                    </div>
                    <div className="mt-1 text-[11px] opacity-60 leading-5">
                      {row.type === "forbidden" ? "فترة نهي عن الصلاة النافلة" : row.type === "moment" ? "نافلة أو وقت إضافي ضمن الجدول" : row.type === "marker" ? "لحظة مفصلية في اليوم" : "نافلة الفريضة ووقتها اليوم"}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-sm font-medium tabular-nums text-left">{row.timeLabel}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}