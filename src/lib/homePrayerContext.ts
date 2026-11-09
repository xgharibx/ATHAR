export type HomePrayerTimings = Partial<Record<"Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha", string | number | null | undefined>>;

export type HomePrayerContext = {
  nextPrayer: { label: string; at: Date } | null;
  nextPrayerMinutes: number | null;
};

const PRAYERS = [
  { label: "الفجر", key: "Fajr" },
  { label: "الظهر", key: "Dhuhr" },
  { label: "العصر", key: "Asr" },
  { label: "المغرب", key: "Maghrib" },
  { label: "العشاء", key: "Isha" },
] as const;

function getPrayerEvents(timings: HomePrayerTimings | undefined, dayStart: Date) {
  if (!timings) return [];

  return PRAYERS.flatMap(({ key, label }) => {
    const clean = String(timings[key] ?? "").trim().split(" ")[0] ?? "";
    const [hour, minute] = clean.split(":").map((part) => Number.parseInt(part, 10));
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return [];
    }

    const at = new Date(dayStart);
    at.setHours(hour, minute, 0, 0);
    return [{ label, at }];
  });
}

/** Calculates the next prayer across today and tomorrow using local time. */
export function getHomePrayerContext(
  todayTimings: HomePrayerTimings | undefined,
  tomorrowTimings: HomePrayerTimings | undefined,
  now: Date,
): HomePrayerContext {
  if (!todayTimings) return { nextPrayer: null, nextPrayerMinutes: null };

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const prayerList = [
    ...getPrayerEvents(todayTimings, todayStart),
    ...getPrayerEvents(tomorrowTimings, tomorrowStart),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  const nextPrayer = prayerList.find((prayer) => prayer.at.getTime() > now.getTime()) ?? null;
  const nextPrayerMinutes = nextPrayer
    ? Math.max(0, Math.floor((nextPrayer.at.getTime() - now.getTime()) / 60_000))
    : null;

  return { nextPrayer, nextPrayerMinutes };
}

/** The Home mission changes when a prayer enters 45/30-minute windows or starts. */
export function getNextHomePrayerRefreshAt(
  todayTimings: HomePrayerTimings | undefined,
  tomorrowTimings: HomePrayerTimings | undefined,
  now: Date,
): Date | null {
  const nextPrayer = getHomePrayerContext(todayTimings, tomorrowTimings, now).nextPrayer;
  if (!nextPrayer) return null;

  return [-45, -30, 0]
    .map((minutes) => new Date(nextPrayer.at.getTime() + minutes * 60_000))
    .filter((at) => at.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
}
