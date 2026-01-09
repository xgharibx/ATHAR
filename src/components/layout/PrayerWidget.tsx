import * as React from "react";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { Card } from "@/components/ui/Card";
import { Clock } from "lucide-react";

export function PrayerWidget() {
  const { data, isLoading, error } = usePrayerTimes();

  if (isLoading) return <div className="text-xs opacity-50">... جارٍ تحميل مواقيت الصلاة</div>;
  if (error || !data) return null;

  const { timings, date } = data.data;

  // Simple mapping
  const prayers = [
    { name: "Fajr", time: timings.Fajr, label: "الفجر" },
    { name: "Dhuhr", time: timings.Dhuhr, label: "الظهر" },
    { name: "Asr", time: timings.Asr, label: "العصر" },
    { name: "Maghrib", time: timings.Maghrib, label: "المغرب" },
    { name: "Isha", time: timings.Isha, label: "العشاء" },
  ];

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

  return (
    <Card className="p-4 mb-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[var(--accent)]" />
          <span className="font-semibold text-sm">مواقيت الصلاة</span>
        </div>
        <span className="text-[10px] opacity-60 bg-white/5 px-2 py-1 rounded-full">
          {date.hijri.weekday.ar} • {date.hijri.date}
        </span>
      </div>
      
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
