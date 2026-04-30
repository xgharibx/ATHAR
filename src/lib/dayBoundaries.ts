export type DayKeyMode = "civil" | "ibadah";

export function getLocalDateKey(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseDateKey(dateKey: string) {
  const match = (dateKey ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function shiftDateKey(dateKey: string, deltaDays: number) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;
  parsed.setDate(parsed.getDate() + deltaDays);
  return getLocalDateKey(parsed);
}

export function parseClockTime(clock: string | null | undefined, anchor = new Date()) {
  const clean = String(clock ?? "").trim().split(" ")[0] ?? "";
  const [hours, minutes] = clean.split(":").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const next = new Date(anchor);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function getIbadahDateKey(now = new Date(), fajrTime?: string | null) {
  const civilDateKey = getLocalDateKey(now);
  const fajrToday = parseClockTime(fajrTime, now);
  if (!fajrToday) return civilDateKey;

  return now.getTime() < fajrToday.getTime()
    ? shiftDateKey(civilDateKey, -1)
    : civilDateKey;
}

export function getNextLocalMidnight(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next;
}

export function getNextIbadahBoundary(now = new Date(), fajrTime?: string | null) {
  const fajrToday = parseClockTime(fajrTime, now);
  if (!fajrToday) return null;

  if (now.getTime() < fajrToday.getTime()) {
    return fajrToday;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return parseClockTime(fajrTime, tomorrow);
}