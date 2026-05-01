// PrayerTimes page — P1-P12 complete implementation
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight,
  Clock3, CloudSun, Compass, Globe, MoonStar, Plus, RefreshCw,
  Settings2, Sunrise, Sunset, TimerReset, Trash2, X,
} from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PrayerCountdown } from "@/components/layout/PrayerCountdown";
import { PrayerTimesPageSkeleton } from "@/components/ui/Skeleton";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { syncReminders } from "@/lib/reminders";
import { buildPrayerSchedule, format12h, type PrayerDetailRow, PRAYER_LABELS, parseClockToMinutes, formatMinutes12h } from "@/lib/prayerSchedule";
import { cn } from "@/lib/utils";
import { toArabicIndic } from "@/lib/arabic";
import { PTRIndicator, usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useNoorStore } from "@/store/noorStore";
import type { PrayerAlertPrayer } from "@/store/noorStore";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRAYER_CALC_METHODS = [
  { value: 1,  label: "جامعة العلوم الإسلامية - كراتشي" },
  { value: 2,  label: "الجمعية الإسلامية لأمريكا الشمالية" },
  { value: 3,  label: "رابطة العالم الإسلامي" },
  { value: 4,  label: "جامعة أم القرى - مكة المكرمة" },
  { value: 5,  label: "الهيئة المصرية العامة للمساحة" },
  { value: 7,  label: "معهد الجيوفيزياء - إيران" },
  { value: 8,  label: "دول الخليج" },
  { value: 9,  label: "الكويت" },
  { value: 10, label: "قطر" },
  { value: 11, label: "سنغافورة" },
  { value: 12, label: "فرنسا" },
  { value: 13, label: "ديانت - تركيا" },
  { value: 14, label: "روسيا" },
  { value: 15, label: "لجنة رؤية الهلال العالمية" },
  { value: 17, label: "ماليزيا - JAKIM" },
  { value: 18, label: "تونس" },
  { value: 19, label: "الجزائر" },
  { value: 20, label: "إندونيسيا - KEMENAG" },
  { value: 21, label: "المغرب" },
  { value: 23, label: "الأردن - وزارة الأوقاف" },
] as const;

const PRIMARY_PRAYERS: PrayerAlertPrayer[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

const POPULAR_CITIES = [
  { city: "Mecca",          country: "Saudi Arabia", label: "مكة المكرمة" },
  { city: "Medina",         country: "Saudi Arabia", label: "المدينة المنورة" },
  { city: "Riyadh",         country: "Saudi Arabia", label: "الرياض" },
  { city: "Cairo",          country: "Egypt",         label: "القاهرة" },
  { city: "Dubai",          country: "UAE",           label: "دبي" },
  { city: "Istanbul",       country: "Turkey",        label: "إسطنبول" },
  { city: "Karachi",        country: "Pakistan",      label: "كراتشي" },
  { city: "London",         country: "UK",            label: "لندن" },
  { city: "Paris",          country: "France",        label: "باريس" },
  { city: "New York",       country: "United States", label: "نيويورك" },
  { city: "Kuala Lumpur",   country: "Malaysia",      label: "كوالالمبور" },
  { city: "Jakarta",        country: "Indonesia",     label: "جاكرتا" },
];

const ISLAMIC_EVENTS: Record<number, Record<number, string[]>> = {
  1:  { 1: ["رأس السنة الهجرية"], 10: ["يوم عاشوراء"] },
  3:  { 12: ["المولد النبوي الشريف"] },
  7:  { 27: ["الإسراء والمعراج"] },
  8:  { 15: ["ليلة النصف من شعبان"] },
  9:  {
    1:  ["بداية شهر رمضان المبارك"],
    17: ["غزوة بدر الكبرى"],
    21: ["ليلة القدر (مرجحة)"],
    23: ["ليلة القدر (مرجحة)"],
    25: ["ليلة القدر (مرجحة)"],
    27: ["ليلة القدر (الأرجح)"],
    29: ["ليلة القدر (مرجحة)"],
  },
  10: { 1: ["عيد الفطر المبارك"] },
  12: {
    8:  ["يوم التروية"],
    9:  ["يوم عرفة"],
    10: ["عيد الأضحى المبارك"],
    11: ["أيام التشريق"],
    12: ["أيام التشريق"],
    13: ["أيام التشريق"],
  },
};

type TabKey = "today" | "weekly" | "monthly" | "track" | "hijri" | "cities";

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarDayEntry = {
  timings: Record<string, string>;
  date: {
    readable: string;
    gregorian: {
      date: string; day: string;
      month: { number: number; en: string };
      year: string;
      weekday: { en: string };
    };
    hijri: {
      date: string; day: string;
      month: { number: number; en: string; ar: string };
      year: string;
    };
  };
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function cleanTime(raw: string) { return (raw ?? "").split(" ")[0] ?? raw; }

function rowIcon(row: PrayerDetailRow) {
  if (row.type === "forbidden") return AlertTriangle;
  if (row.id === "sunrise")    return Sunrise;
  if (row.id === "sunset")     return Sunset;
  if (row.id === "duha")       return CloudSun;
  if (row.id === "tahajjud")   return MoonStar;
  return Clock3;
}

function rowStyles(row: PrayerDetailRow, active: boolean, next: boolean) {
  if (active)                   return "bg-[var(--accent)]/12 border-[var(--accent)]/30";
  if (next && row.type === "prayer") return "bg-white/7 border-white/15";
  switch (row.type) {
    case "forbidden": return "bg-[#ff9b9b]/12 border-[#ffb1b1]/25";
    case "marker":    return "bg-[#ffd27d]/12 border-[#ffd27d]/25";
    case "moment":    return "bg-[#90d8ff]/10 border-[#90d8ff]/22";
    default:          return "bg-white/4 border-white/10";
  }
}

function getLocalDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Calendar hook ────────────────────────────────────────────────────────────

function usePrayerCalendar(year: number, month: number) {
  const method  = useNoorStore((s) => s.prefs.prayerCalcMethod ?? 5);
  const school  = useNoorStore((s) => s.prefs.asrMadhab ?? 0);
  const favCities = useNoorStore((s) => s.favoriteCities);
  const city    = favCities[0]?.city    ?? "Cairo";
  const country = favCities[0]?.country ?? "Egypt";

  return useQuery<CalendarDayEntry[]>({
    queryKey: ["prayer-calendar", year, month, method, school, city, country],
    queryFn: async () => {
      const coordsRaw = localStorage.getItem("noor_prayer_coords_v1");
      if (coordsRaw) {
        try {
          const { lat, lng } = JSON.parse(coordsRaw) as { lat: number; lng: number };
          const res = await fetch(
            `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`
          );
          if (res.ok) { const j = await res.json() as { data: CalendarDayEntry[] }; return j.data; }
        } catch { /* fallthrough */ }
      }
      const res = await fetch(
        `https://api.aladhan.com/v1/calendarByCity/${year}/${month}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&school=${school}`
      );
      if (!res.ok) throw new Error("تعذر جلب التقويم");
      const j = await res.json() as { data: CalendarDayEntry[] };
      return j.data;
    },
    staleTime: 24 * 60 * 60 * 1000,
    retry: 2,
  });
}

// ─── City prayer times hook ───────────────────────────────────────────────────

function useCityTimes(city: string, country: string) {
  const method = useNoorStore((s) => s.prefs.prayerCalcMethod ?? 5);
  const school = useNoorStore((s) => s.prefs.asrMadhab ?? 0);
  return useQuery({
    queryKey: ["city-times", city, country, method, school],
    queryFn: async () => {
      const res = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&school=${school}`
      );
      if (!res.ok) throw new Error("failed");
      const j = await res.json() as { data: { timings: Record<string, string> } };
      return j.data.timings;
    },
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

// ─── IqamaTime ────────────────────────────────────────────────────────────────

function IqamaTime({ prayerTime, offset }: { prayerTime: string; offset: number }) {
  const mins = parseClockToMinutes(cleanTime(prayerTime));
  if (mins == null) return null;
  return (
    <div dir="ltr" className="text-[10px] opacity-40 tabular-nums text-left">
      إقامة {formatMinutes12h(mins + offset)}
    </div>
  );
}

// ─── CityRow ──────────────────────────────────────────────────────────────────

function CityRow({ city, country, label, onRemove }: {
  city: string; country: string; label: string; onRemove: () => void;
}) {
  const { data, isLoading, error } = useCityTimes(city, country);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-sm">{label}</div>
        <button type="button" onClick={onRemove} className="opacity-40 hover:opacity-70 p-1" aria-label="حذف المدينة">
          <X size={13} />
        </button>
      </div>
      {isLoading ? (
        <div className="text-xs opacity-40">جارٍ التحميل...</div>
      ) : (error || !data) ? (
        <div className="text-xs opacity-40">تعذر التحميل</div>
      ) : (
        <div className="grid grid-cols-5 gap-1 text-center text-xs">
          {PRIMARY_PRAYERS.map((p) => (
            <div key={p}>
              <div className="opacity-50 mb-0.5">{PRAYER_LABELS[p]}</div>
              <div dir="ltr" className="font-medium tabular-nums">{format12h(cleanTime(data[p] ?? ""))}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SettingsPanel (P4, P5, P6, P7) ──────────────────────────────────────────

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const prefs            = useNoorStore((s) => s.prefs);
  const reminders        = useNoorStore((s) => s.reminders);
  const setPrefs         = useNoorStore((s) => s.setPrefs);
  const setReminders     = useNoorStore((s) => s.setReminders);
  const customAdhanBase64   = useNoorStore((s) => s.customAdhanBase64);
  const setCustomAdhanBase64 = useNoorStore((s) => s.setCustomAdhanBase64);
  const fileRef  = React.useRef<HTMLInputElement>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const iqamaOffsets = reminders.iqamaOffsets ?? { Fajr: 20, Dhuhr: 15, Asr: 15, Maghrib: 10, Isha: 15 };

  const handleAdhanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("حجم الملف أكبر من 5 ميغابايت"); return; }
    const reader = new FileReader();
    reader.onload = () => { setCustomAdhanBase64(reader.result as string); toast.success("تم رفع صوت الأذان المخصص"); };
    reader.readAsDataURL(file);
  };

  const playCustomAdhan = () => {
    if (!customAdhanBase64) return;
    audioRef.current?.pause();
    audioRef.current = new Audio(customAdhanBase64);
    void audioRef.current.play();
  };

  React.useEffect(() => { return () => { audioRef.current?.pause(); }; }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md max-h-[85vh] overflow-y-auto p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="font-semibold">إعدادات مواقيت الصلاة</div>
          <button type="button" onClick={onClose} className="opacity-50 hover:opacity-80 p-1"><X size={18} /></button>
        </div>

        {/* P5 */}
        <div>
          <div className="text-xs font-semibold opacity-60 mb-2 uppercase tracking-wide">طريقة الحساب</div>
          <select
            value={prefs.prayerCalcMethod ?? 5}
            onChange={(e) => setPrefs({ prayerCalcMethod: Number(e.target.value) })}
            className="w-full rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]/50"
          >
            {PRAYER_CALC_METHODS.map((m) => (
              <option key={m.value} value={m.value} className="bg-gray-900 text-white">{m.label}</option>
            ))}
          </select>
        </div>

        {/* P6 */}
        <div>
          <div className="text-xs font-semibold opacity-60 mb-2 uppercase tracking-wide">حساب وقت العصر</div>
          <div className="flex gap-2">
            {([0, 1] as const).map((v) => (
              <button key={v} type="button"
                onClick={() => setPrefs({ asrMadhab: v })}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-sm transition",
                  (prefs.asrMadhab ?? 0) === v
                    ? "bg-[var(--accent)]/15 border-[var(--accent)]/40 text-white"
                    : "border-white/10 bg-white/5 opacity-60 hover:opacity-80"
                )}>
                {v === 0 ? "شافعي / مالكي / حنبلي" : "حنفي"}
              </button>
            ))}
          </div>
        </div>

        {/* P7 */}
        <div>
          <div className="text-xs font-semibold opacity-60 mb-2 uppercase tracking-wide">دقائق الإقامة بعد الأذان</div>
          <div className="space-y-2">
            {PRIMARY_PRAYERS.map((p) => (
              <div key={p} className="flex items-center justify-between gap-3">
                <span className="text-sm w-16">{PRAYER_LABELS[p]}</span>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => setReminders({ iqamaOffsets: { ...iqamaOffsets, [p]: Math.max(0, (iqamaOffsets[p] ?? 15) - 5) } })}
                    className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 grid place-items-center text-sm">−</button>
                  <span className="w-12 text-center text-sm font-medium tabular-nums">{iqamaOffsets[p] ?? 15} د</span>
                  <button type="button"
                    onClick={() => setReminders({ iqamaOffsets: { ...iqamaOffsets, [p]: Math.min(60, (iqamaOffsets[p] ?? 15) + 5) } })}
                    className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 grid place-items-center text-sm">+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* P4 */}
        <div>
          <div className="text-xs font-semibold opacity-60 mb-2 uppercase tracking-wide">صوت أذان مخصص</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Plus size={14} /> رفع ملف MP3
            </Button>
            {customAdhanBase64 && (
              <>
                <Button variant="secondary" size="sm" onClick={playCustomAdhan}>▶ تشغيل</Button>
                <Button variant="secondary" size="sm" onClick={() => { setCustomAdhanBase64(null); toast.success("تم حذف الأذان المخصص"); }}>
                  <Trash2 size={13} /> حذف
                </Button>
              </>
            )}
            {!customAdhanBase64 && <span className="text-xs opacity-40 flex items-center">لم يُرفع صوت بعد</span>}
          </div>
          <input ref={fileRef} type="file" accept="audio/mp3,audio/mpeg,audio/*" className="hidden" onChange={handleAdhanUpload} />
        </div>
      </Card>
    </div>
  );
}

// ─── WeeklyTab (P8) ───────────────────────────────────────────────────────────

function WeeklyTab() {
  const now = new Date();
  const { data, isLoading, error } = usePrayerCalendar(now.getFullYear(), now.getMonth() + 1);
  const todayDay = now.getDate();

  if (isLoading) return <div className="text-sm opacity-50 p-2">جارٍ التحميل...</div>;
  if (error || !data) return <div className="text-sm opacity-50 p-2">تعذر تحميل الجدول الأسبوعي</div>;

  const todayIdx = data.findIndex((d) => Number(d.date.gregorian.day) === todayDay);
  const start = Math.max(0, todayIdx === -1 ? 0 : todayIdx);
  const week  = data.slice(start, start + 7);

  const DAY_NAMES: Record<string, string> = {
    Monday: "الاثنين", Tuesday: "الثلاثاء", Wednesday: "الأربعاء",
    Thursday: "الخميس", Friday: "الجمعة", Saturday: "السبت", Sunday: "الأحد",
  };

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs">
        <thead>
          <tr className="opacity-50">
            <th className="text-right pb-2 pr-1">اليوم</th>
            {PRIMARY_PRAYERS.map((p) => <th key={p} className="pb-2 px-1 text-center">{PRAYER_LABELS[p]}</th>)}
          </tr>
        </thead>
        <tbody>
          {week.map((day, i) => {
            const isToday = Number(day.date.gregorian.day) === todayDay;
            return (
              <tr key={i} className={cn("border-t border-white/8", isToday && "bg-[var(--accent)]/8 rounded-xl")}>
                <td className="py-2 pr-1">
                  <div className="flex flex-col">
                    <span className={cn("font-medium", isToday && "text-[var(--accent)]")}>
                      {DAY_NAMES[day.date.gregorian.weekday.en] ?? day.date.gregorian.weekday.en}
                    </span>
                    <span className="opacity-40 text-[10px]">{day.date.gregorian.day}/{day.date.gregorian.month.number}</span>
                  </div>
                </td>
                {PRIMARY_PRAYERS.map((p) => (
                  <td key={p} className="py-2 px-1 text-center">
                    <span dir="ltr" className={cn("tabular-nums", isToday && "text-[var(--accent)] font-semibold")}>
                      {format12h(cleanTime(day.timings[p] ?? ""))}
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── MonthlyTab (P3) ──────────────────────────────────────────────────────────

function MonthlyTab() {
  const now = new Date();
  const [viewYear,  setViewYear]  = React.useState(now.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(now.getMonth() + 1);
  const { data, isLoading, error } = usePrayerCalendar(viewYear, viewMonth);
  const todayDay       = now.getDate();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1;

  const MONTH_NAMES = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  const prev = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); };
  const next = () => { if (viewMonth === 12) { setViewMonth(1);  setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={prev} className="p-2 rounded-full bg-white/8 hover:bg-white/15"><ChevronRight size={16} /></button>
        <div className="font-semibold text-sm">{MONTH_NAMES[viewMonth - 1]} {viewYear}</div>
        <button type="button" onClick={next} className="p-2 rounded-full bg-white/8 hover:bg-white/15"><ChevronLeft size={16} /></button>
      </div>
      {isLoading && <div className="text-sm opacity-50">جارٍ التحميل...</div>}
      {(error || (!isLoading && !data)) && <div className="text-sm opacity-50">تعذر تحميل التقويم الشهري</div>}
      {data && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="opacity-50">
                <th className="text-right pb-1.5 pr-1">اليوم</th>
                {PRIMARY_PRAYERS.map((p) => <th key={p} className="pb-1.5 px-0.5 text-center">{PRAYER_LABELS[p]}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((day, i) => {
                const dayNum  = Number(day.date.gregorian.day);
                const isToday = isCurrentMonth && dayNum === todayDay;
                return (
                  <tr key={i} className={cn("border-t border-white/6", isToday && "bg-[var(--accent)]/8")}>
                    <td className="py-1.5 pr-1">
                      <div className={cn("font-medium", isToday && "text-[var(--accent)]")}>{day.date.gregorian.day}</div>
                      <div className="opacity-40 text-[9px]">{day.date.hijri.day} {day.date.hijri.month.ar}</div>
                    </td>
                    {PRIMARY_PRAYERS.map((p) => (
                      <td key={p} className="py-1.5 px-0.5 text-center">
                        <span dir="ltr" className={cn("tabular-nums", isToday && "text-[var(--accent)] font-semibold")}>
                          {format12h(cleanTime(day.timings[p] ?? ""))}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── TrackingTab (P9) ─────────────────────────────────────────────────────────

function TrackingTab({ timings }: { timings: Record<string, string> | null }) {
  const today           = getLocalDateKey();
  const prayerLog       = useNoorStore((s) => s.prayerLog);
  const setPrayerLogged = useNoorStore((s) => s.setPrayerLogged);
  const todayLog        = prayerLog[today] ?? {};

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const done = PRIMARY_PRAYERS.filter((p) => (prayerLog[key] ?? {})[p]).length;
    return { key, day: d.getDate(), done };
  });

  const totalThisWeek = weekDays.reduce((acc, d) => acc + d.done, 0);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold opacity-60 mb-3 uppercase tracking-wide">صلوات اليوم</div>
        <div className="space-y-2">
          {PRIMARY_PRAYERS.map((p) => {
            const prayed  = !!todayLog[p];
            const timeRaw = timings?.[p];
            return (
              <div key={p}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition cursor-pointer select-none",
                  prayed ? "bg-[var(--accent)]/12 border-[var(--accent)]/30" : "bg-white/4 border-white/10 hover:bg-white/8"
                )}
                onClick={() => setPrayerLogged(today, p, !prayed)}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPrayerLogged(today, p, !prayed); } }}
                aria-label={`${PRAYER_LABELS[p]} - ${prayed ? "تم الصلاة" : "لم يُصلَّ بعد"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-xl border-2 grid place-items-center transition",
                    prayed ? "bg-[var(--accent)] border-[var(--accent)]" : "border-white/20 bg-white/5")}>
                    {prayed && <Check size={16} strokeWidth={3} />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{PRAYER_LABELS[p]}</div>
                    {timeRaw && <div dir="ltr" className="text-xs opacity-50 text-left">{format12h(cleanTime(timeRaw))}</div>}
                  </div>
                </div>
                {prayed && <Badge className="text-[10px] bg-[var(--accent)]/16 border-[var(--accent)]/20">صلّيتُ ✓</Badge>}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold opacity-60 mb-3 uppercase tracking-wide">
          آخر ٧ أيام · {toArabicIndic(totalThisWeek)} / ٣٥ صلاة
        </div>
        <div className="flex items-end gap-1.5">
          {weekDays.map((d) => {
            const pct     = d.done / 5;
            const isToday = d.key === today;
            return (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-full bg-white/8 overflow-hidden" style={{ height: 60 }}>
                  <div className={cn("w-full rounded-full transition-all duration-500", isToday ? "bg-[var(--accent)]" : "bg-white/30")}
                    style={{ height: `${Math.round(pct * 100)}%`, marginTop: `${100 - Math.round(pct * 100)}%` }} />
                </div>
                <div className={cn("text-[10px] tabular-nums", isToday ? "text-[var(--accent)] font-bold" : "opacity-40")}>{d.day}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── HijriCalendarTab (P11 + P12) ─────────────────────────────────────────────

function HijriCalendarTab() {
  const now  = new Date();
  const [viewYear,  setViewYear]  = React.useState(now.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(now.getMonth() + 1);
  const { data, isLoading, error } = usePrayerCalendar(viewYear, viewMonth);
  const todayDay       = now.getDate();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1;

  const MONTH_NAMES = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const HIJRI_MONTHS = ["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];

  const prev = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); };
  const next = () => { if (viewMonth === 12) { setViewMonth(1);  setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); };

  const calendarGrid = React.useMemo(() => {
    if (!data) return null;
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const arabicWeekStart = (firstDay.getDay() + 1) % 7;
    return { blanks: arabicWeekStart, days: data };
  }, [data, viewYear, viewMonth]);

  const hijriHeader = data?.[todayDay - 1]?.date?.hijri;

  return (
    <div className="space-y-3">
      {hijriHeader && isCurrentMonth && (
        <div className="text-center py-2 rounded-2xl bg-[var(--accent)]/8 border border-[var(--accent)]/15 text-sm">
          اليوم: {hijriHeader.day} {HIJRI_MONTHS[(hijriHeader.month.number ?? 1) - 1] ?? hijriHeader.month.ar} {hijriHeader.year} هـ
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={prev} className="p-2 rounded-full bg-white/8 hover:bg-white/15"><ChevronRight size={16} /></button>
        <div className="font-semibold text-sm text-center">{MONTH_NAMES[viewMonth - 1]} {viewYear}</div>
        <button type="button" onClick={next} className="p-2 rounded-full bg-white/8 hover:bg-white/15"><ChevronLeft size={16} /></button>
      </div>

      {isLoading && <div className="text-sm opacity-50">جارٍ التحميل...</div>}
      {(error || (!isLoading && !data)) && <div className="text-sm opacity-50">تعذر تحميل التقويم</div>}

      {calendarGrid && (
        <>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {["س","ح","إث","ث","أر","خ","ج"].map((d) => (
              <div key={d} className="text-[10px] opacity-40 py-1 font-semibold">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: calendarGrid.blanks }, (_, i) => <div key={`blank-${i}`} />)}
            {calendarGrid.days.map((day, i) => {
              const dayNum     = Number(day.date.gregorian.day);
              const isToday    = isCurrentMonth && dayNum === todayDay;
              const hijriDay   = Number(day.date.hijri.day);
              const hijriMonth = day.date.hijri.month.number;
              const events     = ISLAMIC_EVENTS[hijriMonth]?.[hijriDay] ?? [];
              const hasEvent   = events.length > 0;
              const isFriday   = day.date.gregorian.weekday.en === "Friday";

              return (
                <div key={i} title={hasEvent ? events.join("، ") : undefined}
                  className={cn(
                    "rounded-xl p-1 min-h-[52px] flex flex-col items-center gap-0.5 text-center relative",
                    isToday    && "bg-[var(--accent)]/20 ring-1 ring-[var(--accent)]/40",
                    hasEvent   && !isToday && "bg-[#ffd27d]/8 ring-1 ring-[#ffd27d]/25",
                    isFriday   && !isToday && !hasEvent && "bg-white/4"
                  )}>
                  <div className={cn("text-sm font-bold leading-tight",
                    isToday && "text-[var(--accent)]", isFriday && !isToday && "text-[#90d8ff]")}>
                    {day.date.gregorian.day}
                  </div>
                  <div className="text-[9px] opacity-40 leading-tight">{day.date.hijri.day}</div>
                  {hasEvent && <div className="w-1.5 h-1.5 rounded-full bg-[#ffd27d] mt-0.5" />}
                </div>
              );
            })}
          </div>

          {/* Upcoming events (P12) */}
          {(() => {
            const upcoming: { date: string; hijriLabel: string; events: string[] }[] = [];
            for (const day of calendarGrid.days) {
              const hijriDay   = Number(day.date.hijri.day);
              const hijriMonth = day.date.hijri.month.number;
              const dayNum     = Number(day.date.gregorian.day);
              const events     = ISLAMIC_EVENTS[hijriMonth]?.[hijriDay] ?? [];
              if (events.length > 0 && (!isCurrentMonth || dayNum >= todayDay)) {
                upcoming.push({
                  date: `${day.date.gregorian.day}/${day.date.gregorian.month.number}`,
                  hijriLabel: `${day.date.hijri.day} ${HIJRI_MONTHS[(day.date.hijri.month.number - 1)] ?? day.date.hijri.month.ar}`,
                  events,
                });
              }
            }
            if (upcoming.length === 0) return null;
            return (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-semibold opacity-60 uppercase tracking-wide">المناسبات القادمة</div>
                {upcoming.map((ev, i) => (
                  <div key={i} className="rounded-xl bg-[#ffd27d]/8 border border-[#ffd27d]/20 px-3 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="text-[10px] bg-[#ffd27d]/15 border-[#ffd27d]/25 text-[#ffd27d]">{ev.hijriLabel}</Badge>
                      <span className="text-[10px] opacity-50">{ev.date}</span>
                    </div>
                    {ev.events.map((e, j) => <div key={j} className="text-sm mt-1">{e}</div>)}
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ─── CitiesTab (P2) ───────────────────────────────────────────────────────────

function CitiesTab() {
  const favoriteCities    = useNoorStore((s) => s.favoriteCities);
  const addFavoriteCity   = useNoorStore((s) => s.addFavoriteCity);
  const removeFavoriteCity = useNoorStore((s) => s.removeFavoriteCity);
  const [showAdd, setShowAdd]         = React.useState(false);
  const [cityInput,    setCityInput]   = React.useState("");
  const [countryInput, setCountryInput] = React.useState("");
  const [labelInput,   setLabelInput]  = React.useState("");

  const handleAdd = () => {
    const city    = cityInput.trim();
    const country = countryInput.trim();
    const label   = labelInput.trim() || city;
    if (!city || !country) { toast.error("أدخل اسم المدينة والدولة"); return; }
    addFavoriteCity({ id: `${city}:${country}:${Date.now()}`, city, country, label });
    setCityInput(""); setCountryInput(""); setLabelInput(""); setShowAdd(false);
    toast.success("تمت إضافة المدينة");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold opacity-60 uppercase tracking-wide">{favoriteCities.length} مدن محفوظة</div>
        <Button variant="secondary" size="sm" onClick={() => setShowAdd((v) => !v)}>
          <Plus size={13} /> إضافة مدينة
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3">
          <div className="text-sm font-semibold">إضافة مدينة جديدة</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs opacity-50 mb-1">اسم المدينة</div>
              <input value={cityInput} onChange={(e) => setCityInput(e.target.value)} placeholder="Cairo"
                className="w-full rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]/50" />
            </div>
            <div>
              <div className="text-xs opacity-50 mb-1">الدولة</div>
              <input value={countryInput} onChange={(e) => setCountryInput(e.target.value)} placeholder="Egypt"
                className="w-full rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]/50" />
            </div>
          </div>
          <div>
            <div className="text-xs opacity-50 mb-1">الاسم المعروض (اختياري)</div>
            <input value={labelInput} onChange={(e) => setLabelInput(e.target.value)} placeholder="القاهرة"
              className="w-full rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]/50" />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleAdd}>حفظ</Button>
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>إلغاء</Button>
          </div>
          <div>
            <div className="text-xs opacity-40 mb-2">اختيار سريع</div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_CITIES.map((c) => (
                <button key={c.city} type="button"
                  onClick={() => { addFavoriteCity({ id: `${c.city}:${c.country}`, city: c.city, country: c.country, label: c.label }); toast.success(`تمت إضافة ${c.label}`); }}
                  disabled={favoriteCities.some((f) => f.city === c.city && f.country === c.country)}
                  className="text-xs rounded-full border border-white/15 bg-white/5 px-2.5 py-1 hover:bg-white/12 disabled:opacity-30 disabled:cursor-not-allowed">
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {favoriteCities.length === 0 && !showAdd && (
        <div className="text-sm opacity-50 text-center py-8">أضف مدناً لمقارنة مواقيت الصلاة</div>
      )}

      <div className="space-y-3">
        {favoriteCities.map((c) => (
          <CityRow key={c.id} city={c.city} country={c.country} label={c.label} onRemove={() => removeFavoriteCity(c.id)} />
        ))}
      </div>
    </div>
  );
}

// ─── PrayerTimesPage ──────────────────────────────────────────────────────────

export function PrayerTimesPage() {
  const navigate       = useNavigate();
  const prayerTimes    = usePrayerTimes();
  const reminders      = useNoorStore((s) => s.reminders);
  const [now, setNow]  = React.useState(() => new Date());
  const [manualRefreshing, setManualRefreshing] = React.useState(false);
  const [activeTab,    setActiveTab]    = React.useState<TabKey>("today");
  const [showSettings, setShowSettings] = React.useState(false);

  async function refreshPrayerTimes() {
    setManualRefreshing(true);
    try {
      const result = await prayerTimes.refetch();
      if (result.error || !result.data?.data?.timings) throw result.error ?? new Error("refresh failed");
      const rt = result.data.data.timings;
      await syncReminders(reminders, { Fajr: rt.Fajr, Dhuhr: rt.Dhuhr, Asr: rt.Asr, Maghrib: rt.Maghrib, Isha: rt.Isha });
      toast.success("تم تحديث مواقيت الصلاة");
    } catch { toast.error("تعذر تحديث المواقيت الآن"); }
    finally { setManualRefreshing(false); }
  }

  // De2: Pull-to-refresh
  const { isPulling, isRefreshing } = usePullToRefresh({
    onRefresh: refreshPrayerTimes,
    enabled: true,
  });

  React.useEffect(() => {
    const id = globalThis.setInterval(() => setNow(new Date()), 30_000);
    return () => globalThis.clearInterval(id);
  }, []);

  const data     = prayerTimes.data;
  const timings  = data?.data?.timings;
  const date     = data?.data?.date;
  const schedule = React.useMemo(() => (timings ? buildPrayerSchedule(timings, now) : null), [now, timings]);

  const iqamaOffsets = reminders.iqamaOffsets ?? { Fajr: 20, Dhuhr: 15, Asr: 15, Maghrib: 10, Isha: 15 };

  if (prayerTimes.isLoading) return (
    <div className="p-4 md:p-5 space-y-4 page-enter">
      <PrayerTimesPageSkeleton />
    </div>
  );

  if (prayerTimes.error || !data || !timings || !date || !schedule) {
    return (
      <div className="p-4">
        <Card className="p-5 text-sm">
          <div className="opacity-70">تعذر تحميل صفحة مواقيت الصلاة حاليًا.</div>
          <Button className="mt-4" variant="secondary" onClick={() => void refreshPrayerTimes()} disabled={manualRefreshing || prayerTimes.isFetching}>
            <RefreshCw size={15} className={manualRefreshing || prayerTimes.isFetching ? "animate-spin" : ""} />
            تحديث المواقيت
          </Button>
        </Card>
      </div>
    );
  }

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "today",   label: "اليوم",   icon: Clock3 },
    { key: "weekly",  label: "أسبوعي", icon: CalendarDays },
    { key: "monthly", label: "شهري",   icon: CalendarDays },
    { key: "track",   label: "تتبع",   icon: Check },
    { key: "hijri",   label: "هجري",   icon: MoonStar },
    { key: "cities",  label: "مدن",    icon: Globe },
  ];

  return (
    <div className="p-4 md:p-5 space-y-4 page-enter">
      <PTRIndicator isPulling={isPulling} isRefreshing={isRefreshing} />
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xl font-bold">مواقيت الصلاة</div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => navigate("/qibla")}>
            <Compass size={14} /> القبلة
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowSettings(true)}>
            <Settings2 size={14} /> إعدادات
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void refreshPrayerTimes()} disabled={manualRefreshing || prayerTimes.isFetching}>
            <RefreshCw size={15} className={manualRefreshing || prayerTimes.isFetching ? "animate-spin" : ""} />
            تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowRight size={15} /> رجوع
          </Button>
        </div>
      </div>

      {/* Dates card */}
      <Card className="p-4 overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ background: "radial-gradient(circle at top right, var(--accent), transparent 55%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <Badge className="text-[11px]">{date.readable}</Badge>
            <Badge className="text-[11px]">{date.hijri.date} {date.hijri.month.ar}</Badge>
            {data.__sourceLabel && <Badge className="text-[11px] opacity-60">{data.__sourceLabel}</Badge>}
          </div>
          <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/8 to-white/3 p-4 md:p-5">
            <PrayerCountdown timings={timings} />
          </div>
          {data.__fromCache && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] opacity-60">
              <TimerReset size={12} /> يتم عرض آخر نسخة محفوظة بدون اتصال.
            </div>
          )}
        </div>
      </Card>

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition",
              activeTab === tab.key
                ? "bg-[var(--accent)]/15 border border-[var(--accent)]/35 text-white font-medium"
                : "bg-white/6 border border-white/10 opacity-60 hover:opacity-80"
            )}>
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <Card className="p-5">
        {/* TODAY */}
        {activeTab === "today" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold">تفاصيل اليوم</div>
              <div className="text-[10px] opacity-40">الإقامة بعد الأذان بالدقائق المحددة</div>
            </div>
            {schedule.detailRows.map((row) => {
              const Icon = rowIcon(row);
              const isActive = row.id === schedule.currentPhase.id
                || (schedule.currentPhase.type === "prayer" && row.prayerName === schedule.current.name);
              const isNext   = row.id === schedule.nextPhase.id
                || (schedule.nextPhase.type === "prayer" && row.prayerName === schedule.next.name);
              const offset     = row.prayerName ? (iqamaOffsets[row.prayerName] ?? 15) : null;
              const showIqama  = row.type === "prayer" && row.prayerName && offset != null;
              return (
                <div key={row.id}
                  className={cn("rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 transition", rowStyles(row, isActive, isNext))}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-black/10 grid place-items-center shrink-0">
                      <Icon size={18} className="opacity-80" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-semibold">{row.label}</div>
                        {isActive && <Badge className="text-[10px] bg-[var(--accent)]/16 border-[var(--accent)]/20 text-white">الآن</Badge>}
                        {!isActive && isNext && <Badge className="text-[10px]">التالي</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div dir="ltr" className="text-sm font-medium tabular-nums text-left">{row.timeLabel}</div>
                    {showIqama && row.prayerName && (
                      <IqamaTime prayerTime={timings[row.prayerName] ?? ""} offset={iqamaOffsets[row.prayerName] ?? 15} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* WEEKLY */}
        {activeTab === "weekly" && (
          <div>
            <div className="text-sm font-semibold mb-4">جدول الأسبوع القادم</div>
            <WeeklyTab />
          </div>
        )}

        {/* MONTHLY */}
        {activeTab === "monthly" && (
          <div>
            <div className="text-sm font-semibold mb-4">التقويم الشهري للمواقيت</div>
            <MonthlyTab />
          </div>
        )}

        {/* TRACKING */}
        {activeTab === "track" && <TrackingTab timings={timings} />}

        {/* HIJRI */}
        {activeTab === "hijri" && (
          <div>
            <div className="text-sm font-semibold mb-4">التقويم الهجري والمناسبات الإسلامية</div>
            <HijriCalendarTab />
          </div>
        )}

        {/* CITIES */}
        {activeTab === "cities" && (
          <div>
            <div className="text-sm font-semibold mb-4">مواقيت الصلاة في مدن أخرى</div>
            <CitiesTab />
          </div>
        )}
      </Card>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}