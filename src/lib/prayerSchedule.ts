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

export type PrayerPhase = {
  id: string;
  type: "prayer" | "moment" | "forbidden" | "wait";
  label: string;
  subtitle: string;
  value: string;
  startMinutes: number;
  endMinutes: number;
  startAt: Date;
  endAt: Date;
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
  phases: PrayerPhase[];
  currentPhase: PrayerPhase;
  nextPhase: PrayerPhase;
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
  const displayHour = hh % 12 || 12;
  const period = hh < 12 ? "ص" : "م";
  return `\u200E${displayHour}:${String(mm).padStart(2, "0")} ${period}\u200E`;
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
  if (startMinutes == null) {
    if (endMinutes == null) return "—";
    return formatMinutes12h(endMinutes);
  }
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

function toTimelineDate(dayStart: Date, totalMinutes: number) {
  return new Date(dayStart.getTime() + (totalMinutes * 60_000));
}

function buildPhase(options: {
  id: string;
  type: PrayerPhase["type"];
  label: string;
  subtitle: string;
  value: string;
  startMinutes: number | null;
  endMinutes: number | null;
  dayStart: Date;
}) {
  if (options.startMinutes == null || options.endMinutes == null) return null;
  if (options.endMinutes <= options.startMinutes) return null;

  return {
    id: options.id,
    type: options.type,
    label: options.label,
    subtitle: options.subtitle,
    value: options.value,
    startMinutes: options.startMinutes,
    endMinutes: options.endMinutes,
    startAt: toTimelineDate(options.dayStart, options.startMinutes),
    endAt: toTimelineDate(options.dayStart, options.endMinutes),
  } satisfies PrayerPhase;
}

type PrayerMinuteContext = {
  dayStart: Date;
  fajrMinutes: number | null;
  sunriseMinutes: number | null;
  dhuhrMinutes: number | null;
  asrMinutes: number | null;
  maghribMinutes: number | null;
  ishaMinutes: number | null;
  sunriseForbiddenEnd: number | null;
  duhaStart: number | null;
  zenithForbiddenStart: number | null;
  sunsetForbiddenStart: number | null;
  islamicMidnightMinutes: number | null;
  tahajjudStart: number | null;
  nextDayFajrMinutes: number | null;
};

type PrayerPhaseContext = {
  fajrMinutes: number | null;
  sunriseMinutes: number | null;
  duhaStart: number | null;
  zenithForbiddenStart: number | null;
  dhuhrMinutes: number | null;
  asrMinutes: number | null;
  sunsetForbiddenStart: number | null;
  maghribMinutes: number | null;
  ishaMinutes: number | null;
  islamicMidnightMinutes: number | null;
  tahajjudStart: number | null;
  phaseFajrBoundary: number | null;
};

function offsetMinutes(base: number | null, delta: number) {
  if (base == null) return null;
  return base + delta;
}

function beforeMinute(base: number | null) {
  if (base == null) return null;
  return base - 1;
}

function computeNightDuration(maghribMinutes: number | null, fajrMinutes: number | null) {
  if (maghribMinutes == null || fajrMinutes == null) return null;
  return (fajrMinutes + 1440) - maghribMinutes;
}

function buildMinuteContext(timings: PrayerTimings, dayStart: Date): PrayerMinuteContext {
  const fajrMinutes = parseClockToMinutes(timings.Fajr);
  const sunriseMinutes = parseClockToMinutes(timings.Sunrise);
  const dhuhrMinutes = parseClockToMinutes(timings.Dhuhr);
  const asrMinutes = parseClockToMinutes(timings.Asr);
  const maghribMinutes = parseClockToMinutes(timings.Maghrib);
  const ishaMinutes = parseClockToMinutes(timings.Isha);
  const sunriseForbiddenEnd = offsetMinutes(sunriseMinutes, 15);
  const duhaStart = offsetMinutes(sunriseMinutes, 16);
  const zenithForbiddenStart = offsetMinutes(dhuhrMinutes, -10);
  const sunsetForbiddenStart = offsetMinutes(maghribMinutes, -15);
  const nightDurationMinutes = computeNightDuration(maghribMinutes, fajrMinutes);
  const islamicMidnightMinutes =
    maghribMinutes == null || nightDurationMinutes == null
      ? null
      : maghribMinutes + (nightDurationMinutes / 2);
  const tahajjudStart =
    maghribMinutes == null || nightDurationMinutes == null
      ? null
      : maghribMinutes + ((nightDurationMinutes * 2) / 3);

  return {
    dayStart,
    fajrMinutes,
    sunriseMinutes,
    dhuhrMinutes,
    asrMinutes,
    maghribMinutes,
    ishaMinutes,
    sunriseForbiddenEnd,
    duhaStart,
    zenithForbiddenStart,
    sunsetForbiddenStart,
    islamicMidnightMinutes,
    tahajjudStart,
    nextDayFajrMinutes: offsetMinutes(fajrMinutes, 1440),
  };
}

function buildExtraMoments(timings: PrayerTimings, context: PrayerMinuteContext): PrayerExtraMoment[] {
  return [
    {
      id: "sunrise",
      label: "الشروق",
      value: format12h(timings.Sunrise),
      minutes: context.sunriseMinutes,
    },
    {
      id: "duha",
      label: "الضحى",
      value: formatRange(context.duhaStart, beforeMinute(context.zenithForbiddenStart)),
      minutes: context.duhaStart,
    },
    {
      id: "midnight",
      label: "منتصف الليل الشرعي",
      value: formatRange(context.islamicMidnightMinutes, null),
      minutes: context.islamicMidnightMinutes,
    },
    {
      id: "tahajjud",
      label: "التهجد",
      value: formatRange(context.tahajjudStart, beforeMinute(context.nextDayFajrMinutes)),
      minutes: context.tahajjudStart,
    },
  ];
}

function buildForbiddenWindows(context: PrayerMinuteContext): ForbiddenWindow[] {
  return [
    {
      id: "after-fajr",
      label: "بعد الفجر",
      value: formatRange(context.fajrMinutes, beforeMinute(context.sunriseMinutes)),
      startMinutes: context.fajrMinutes,
      endMinutes: beforeMinute(context.sunriseMinutes),
    },
    {
      id: "zenith",
      label: "وقت الاستواء",
      value: formatRange(context.zenithForbiddenStart, context.dhuhrMinutes),
      startMinutes: context.zenithForbiddenStart,
      endMinutes: context.dhuhrMinutes,
    },
    {
      id: "before-maghrib",
      label: "قبل الغروب",
      value: formatRange(context.sunsetForbiddenStart, context.maghribMinutes),
      startMinutes: context.sunsetForbiddenStart,
      endMinutes: context.maghribMinutes,
    },
  ];
}

function buildDetailRows(timings: PrayerTimings, context: PrayerMinuteContext): PrayerDetailRow[] {
  return [
    {
      id: "fajr",
      type: "prayer",
      label: PRAYER_LABELS.Fajr,
      timeLabel: formatRange(context.fajrMinutes, beforeMinute(context.sunriseMinutes)),
      prayerName: "Fajr",
    },
    { id: "sunrise", type: "marker", label: PRAYER_LABELS.Sunrise, timeLabel: format12h(timings.Sunrise) },
    {
      id: "forbidden-sunrise",
      type: "forbidden",
      label: "وقت نهي",
      timeLabel: formatRange(context.sunriseMinutes, context.sunriseForbiddenEnd),
    },
    {
      id: "duha",
      type: "moment",
      label: "صلاة الضحى",
      timeLabel: formatRange(context.duhaStart, beforeMinute(context.zenithForbiddenStart)),
    },
    {
      id: "forbidden-zenith",
      type: "forbidden",
      label: "وقت نهي",
      timeLabel: formatRange(context.zenithForbiddenStart, context.dhuhrMinutes),
    },
    {
      id: "dhuhr",
      type: "prayer",
      label: PRAYER_LABELS.Dhuhr,
      timeLabel: formatRange(context.dhuhrMinutes, beforeMinute(context.asrMinutes)),
      prayerName: "Dhuhr",
    },
    {
      id: "asr",
      type: "prayer",
      label: PRAYER_LABELS.Asr,
      timeLabel: formatRange(context.asrMinutes, beforeMinute(context.sunsetForbiddenStart)),
      prayerName: "Asr",
    },
    {
      id: "forbidden-sunset",
      type: "forbidden",
      label: "وقت نهي",
      timeLabel: formatRange(context.sunsetForbiddenStart, context.maghribMinutes),
    },
    { id: "sunset", type: "marker", label: "الغروب", timeLabel: format12h(timings.Maghrib) },
    {
      id: "maghrib",
      type: "prayer",
      label: PRAYER_LABELS.Maghrib,
      timeLabel: formatRange(context.maghribMinutes, beforeMinute(context.ishaMinutes)),
      prayerName: "Maghrib",
    },
    {
      id: "isha",
      type: "prayer",
      label: PRAYER_LABELS.Isha,
      timeLabel: formatRange(context.ishaMinutes, context.islamicMidnightMinutes),
      prayerName: "Isha",
    },
    {
      id: "tahajjud",
      type: "moment",
      label: "التهجد",
      timeLabel: formatRange(context.tahajjudStart, beforeMinute(context.nextDayFajrMinutes)),
    },
  ];
}

function buildPhaseContext(context: PrayerMinuteContext, now: Date): PrayerPhaseContext {
  const clockMinutes = (now.getHours() * 60) + now.getMinutes() + (now.getSeconds() / 60);
  const usePreviousNight = context.fajrMinutes != null && clockMinutes < context.fajrMinutes;
  const nightOffset = usePreviousNight ? -1440 : 0;

  return {
    fajrMinutes: context.fajrMinutes,
    sunriseMinutes: context.sunriseMinutes,
    duhaStart: context.duhaStart,
    zenithForbiddenStart: context.zenithForbiddenStart,
    dhuhrMinutes: context.dhuhrMinutes,
    asrMinutes: context.asrMinutes,
    sunsetForbiddenStart: context.sunsetForbiddenStart,
    maghribMinutes: offsetMinutes(context.maghribMinutes, nightOffset),
    ishaMinutes: offsetMinutes(context.ishaMinutes, nightOffset),
    islamicMidnightMinutes: offsetMinutes(context.islamicMidnightMinutes, nightOffset),
    tahajjudStart: offsetMinutes(context.tahajjudStart, nightOffset),
    phaseFajrBoundary: usePreviousNight ? context.fajrMinutes : context.nextDayFajrMinutes,
  };
}

function buildPhases(context: PrayerMinuteContext, now: Date): PrayerPhase[] {
  const phaseContext = buildPhaseContext(context, now);

  return [
    buildPhase({
      id: "fajr",
      type: "prayer",
      label: PRAYER_LABELS.Fajr,
      subtitle: "",
      value: formatRange(phaseContext.fajrMinutes, beforeMinute(phaseContext.sunriseMinutes)),
      startMinutes: phaseContext.fajrMinutes,
      endMinutes: phaseContext.sunriseMinutes,
      dayStart: context.dayStart,
    }),
    buildPhase({
      id: "forbidden-sunrise",
      type: "forbidden",
      label: "بعد الفجر",
      subtitle: "",
      value: formatRange(phaseContext.sunriseMinutes, beforeMinute(phaseContext.duhaStart)),
      startMinutes: phaseContext.sunriseMinutes,
      endMinutes: phaseContext.duhaStart,
      dayStart: context.dayStart,
    }),
    buildPhase({
      id: "duha",
      type: "moment",
      label: "الضحى",
      subtitle: "",
      value: formatRange(phaseContext.duhaStart, beforeMinute(phaseContext.zenithForbiddenStart)),
      startMinutes: phaseContext.duhaStart,
      endMinutes: phaseContext.zenithForbiddenStart,
      dayStart: context.dayStart,
    }),
    buildPhase({
      id: "forbidden-zenith",
      type: "forbidden",
      label: "وقت الاستواء",
      subtitle: "",
      value: formatRange(phaseContext.zenithForbiddenStart, phaseContext.dhuhrMinutes),
      startMinutes: phaseContext.zenithForbiddenStart,
      endMinutes: phaseContext.dhuhrMinutes,
      dayStart: context.dayStart,
    }),
    buildPhase({
      id: "dhuhr",
      type: "prayer",
      label: PRAYER_LABELS.Dhuhr,
      subtitle: "",
      value: formatRange(phaseContext.dhuhrMinutes, beforeMinute(phaseContext.asrMinutes)),
      startMinutes: phaseContext.dhuhrMinutes,
      endMinutes: phaseContext.asrMinutes,
      dayStart: context.dayStart,
    }),
    buildPhase({
      id: "asr",
      type: "prayer",
      label: PRAYER_LABELS.Asr,
      subtitle: "",
      value: formatRange(phaseContext.asrMinutes, beforeMinute(phaseContext.sunsetForbiddenStart)),
      startMinutes: phaseContext.asrMinutes,
      endMinutes: phaseContext.sunsetForbiddenStart,
      dayStart: context.dayStart,
    }),
    buildPhase({
      id: "forbidden-sunset",
      type: "forbidden",
      label: "قبل الغروب",
      subtitle: "",
      value: formatRange(phaseContext.sunsetForbiddenStart, phaseContext.maghribMinutes),
      startMinutes: phaseContext.sunsetForbiddenStart,
      endMinutes: phaseContext.maghribMinutes,
      dayStart: context.dayStart,
    }),
    buildPhase({
      id: "maghrib",
      type: "prayer",
      label: PRAYER_LABELS.Maghrib,
      subtitle: "",
      value: formatRange(phaseContext.maghribMinutes, beforeMinute(phaseContext.ishaMinutes)),
      startMinutes: phaseContext.maghribMinutes,
      endMinutes: phaseContext.ishaMinutes,
      dayStart: context.dayStart,
    }),
    buildPhase({
      id: "isha",
      type: "prayer",
      label: PRAYER_LABELS.Isha,
      subtitle: "",
      value: formatRange(phaseContext.ishaMinutes, phaseContext.islamicMidnightMinutes),
      startMinutes: phaseContext.ishaMinutes,
      endMinutes: phaseContext.islamicMidnightMinutes,
      dayStart: context.dayStart,
    }),
    buildPhase({
      id: "wait-tahajjud",
      type: "wait",
      label: "انتظار التهجد",
      subtitle: "",
      value: formatRange(phaseContext.islamicMidnightMinutes, beforeMinute(phaseContext.tahajjudStart)),
      startMinutes: phaseContext.islamicMidnightMinutes,
      endMinutes: phaseContext.tahajjudStart,
      dayStart: context.dayStart,
    }),
    buildPhase({
      id: "tahajjud",
      type: "moment",
      label: "التهجد",
      subtitle: "",
      value: formatRange(phaseContext.tahajjudStart, beforeMinute(phaseContext.phaseFajrBoundary)),
      startMinutes: phaseContext.tahajjudStart,
      endMinutes: phaseContext.phaseFajrBoundary,
      dayStart: context.dayStart,
    }),
  ].filter((value): value is PrayerPhase => !!value);
}

function buildPrimaryFallbackPhase(prayer: ComputedPrayer, endAt: Date): PrayerPhase {
  return {
    id: prayer.name.toLowerCase(),
    type: "prayer",
    label: prayer.label,
    subtitle: "",
    value: prayer.timeLabel,
    startMinutes: prayer.minutes,
    endMinutes: prayer.minutes + 1,
    startAt: prayer.at,
    endAt,
  };
}

function resolvePhaseState(options: {
  phases: PrayerPhase[];
  now: Date;
  fallbackCurrentPhase: PrayerPhase;
  fallbackNextPhase: PrayerPhase;
}) {
  if (!options.phases.length) {
    const fallbackSpan = Math.max(1, options.fallbackCurrentPhase.endAt.getTime() - options.fallbackCurrentPhase.startAt.getTime());
    return {
      currentPhase: options.fallbackCurrentPhase,
      nextPhase: options.fallbackNextPhase,
      diffSec: Math.max(0, Math.round((options.fallbackCurrentPhase.endAt.getTime() - options.now.getTime()) / 1000)),
      progress: clamp((options.now.getTime() - options.fallbackCurrentPhase.startAt.getTime()) / fallbackSpan, 0, 1),
    };
  }

  const clockMinutes = (options.now.getHours() * 60) + options.now.getMinutes() + (options.now.getSeconds() / 60);
  const currentPhaseIndex = options.phases.findIndex((phase) => {
    return clockMinutes >= phase.startMinutes && clockMinutes < phase.endMinutes;
  });
  const resolvedIndex = currentPhaseIndex >= 0 ? currentPhaseIndex : options.phases.length - 1;
  const currentPhase = options.phases[resolvedIndex] ?? options.fallbackCurrentPhase;
  const nextPhase = options.phases[(resolvedIndex + 1) % options.phases.length] ?? options.fallbackNextPhase;
  const totalSpanMs = Math.max(1, currentPhase.endAt.getTime() - currentPhase.startAt.getTime());

  return {
    currentPhase,
    nextPhase,
    diffSec: Math.max(0, Math.round((currentPhase.endAt.getTime() - options.now.getTime()) / 1000)),
    progress: clamp((options.now.getTime() - currentPhase.startAt.getTime()) / totalSpanMs, 0, 1),
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
    const lastPrayer = primary.at(-1);
    if (!lastPrayer) return null;

    const yesterday = new Date(lastPrayer.at);
    yesterday.setDate(yesterday.getDate() - 1);
    current = { ...lastPrayer, at: yesterday };
  }
  const context = buildMinuteContext(timings, dayStart);
  const extraMoments = buildExtraMoments(timings, context);
  const forbiddenWindows = buildForbiddenWindows(context);
  const detailRows = buildDetailRows(timings, context);
  const phases = buildPhases(context, now);
  const fallbackCurrentPhase = buildPrimaryFallbackPhase(current, next.at);
  const fallbackNextPhase = buildPrimaryFallbackPhase(next, new Date(next.at.getTime() + 60_000));
  const { currentPhase, nextPhase, diffSec, progress } = resolvePhaseState({
    phases,
    now,
    fallbackCurrentPhase,
    fallbackNextPhase,
  });

  return {
    primary,
    current,
    next,
    diffSec,
    progress,
    phases,
    currentPhase,
    nextPhase,
    extraMoments,
    forbiddenWindows,
    detailRows,
    islamicMidnightLabel: formatRange(context.islamicMidnightMinutes, null),
  };
}