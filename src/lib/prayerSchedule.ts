import { clamp } from "@/lib/utils";

export type PrimaryPrayerName = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
export type PrayerTimingName = PrimaryPrayerName | "Sunrise";

export type PrayerTimings = Record<PrayerTimingName, string>;

export type ComputedPrayer = {
  name: PrimaryPrayerName;
  label: string;
  time: string;
  timeLabel: string;
  minutes: number;
  at: Date;
};

export type PrayerExtraMoment = {
  id: string;
  label: string;
  value: string;
  minutes: number | null;
};

export type ForbiddenWindow = {
  id: string;
  label: string;
  value: string;
  startMinutes: number | null;
  endMinutes: number | null;
};

export type PrayerDetailRow = {
  id: string;
  type: "prayer" | "moment" | "forbidden" | "marker";
  label: string;
  timeLabel: string;
  prayerName?: PrimaryPrayerName;
};

export type PrayerScheduleModel = {
  primary: ComputedPrayer[];
  current: ComputedPrayer;
  next: ComputedPrayer;
  diffSec: number;
  progress: number;
  extraMoments: PrayerExtraMoment[];
  forbiddenWindows: ForbiddenWindow[];
  detailRows: PrayerDetailRow[];
  islamicMidnightLabel: string;
};

const PRIMARY_PRAYER_ORDER: PrimaryPrayerName[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

export const PRAYER_LABELS: Record<PrayerTimingName, string> = {
  Fajr: "الفجر",
  Sunrise: "الشروق",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

export function parseClockToMinutes(raw: string) {
  const clean = String(raw ?? "").trim().split(" ")[0] ?? "";
  const [hours, minutes] = clean.split(":").map((value) => Number.parseInt(value, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

export function formatMinutes12h(totalMinutes: number) {
  const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(wrapped / 60);
  const mm = wrapped % 60;
  const date = new Date(2000, 0, 1, hh, mm);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function format12h(raw: string) {
  const minutes = parseClockToMinutes(raw);
  if (minutes == null) {
    return String(raw ?? "").trim().split(" ")[0] ?? String(raw ?? "");
  }
  return formatMinutes12h(minutes);
}

export function formatCountdown(diffSec: number) {
  if (diffSec <= 0) return "الآن";
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatRemainingText(diffSec: number) {
  if (diffSec <= 0) return "الآن";

  const totalMinutes = Math.max(1, Math.ceil(diffSec / 60));
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) {
      return `${hours} ساعة تقريبًا`;
    }
    return `${hours} س ${minutes} د تقريبًا`;
  }

  return `${totalMinutes} دقيقة تقريبًا`;
}

function formatRange(startMinutes: number | null, endMinutes: number | null) {
  if (startMinutes == null && endMinutes == null) return "—";
  if (startMinutes == null) return formatMinutes12h(endMinutes!);
  if (endMinutes == null || startMinutes === endMinutes) return formatMinutes12h(startMinutes);
  return `${formatMinutes12h(startMinutes)} - ${formatMinutes12h(endMinutes)}`;
}

function buildPrimaryPrayer(name: PrimaryPrayerName, time: string, dayStart: Date): ComputedPrayer | null {
  const minutes = parseClockToMinutes(time);
  if (minutes == null) return null;

  const at = new Date(dayStart);
  at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return {
    name,
    label: PRAYER_LABELS[name],
    time,
    timeLabel: format12h(time),
    minutes,
    at,
  };
}

export function buildPrayerSchedule(timings: PrayerTimings, now = new Date()): PrayerScheduleModel | null {
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const primary = PRIMARY_PRAYER_ORDER
    .map((name) => buildPrimaryPrayer(name, timings[name], dayStart))
    .filter((value): value is ComputedPrayer => !!value)
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  if (!primary.length) return null;

  let next = primary.find((prayer) => prayer.at.getTime() > now.getTime());
  if (!next) {
    const tomorrow = new Date(primary[0].at);
    tomorrow.setDate(tomorrow.getDate() + 1);
    next = { ...primary[0], at: tomorrow };
  }

  let current = [...primary].reverse().find((prayer) => prayer.at.getTime() <= now.getTime());
  if (!current) {
    const yesterday = new Date(primary[primary.length - 1].at);
    yesterday.setDate(yesterday.getDate() - 1);
    current = { ...primary[primary.length - 1], at: yesterday };
  }

  const diffSec = Math.max(0, Math.round((next.at.getTime() - now.getTime()) / 1000));
  const totalSpanMs = Math.max(1, next.at.getTime() - current.at.getTime());
  const progress = clamp((now.getTime() - current.at.getTime()) / totalSpanMs, 0, 1);

  const fajrMinutes = parseClockToMinutes(timings.Fajr);
  const sunriseMinutes = parseClockToMinutes(timings.Sunrise);
  const dhuhrMinutes = parseClockToMinutes(timings.Dhuhr);
  const asrMinutes = parseClockToMinutes(timings.Asr);
  const maghribMinutes = parseClockToMinutes(timings.Maghrib);
  const ishaMinutes = parseClockToMinutes(timings.Isha);

  const sunriseForbiddenEnd = sunriseMinutes != null ? sunriseMinutes + 15 : null;
  const duhaStart = sunriseMinutes != null ? sunriseMinutes + 16 : null;
  const zenithForbiddenStart = dhuhrMinutes != null ? dhuhrMinutes - 10 : null;
  const sunsetForbiddenStart = maghribMinutes != null ? maghribMinutes - 15 : null;

  const nightDurationMinutes =
    maghribMinutes != null && fajrMinutes != null
      ? (fajrMinutes + 1440) - maghribMinutes
      : null;
  const islamicMidnightMinutes =
    maghribMinutes != null && nightDurationMinutes != null
      ? maghribMinutes + (nightDurationMinutes / 2)
      : null;
  const tahajjudStart =
    maghribMinutes != null && nightDurationMinutes != null
      ? maghribMinutes + ((nightDurationMinutes * 2) / 3)
      : null;

  const extraMoments: PrayerExtraMoment[] = [
    { id: "sunrise", label: "الشروق", value: format12h(timings.Sunrise), minutes: sunriseMinutes },
    { id: "duha", label: "الضحى", value: formatRange(duhaStart, zenithForbiddenStart != null ? zenithForbiddenStart - 1 : null), minutes: duhaStart },
    { id: "midnight", label: "منتصف الليل الشرعي", value: formatRange(islamicMidnightMinutes, null), minutes: islamicMidnightMinutes },
    { id: "tahajjud", label: "التهجد", value: formatRange(tahajjudStart, fajrMinutes != null ? (fajrMinutes + 1439) : null), minutes: tahajjudStart },
  ];

  const forbiddenWindows: ForbiddenWindow[] = [
    {
      id: "after-fajr",
      label: "بعد الفجر",
      value: formatRange(fajrMinutes, sunriseMinutes != null ? sunriseMinutes - 1 : null),
      startMinutes: fajrMinutes,
      endMinutes: sunriseMinutes != null ? sunriseMinutes - 1 : null,
    },
    {
      id: "zenith",
      label: "وقت الاستواء",
      value: formatRange(zenithForbiddenStart, dhuhrMinutes),
      startMinutes: zenithForbiddenStart,
      endMinutes: dhuhrMinutes,
    },
    {
      id: "before-maghrib",
      label: "قبل الغروب",
      value: formatRange(sunsetForbiddenStart, maghribMinutes),
      startMinutes: sunsetForbiddenStart,
      endMinutes: maghribMinutes,
    },
  ];

  const detailRows: PrayerDetailRow[] = [
    {
      id: "fajr",
      type: "prayer",
      label: PRAYER_LABELS.Fajr,
      timeLabel: formatRange(fajrMinutes, sunriseMinutes != null ? sunriseMinutes - 1 : null),
      prayerName: "Fajr",
    },
    { id: "sunrise", type: "marker", label: PRAYER_LABELS.Sunrise, timeLabel: format12h(timings.Sunrise) },
    {
      id: "forbidden-sunrise",
      type: "forbidden",
      label: "وقت نهي",
      timeLabel: formatRange(sunriseMinutes, sunriseForbiddenEnd),
    },
    {
      id: "duha",
      type: "moment",
      label: "صلاة الضحى",
      timeLabel: formatRange(duhaStart, zenithForbiddenStart != null ? zenithForbiddenStart - 1 : null),
    },
    {
      id: "forbidden-zenith",
      type: "forbidden",
      label: "وقت نهي",
      timeLabel: formatRange(zenithForbiddenStart, dhuhrMinutes),
    },
    {
      id: "dhuhr",
      type: "prayer",
      label: PRAYER_LABELS.Dhuhr,
      timeLabel: formatRange(dhuhrMinutes, asrMinutes != null ? asrMinutes - 1 : null),
      prayerName: "Dhuhr",
    },
    {
      id: "asr",
      type: "prayer",
      label: PRAYER_LABELS.Asr,
      timeLabel: formatRange(asrMinutes, sunsetForbiddenStart != null ? sunsetForbiddenStart - 1 : null),
      prayerName: "Asr",
    },
    {
      id: "forbidden-sunset",
      type: "forbidden",
      label: "وقت نهي",
      timeLabel: formatRange(sunsetForbiddenStart, maghribMinutes),
    },
    { id: "sunset", type: "marker", label: "الغروب", timeLabel: format12h(timings.Maghrib) },
    {
      id: "maghrib",
      type: "prayer",
      label: PRAYER_LABELS.Maghrib,
      timeLabel: formatRange(maghribMinutes, ishaMinutes != null ? ishaMinutes - 1 : null),
      prayerName: "Maghrib",
    },
    {
      id: "isha",
      type: "prayer",
      label: PRAYER_LABELS.Isha,
      timeLabel: formatRange(ishaMinutes, islamicMidnightMinutes),
      prayerName: "Isha",
    },
    {
      id: "tahajjud",
      type: "moment",
      label: "التهجد",
      timeLabel: formatRange(tahajjudStart, fajrMinutes != null ? (fajrMinutes + 1439) : null),
    },
  ];

  return {
    primary,
    current,
    next,
    diffSec,
    progress,
    extraMoments,
    forbiddenWindows,
    detailRows,
    islamicMidnightLabel: formatRange(islamicMidnightMinutes, null),
  };
}