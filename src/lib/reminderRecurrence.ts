import type { CustomReminder } from "@/data/reminderTypes";
import { gregorianToHijri } from "@/lib/hijri";

export type ReminderAnchor = NonNullable<CustomReminder["anchorKey"]>;
export type PrayerName = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
export type ReminderPrayerTimes = Partial<Record<ReminderAnchor, string>> & Partial<Record<PrayerName, string>>;
export type PrayerTimesSource =
  | ReminderPrayerTimes
  | { timings: ReminderPrayerTimes }
  | { data: { timings: ReminderPrayerTimes } }
  | ((date: Date) => ReminderPrayerTimes | { timings: ReminderPrayerTimes } | { data: { timings: ReminderPrayerTimes } } | null | undefined);

export interface ReminderRecurrenceOptions {
  count?: number;
  now?: Date | number;
  from?: Date | number;
  prayerTimes?: PrayerTimesSource;
  getPrayerTimes?: (date: Date) => ReminderPrayerTimes | { timings: ReminderPrayerTimes } | { data: { timings: ReminderPrayerTimes } } | null | undefined;
}

type FastingPattern =
  | "monday-thursday"
  | "shawwal"
  | "ayyam-al-beed"
  | "arafah"
  | "ashura"
  | "dhul-hijjah"
  | "muharram"
  | "ramadan";

type FastingReminder = CustomReminder & {
  fastingPattern?: FastingPattern;
  fastingRule?: FastingPattern;
  fastingDays?: number[];
};
type RecurrenceArgument = ReminderRecurrenceOptions | number | Date | undefined;

const DEFAULT_COUNT = 10;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const MAX_SEARCH_DAYS = 4_000;
const PRAYER_ANCHORS: ReminderAnchor[] = ["fajr", "dhuhr", "asr", "maghrib", "isha", "sunrise"];

function asDate(value: Date | number | undefined): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value ?? Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function localDay(date: Date, offset = 0): Date {
  const day = new Date(date.getTime());
  day.setHours(0, 0, 0, 0);
  if (offset) day.setDate(day.getDate() + offset);
  return day;
}

function addDays(date: Date, amount: number): Date {
  const day = new Date(date.getTime());
  day.setDate(day.getDate() + amount);
  return day;
}

function parseClock(value: unknown): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function atLocalTime(day: Date, time: string | undefined, offsetMinutes = 0): Date | null {
  const clock = parseClock(time);
  if (!clock) return null;
  const result = localDay(day);
  result.setHours(clock.hour, clock.minute, 0, 0);
  if (Number.isFinite(offsetMinutes)) result.setTime(result.getTime() + Math.trunc(offsetMinutes) * MINUTE_MS);
  return result;
}

function parseISODate(value: string | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const result = new Date(year, month - 1, day);
  if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) return null;
  result.setHours(0, 0, 0, 0);
  return result;
}

function dateBounds(reminder: CustomReminder): { start: number; end: number } | null {
  const startDate = reminder.startDate ? parseISODate(reminder.startDate) : null;
  const endDate = reminder.endDate ? parseISODate(reminder.endDate) : null;
  if (reminder.startDate && !startDate) return null;
  if (reminder.endDate && !endDate) return null;
  return {
    start: startDate?.getTime() ?? Number.NEGATIVE_INFINITY,
    end: endDate ? endDate.getTime() + DAY_MS - 1 : Number.POSITIVE_INFINITY,
  };
}

type PrayerTimesObject = Exclude<PrayerTimesSource, ((date: Date) => unknown) | undefined>;

function unwrapPrayerTimes(source: PrayerTimesObject): ReminderPrayerTimes {
  if ("data" in source) return source.data.timings;
  if ("timings" in source) return source.timings;
  return source;
}

function sourceForDate(source: PrayerTimesSource | undefined, date: Date): ReminderPrayerTimes | null {
  if (!source) return null;
  if (typeof source === "function") {
    const value = source(date);
    return value ? unwrapPrayerTimes(value) : null;
  }
  return unwrapPrayerTimes(source);
}

function readClock(source: ReminderPrayerTimes | null, anchor: ReminderAnchor): string | undefined {
  if (!source) return undefined;
  const capitalized = `${anchor[0]!.toUpperCase()}${anchor.slice(1)}` as PrayerName;
  const aliases: string[] = [anchor, capitalized];
  if (anchor === "sunrise") aliases.push("Sunrise");
  for (const alias of aliases) {
    const value = source[alias as keyof ReminderPrayerTimes];
    if (typeof value === "string" && parseClock(value)) return value;
  }
  return undefined;
}

function prayerTimeForDate(anchor: ReminderAnchor, date: Date, source: PrayerTimesSource | undefined, offsetMinutes = 0): Date | null {
  return atLocalTime(date, readClock(sourceForDate(source, date), anchor), offsetMinutes);
}

function effectivePrayerSource(options: ReminderRecurrenceOptions): PrayerTimesSource | undefined {
  return options.prayerTimes ?? options.getPrayerTimes;
}

function normalizedCount(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_COUNT;
  return Math.max(0, Math.min(MAX_SEARCH_DAYS, Math.floor(value)));
}

function validOffset(value: number | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function addCandidate(values: number[], timestamp: number | null, now: number, bounds: { start: number; end: number }): void {
  if (timestamp === null || !Number.isFinite(timestamp)) return;
  if (timestamp <= now || timestamp < bounds.start || timestamp > bounds.end) return;
  values.push(timestamp);
}

function dayStartForReminder(reminder: CustomReminder, now: Date): Date {
  const startDate = parseISODate(reminder.startDate);
  const today = localDay(now);
  return startDate && startDate.getTime() > today.getTime() ? startDate : today;
}

function scheduleOnce(reminder: CustomReminder, now: Date, bounds: { start: number; end: number }, values: number[]): void {
  const startDate = parseISODate(reminder.startDate) ?? localDay(now);
  const candidate = atLocalTime(startDate, reminder.atTimeOfDay);
  addCandidate(values, candidate?.getTime() ?? null, now.getTime(), bounds);
}

function scheduleDaily(reminder: CustomReminder, now: Date, count: number, bounds: { start: number; end: number }, values: number[]): void {
  const firstDay = dayStartForReminder(reminder, now);
  for (let index = 0; index < MAX_SEARCH_DAYS && values.length < count; index += 1) {
    const candidate = atLocalTime(addDays(firstDay, index), reminder.atTimeOfDay);
    addCandidate(values, candidate?.getTime() ?? null, now.getTime(), bounds);
  }
}

function scheduleWeekly(reminder: CustomReminder, now: Date, count: number, bounds: { start: number; end: number }, values: number[]): void {
  const startDate = parseISODate(reminder.startDate);
  const firstDay = dayStartForReminder(reminder, now);
  const dayOfWeek = reminder.dayOfWeek ?? startDate?.getDay();
  if (typeof dayOfWeek !== "number" || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return;
  for (let index = 0; index < MAX_SEARCH_DAYS && values.length < count; index += 1) {
    const day = addDays(firstDay, index);
    if (day.getDay() !== dayOfWeek) continue;
    const candidate = atLocalTime(day, reminder.atTimeOfDay);
    addCandidate(values, candidate?.getTime() ?? null, now.getTime(), bounds);
  }
}

function scheduleMonthly(reminder: CustomReminder, now: Date, count: number, bounds: { start: number; end: number }, values: number[]): void {
  const startDate = parseISODate(reminder.startDate);
  const dayOfMonth = reminder.dayOfMonth ?? startDate?.getDate();
  if (typeof dayOfMonth !== "number" || !Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) return;
  const firstDay = dayStartForReminder(reminder, now);
  for (let index = 0; index < MAX_SEARCH_DAYS && values.length < count; index += 1) {
    const month = new Date(firstDay.getFullYear(), firstDay.getMonth() + index, 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const day = new Date(month.getFullYear(), month.getMonth(), Math.min(dayOfMonth, lastDay));
    const candidate = atLocalTime(day, reminder.atTimeOfDay);
    addCandidate(values, candidate?.getTime() ?? null, now.getTime(), bounds);
  }
}

function fallbackSunnahCandidate(reminder: CustomReminder, day: Date): Date | null {
  if (!reminder.atTimeOfDay) return null;
  const targetDay = reminder.anchorKey === "tahajjud" ? addDays(day, 1) : day;
  return atLocalTime(targetDay, reminder.atTimeOfDay, validOffset(reminder.anchorOffsetMinutes));
}

function sunnahCandidate(reminder: CustomReminder, nightDate: Date, source: PrayerTimesSource | undefined): Date | null {
  const anchor = reminder.anchorKey;
  const offset = validOffset(reminder.anchorOffsetMinutes);
  if (!anchor) return fallbackSunnahCandidate(reminder, nightDate);

  if (anchor === "tahajjud") {
    const maghrib = prayerTimeForDate("maghrib", nightDate, source);
    const fajr = prayerTimeForDate("fajr", addDays(nightDate, 1), source);
    if (maghrib && fajr) return new Date(maghrib.getTime() + ((fajr.getTime() - maghrib.getTime()) * 2) / 3 + offset * MINUTE_MS);
    return fallbackSunnahCandidate(reminder, nightDate);
  }
  if (anchor === "duha") {
    const sunrise = prayerTimeForDate("sunrise", nightDate, source);
    if (sunrise) return new Date(sunrise.getTime() + (reminder.anchorOffsetMinutes === undefined ? 20 : offset) * MINUTE_MS);
    return fallbackSunnahCandidate(reminder, nightDate);
  }
  if (anchor === "witr") return prayerTimeForDate("isha", nightDate, source, offset) ?? fallbackSunnahCandidate(reminder, nightDate);
  if (PRAYER_ANCHORS.includes(anchor)) return prayerTimeForDate(anchor, nightDate, source, offset) ?? fallbackSunnahCandidate(reminder, nightDate);
  return fallbackSunnahCandidate(reminder, nightDate);
}

function scheduleSunnahAligned(reminder: CustomReminder, now: Date, count: number, bounds: { start: number; end: number }, values: number[], source: PrayerTimesSource | undefined): void {
  const firstNight = localDay(now, -1);
  for (let index = 0; index < MAX_SEARCH_DAYS && values.length < count; index += 1) {
    const candidate = sunnahCandidate(reminder, addDays(firstNight, index), source);
    addCandidate(values, candidate?.getTime() ?? null, now.getTime(), bounds);
  }
}

function schedulePrayerAligned(reminder: CustomReminder, now: Date, count: number, bounds: { start: number; end: number }, values: number[], source: PrayerTimesSource | undefined): void {
  const firstDay = localDay(now, -1);
  const anchor = reminder.anchorKey;
  if (!anchor) return;
  for (let index = 0; index < MAX_SEARCH_DAYS && values.length < count; index += 1) {
    const day = addDays(firstDay, index);
    const candidate = prayerTimeForDate(anchor, day, source, validOffset(reminder.anchorOffsetMinutes)) ?? atLocalTime(day, reminder.atTimeOfDay, validOffset(reminder.anchorOffsetMinutes));
    addCandidate(values, candidate?.getTime() ?? null, now.getTime(), bounds);
  }
}

function fastingPattern(reminder: CustomReminder): FastingPattern | null {
  const fastingReminder = reminder as FastingReminder;
  if (fastingReminder.fastingPattern || fastingReminder.fastingRule) return fastingReminder.fastingPattern ?? fastingReminder.fastingRule ?? null;
  const text = [reminder.id, reminder.title, reminder.description, reminder.body].filter(Boolean).join(" ").toLowerCase();
  if (text.includes("monday") || text.includes("thursday") || text.includes("الاثنين") || text.includes("الإثنين") || text.includes("الخميس")) return "monday-thursday";
  if (text.includes("shawwal") || text.includes("شوال")) return "shawwal";
  if (text.includes("ayyam") || text.includes("beed") || text.includes("البيض")) return "ayyam-al-beed";
  if (text.includes("arafah") || text.includes("عرفة")) return "arafah";
  if (text.includes("ashura") || text.includes("عاشوراء")) return "ashura";
  if (text.includes("dhul-hijjah") || text.includes("ذي الحجة") || text.includes("ذو الحجة")) return "dhul-hijjah";
  if (text.includes("muharram") || text.includes("المحرم") || text.includes("محرم")) return "muharram";
  if (text.includes("ramadan") || text.includes("رمضان")) return "ramadan";
  return null;
}

function isFastingDay(reminder: CustomReminder, day: Date): boolean {
  const fastingReminder = reminder as FastingReminder;
  const explicitDays = fastingReminder.fastingDays?.filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
  if (explicitDays?.length) return explicitDays.includes(day.getDay());
  const pattern = fastingPattern(reminder);
  if (!pattern) return reminder.dayOfWeek === day.getDay();
  if (pattern === "monday-thursday") return day.getDay() === 1 || day.getDay() === 4;
  const hijri = gregorianToHijri(day);
  if (pattern === "shawwal") return hijri.month === 10 && hijri.day >= 2 && hijri.day <= 7;
  if (pattern === "ayyam-al-beed") return hijri.day >= 13 && hijri.day <= 15;
  if (pattern === "arafah") return hijri.month === 12 && hijri.day === 9;
  if (pattern === "ashura") return hijri.month === 1 && hijri.day === 10;
  if (pattern === "dhul-hijjah") return hijri.month === 12 && hijri.day >= 1 && hijri.day <= 9;
  if (pattern === "muharram") return hijri.month === 1 && hijri.day <= 10;
  return hijri.month === 9;
}

function scheduleFastingAligned(reminder: CustomReminder, now: Date, count: number, bounds: { start: number; end: number }, values: number[]): void {
  const firstDay = dayStartForReminder(reminder, now);
  for (let index = 0; index < MAX_SEARCH_DAYS && values.length < count; index += 1) {
    const day = addDays(firstDay, index);
    if (!isFastingDay(reminder, day)) continue;
    const candidate = atLocalTime(day, reminder.atTimeOfDay, validOffset(reminder.anchorOffsetMinutes));
    addCandidate(values, candidate?.getTime() ?? null, now.getTime(), bounds);
  }
}

function resolveArguments(argument: RecurrenceArgument, nowOrPrayerTimes: Date | number | PrayerTimesSource | undefined, prayerTimes: PrayerTimesSource | undefined): { options: ReminderRecurrenceOptions; count: number } {
  if (typeof argument === "number") {
    const now = nowOrPrayerTimes instanceof Date || typeof nowOrPrayerTimes === "number" ? nowOrPrayerTimes : undefined;
    const source = now === undefined ? nowOrPrayerTimes as PrayerTimesSource | undefined : prayerTimes;
    return { options: { count: argument, now, prayerTimes: source }, count: normalizedCount(argument) };
  }
  if (argument instanceof Date) return { options: { now: argument, prayerTimes: nowOrPrayerTimes as PrayerTimesSource | undefined }, count: DEFAULT_COUNT };
  const options = argument ?? {};
  return { options, count: normalizedCount(options.count) };
}

export function getNextReminderOccurrences(reminder: CustomReminder, options?: ReminderRecurrenceOptions): number[];
export function getNextReminderOccurrences(reminder: CustomReminder, count?: number, now?: Date | number, prayerTimes?: PrayerTimesSource): number[];
export function getNextReminderOccurrences(reminder: CustomReminder, argument: RecurrenceArgument = {}, nowOrPrayerTimes?: Date | number | PrayerTimesSource, prayerTimes?: PrayerTimesSource): number[] {
  if (!reminder.enabled) return [];
  const { options, count } = resolveArguments(argument, nowOrPrayerTimes, prayerTimes);
  if (count === 0) return [];
  const now = asDate(options.now ?? options.from);
  const bounds = dateBounds(reminder);
  if (!bounds || bounds.end <= now.getTime()) return [];
  const values: number[] = [];
  const source = effectivePrayerSource(options);
  switch (reminder.repeat) {
    case "once": scheduleOnce(reminder, now, bounds, values); break;
    case "daily": scheduleDaily(reminder, now, count, bounds, values); break;
    case "weekly": scheduleWeekly(reminder, now, count, bounds, values); break;
    case "monthly": scheduleMonthly(reminder, now, count, bounds, values); break;
    case "sunnah_aligned": scheduleSunnahAligned(reminder, now, count, bounds, values, source); break;
    case "prayer_aligned": schedulePrayerAligned(reminder, now, count, bounds, values, source); break;
    case "fasting_aligned": scheduleFastingAligned(reminder, now, count, bounds, values); break;
  }
  return [...new Set(values)].sort((left, right) => left - right).slice(0, count);
}

export function getNextReminderFireTimestamps(reminder: CustomReminder, options?: ReminderRecurrenceOptions): number[];
export function getNextReminderFireTimestamps(reminder: CustomReminder, count?: number, now?: Date | number, prayerTimes?: PrayerTimesSource): number[];
export function getNextReminderFireTimestamps(reminder: CustomReminder, argument: RecurrenceArgument = {}, nowOrPrayerTimes?: Date | number | PrayerTimesSource, prayerTimes?: PrayerTimesSource): number[] {
  if (typeof argument === "number") {
    const now = nowOrPrayerTimes instanceof Date || typeof nowOrPrayerTimes === "number" ? nowOrPrayerTimes : undefined;
    const source: PrayerTimesSource | undefined = now === undefined ? nowOrPrayerTimes as PrayerTimesSource | undefined : prayerTimes;
    return getNextReminderOccurrences(reminder, { count: argument, now, prayerTimes: source });
  }
  if (argument instanceof Date) return getNextReminderOccurrences(reminder, { now: argument, prayerTimes: nowOrPrayerTimes as PrayerTimesSource | undefined });
  return getNextReminderOccurrences(reminder, argument ?? {});
}

export function nextOccurrences(reminder: CustomReminder, options: ReminderRecurrenceOptions = {}): Date[] {
  return getNextReminderOccurrences(reminder, options).map((timestamp) => new Date(timestamp));
}

export const getNextReminderTimestamps = getNextReminderFireTimestamps;
export const getNextFireTimestamps = getNextReminderFireTimestamps;
