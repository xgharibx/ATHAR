import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTodayKey } from "@/hooks/useTodayKey";
import { useNoorStore } from "@/store/noorStore";
import { getPrayerWidgetClockContext, syncPrayerWidget } from "@/lib/prayerWidget";
import { parseDateKey, shiftDateKey } from "@/lib/dayBoundaries";
import { computeLocalPrayerTimings } from "@/lib/localPrayerTimes";
import { Capacitor } from "@capacitor/core";
import { accountScopedLocalStorage, getAccountStorageOwner } from "@/lib/accountStorageScope";
import { DEFAULT_PRAYER_CITY, getPrayerLocationIdentity, PRAYER_COORDS_KEY, PRAYER_LOCATION_CHANGED_EVENT, readCachedPrayerCoordinates, type PrayerCoordinates } from "@/lib/prayerLocation";
import { getDeviceLocation } from "@/lib/deviceLocation";

export const PRAYER_COORDS_KEY_EXPORT = PRAYER_COORDS_KEY;

type PrayerTimesResponse = {
  data: {
    timings: {
      Fajr: string;
      Sunrise: string;
      Dhuhr: string;
      Asr: string;
      Maghrib: string;
      Isha: string;
    };
    date: {
      readable: string;
      hijri: {
        date: string;
        month: {
          en: string;
          ar: string;
        };
        weekday: {
          en: string;
          ar: string;
        };
      };
    };
  };
};

export type PrayerHijriDate = PrayerTimesResponse["data"]["date"]["hijri"];

type PrayerTimesData = PrayerTimesResponse & {
  __fromCache?: boolean;
  __cachedAt?: string;
  __sourceLabel?: string;
};

const PRAYER_CACHE_PREFIX = "noor_prayer_times_v2";
function cacheKey(dayKey: string, locationKey: string) {
  return `${PRAYER_CACHE_PREFIX}:${dayKey}:${locationKey}`;
}

function readCached(dayKey: string, locationKey: string): PrayerTimesData | null {
  try {
    const raw = accountScopedLocalStorage.getItem(cacheKey(dayKey, locationKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrayerTimesData & { cachedAt?: string };
    if (!parsed?.data?.timings) return null;
    return {
      ...parsed,
      __fromCache: true,
      __cachedAt: parsed.cachedAt,
      __sourceLabel: parsed.__sourceLabel,
    };
  } catch {
    return null;
  }
}

function writeCached(dayKey: string, locationKey: string, payload: PrayerTimesResponse) {
  try {
    const out = { ...payload, cachedAt: new Date().toISOString() };
    accountScopedLocalStorage.setItem(cacheKey(dayKey, locationKey), JSON.stringify(out));
  } catch {
    // ignore storage failures
  }
}

export function formatPrayerHijriDate(hijri?: PrayerHijriDate): string {
  const rawDate = hijri?.date?.trim();
  const monthName = hijri?.month?.ar?.trim();
  if (!rawDate || !monthName) return "";

  const [dayPart, , yearPart] = rawDate.split("-");
  const day = Number(dayPart);
  const year = Number(yearPart);
  if (!Number.isFinite(day) || !Number.isFinite(year)) return "";

  try {
    const numberFormat = new Intl.NumberFormat("ar-EG-u-nu-arab", { useGrouping: false });
    return `${numberFormat.format(day)} ${monthName} ${numberFormat.format(year)} هـ`;
  } catch {
    return `${day} ${monthName} ${year} هـ`;
  }
}

async function fetchPrayerTimesResponse(url: string): Promise<PrayerTimesResponse> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error("تعذر جلب مواقيت الصلاة");
    return await res.json() as PrayerTimesResponse;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function toAladhanDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  if (!date) throw new Error("invalid prayer date");
  return `${two(date.getDate())}-${two(date.getMonth() + 1)}-${date.getFullYear()}`;
}

async function fetchPrayerTimes(city: string, country: string, method: number, school: number, timeZoneId: string, dateKey?: string) {
  const datePath = dateKey ? `/${toAladhanDate(dateKey)}` : "";
  const url = `https://api.aladhan.com/v1/timingsByCity${datePath}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&school=${school}&timezonestring=${encodeURIComponent(timeZoneId)}`;
  return fetchPrayerTimesResponse(url);
}

async function fetchPrayerTimesByCoords(latitude: number, longitude: number, method: number, school: number, timeZoneId: string, dateKey?: string) {
  const datePath = dateKey ? `/${toAladhanDate(dateKey)}` : "";
  const url = `https://api.aladhan.com/v1/timings${datePath}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}&timezonestring=${encodeURIComponent(timeZoneId)}`;
  return fetchPrayerTimesResponse(url);
}

type AladhanCalendarDay = {
  timings: Record<string, string>;
  date: {
    readable: string;
    gregorian: { date: string };
    hijri: PrayerTimesResponse["data"]["date"]["hijri"];
  };
};

/** "05:01 (EET)" or "05:01" → "05:01"; anything else → null. */
function normalizeCalendarTiming(value: string | undefined): string | null {
  const match = /^(\d{2}):(\d{2})/.exec(value?.trim() ?? "");
  return match ? `${match[1]}:${match[2]}` : null;
}

async function fetchPrayerCalendarMonth(
  year: number,
  month: number,
  location: { coords: PrayerCoordinates | null; city: string; country: string },
  method: number,
  school: number,
  timeZoneId: string,
): Promise<AladhanCalendarDay[]> {
  const common = `method=${method}&school=${school}&timezonestring=${encodeURIComponent(timeZoneId)}`;
  const url = location.coords
    ? `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${location.coords.lat}&longitude=${location.coords.lng}&${common}`
    : `https://api.aladhan.com/v1/calendarByCity/${year}/${month}?city=${encodeURIComponent(location.city)}&country=${encodeURIComponent(location.country)}&${common}`;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error("prayer calendar unavailable");
    const body = await res.json() as { data?: AladhanCalendarDay[] };
    return Array.isArray(body.data) ? body.data : [];
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export type UpcomingPrayerDay = { dateISO: string; timings: PrayerTimesResponse["data"]["timings"] };

/**
 * Prayer times for the days after tomorrow, so native alarms stay queued
 * for a week even when the app is not opened. Each day comes from the cache,
 * then AlAdhan's monthly calendar (one request per month), and finally the
 * offline calculation.
 */
async function loadUpcomingPrayerDays(
  dateKeys: string[],
  locationKey: string,
  location: { coords: PrayerCoordinates | null; city: string; country: string },
  method: number,
  school: number,
  timeZoneId: string,
): Promise<UpcomingPrayerDay[]> {
  const found = new Map<string, PrayerTimesResponse["data"]["timings"]>();
  for (const key of dateKeys) {
    const cached = readCached(key, locationKey);
    if (cached?.data?.timings) found.set(key, cached.data.timings);
  }

  const missingMonths = new Map<string, { year: number; month: number }>();
  for (const key of dateKeys) {
    if (found.has(key)) continue;
    const date = parseDateKey(key);
    if (!date) continue;
    missingMonths.set(`${date.getFullYear()}-${date.getMonth() + 1}`, { year: date.getFullYear(), month: date.getMonth() + 1 });
  }

  if (missingMonths.size > 0 && !browserReportsOffline()) {
    const wanted = new Set(dateKeys);
    for (const { year, month } of missingMonths.values()) {
      try {
        const days = await fetchPrayerCalendarMonth(year, month, location, method, school, timeZoneId);
        for (const day of days) {
          const [dd, mm, yyyy] = (day.date?.gregorian?.date ?? "").split("-");
          const key = `${yyyy}-${mm}-${dd}`;
          if (!wanted.has(key) || found.has(key)) continue;
          const timings = {
            Fajr: normalizeCalendarTiming(day.timings.Fajr),
            Sunrise: normalizeCalendarTiming(day.timings.Sunrise),
            Dhuhr: normalizeCalendarTiming(day.timings.Dhuhr),
            Asr: normalizeCalendarTiming(day.timings.Asr),
            Maghrib: normalizeCalendarTiming(day.timings.Maghrib),
            Isha: normalizeCalendarTiming(day.timings.Isha),
          };
          if (Object.values(timings).some((value) => value === null)) continue;
          const complete = timings as PrayerTimesResponse["data"]["timings"];
          writeCached(key, locationKey, { data: { timings: complete, date: { readable: day.date.readable, hijri: day.date.hijri } } });
          found.set(key, complete);
        }
      } catch {
        // Fall back to the offline calculation below.
      }
    }
  }

  const fallbackCoords = location.coords ?? { lat: 30.0444, lng: 31.2357 };
  return dateKeys.flatMap((key) => {
    const timings = found.get(key);
    if (timings) return [{ dateISO: key, timings }];
    const date = parseDateKey(key);
    if (!date) return [];
    return [{ dateISO: key, timings: computeLocalPrayerTimes(fallbackCoords.lat, fallbackCoords.lng, date, method, school).data.timings }];
  });
}

/** Exported for tests. */
export const loadUpcomingPrayerDaysForTest = loadUpcomingPrayerDays;

/** Days after tomorrow that native prayer alarms are queued for (a week in total). */
const UPCOMING_PRAYER_DAYS = 5;

function browserReportsOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Save the prayer location and tell the prayer views to refresh. */
export function writeCachedCoords(lat: number, lng: number) {
  try {
    accountScopedLocalStorage.setItem(
      PRAYER_COORDS_KEY,
      JSON.stringify({ lat, lng, savedAt: new Date().toISOString() } satisfies PrayerCoordinates & { savedAt: string })
    );
    if (typeof window !== "undefined") window.dispatchEvent(new Event(PRAYER_LOCATION_CHANGED_EVENT));
  } catch {
    // ignore storage failures
  }
}

function two(n: number) {
  return String(n).padStart(2, "0");
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

/**
 * Fully offline prayer-time computation (Jean Meeus astronomical formulas via the
 * `adhan` package) — the last-resort fallback when there is no network AND no cached
 * API response for this day/location yet (e.g. first launch with no connectivity).
 * PrayerTimes returns UTC instants for the selected coordinates. Format them in the
 * device timezone, which is also used by the app's countdowns and notification scheduler.
 */
function computeLocalPrayerTimes(lat: number, lng: number, date: Date, method: number, school: number): PrayerTimesResponse {
  const timings = computeLocalPrayerTimings(lat, lng, date, method, school);

  const hijriParts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "numeric", year: "numeric" }).formatToParts(date);
  const part = (t: string) => hijriParts.find((p) => p.type === t)?.value ?? "1";

  return {
    data: {
      timings,
      date: {
        readable: date.toDateString(),
        hijri: {
          date: `${two(Number(part("day")))}-${two(Number(part("month")))}-${part("year")}`,
          month: {
            en: new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "long" }).format(date),
            ar: new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", { month: "long" }).format(date),
          },
          weekday: {
            en: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date),
            ar: new Intl.DateTimeFormat("ar-SA", { weekday: "long" }).format(date),
          },
        },
      },
    },
  };
}

/** City-level accuracy is plenty for prayer times; a fix from the last half hour will do. */
function getCurrentPosition(timeoutMs = 8000) {
  return getDeviceLocation({ precise: false, timeoutMs, maxAgeMs: 30 * 60 * 1000 });
}

/** Request and persist device coordinates only after an explicit user action. */
export async function requestPrayerLocation(): Promise<boolean> {
  const requestOwner = getAccountStorageOwner();
  try {
    const { lat, lng } = await getCurrentPosition();
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return false;
    }
    if (getAccountStorageOwner() !== requestOwner) return false;
    writeCachedCoords(lat, lng);
    return true;
  } catch {
    // Permission denied, timed out, or unavailable: keep the current city/saved-location fallback.
    return false;
  }
}

export function usePrayerTimes() {
  const dayKey = useTodayKey();
  const [clockContext, setClockContext] = React.useState(getPrayerWidgetClockContext);
  const method = useNoorStore((s) => s.prefs.prayerCalcMethod ?? 5);
  const school = useNoorStore((s) => s.prefs.asrMadhab ?? 0);

  const [, setPrayerLocationRevision] = React.useState(0);
  React.useEffect(() => {
    const refreshLocation = () => setPrayerLocationRevision((revision) => revision + 1);
    window.addEventListener(PRAYER_LOCATION_CHANGED_EVENT, refreshLocation);
    return () => window.removeEventListener(PRAYER_LOCATION_CHANGED_EVENT, refreshLocation);
  }, []);

  React.useEffect(() => {
    const refreshClockContext = () => {
      const next = getPrayerWidgetClockContext();
      setClockContext((current) =>
        current.timeZoneId === next.timeZoneId && current.utcOffsetMinutes === next.utcOffsetMinutes
          ? current
          : next,
      );
    };
    window.addEventListener("focus", refreshClockContext);
    document.addEventListener("visibilitychange", refreshClockContext);
    return () => {
      window.removeEventListener("focus", refreshClockContext);
      document.removeEventListener("visibilitychange", refreshClockContext);
    };
  }, []);

  const deviceTimeZoneId = clockContext.timeZoneId || "UTC";

  // Fallback defaults
  const city = DEFAULT_PRAYER_CITY.city;
  const country = DEFAULT_PRAYER_CITY.country;
  const cityLocationKey = `city:${city}:${country}:${method}:${school}:${deviceTimeZoneId}`;
  const tomorrowKey = shiftDateKey(dayKey, 1);
  const cachedCoords = readCachedPrayerCoordinates();
  const locationIdentity = getPrayerLocationIdentity(cachedCoords);
  const tomorrowLocationKey = cachedCoords
    ? `coords:${cachedCoords.lat.toFixed(3)}:${cachedCoords.lng.toFixed(3)}:${method}:${school}:${deviceTimeZoneId}`
    : cityLocationKey;
  const coordsLat = cachedCoords?.lat ?? null;
  const coordsLng = cachedCoords?.lng ?? null;
  const initialCachedData = React.useMemo(() => {
    if (coordsLat !== null && coordsLng !== null) {
      const locationKey = `coords:${coordsLat.toFixed(3)}:${coordsLng.toFixed(3)}:${method}:${school}:${deviceTimeZoneId}`;
      const cached = readCached(dayKey, locationKey);
      return cached ?? undefined;
    }
    return readCached(dayKey, cityLocationKey) ?? undefined;
  }, [cityLocationKey, coordsLat, coordsLng, dayKey, deviceTimeZoneId, method, school]);

  const query = useQuery<PrayerTimesData>({
    queryKey: ["prayer-times", "v4", dayKey, method, school, deviceTimeZoneId, clockContext.utcOffsetMinutes, locationIdentity],
    queryFn: async () => {
      const trySource = async (label: string, locationKey: string, fn: () => Promise<PrayerTimesResponse>) => {
        const fresh = await fn();
        const out: PrayerTimesData = { ...fresh, __sourceLabel: label };
        writeCached(dayKey, locationKey, out);
        return out;
      };

      // B11: Wrap every network attempt in a CORS-aware try/catch so a
      //      single blocked request is treated as "this source failed"
      //      instead of bubbling up an unresolved Promise rejection that
      //      freezes the widget. CORS blocks on api.aladhan.com have been
      //      the most common source of "stuck on loading" on first launch.

      // 1) Last known coordinates. Never prompt for GPS as a side effect of app startup.
      if (cachedCoords) {
        const locationKey = `coords:${cachedCoords.lat.toFixed(3)}:${cachedCoords.lng.toFixed(3)}:${method}:${school}:${deviceTimeZoneId}`;
        try {
          if (browserReportsOffline()) throw new Error("offline");
          return await trySource(
            "آخر موقع محفوظ",
            locationKey,
            () =>
            fetchPrayerTimesByCoords(cachedCoords.lat, cachedCoords.lng, method, school, deviceTimeZoneId)
          );
        } catch {
          const cached = readCached(dayKey, locationKey);
          if (cached) return cached;
        }

        // The user explicitly chose this location. If its request and cache both
        // miss, calculate locally here rather than showing unrelated city times.
        return {
          ...computeLocalPrayerTimes(cachedCoords.lat, cachedCoords.lng, new Date(), method, school),
          __sourceLabel: "حساب محلي (بلا إنترنت)",
        };
      }

      // 2) City fallback — Aladhan's ByCity endpoint is CORS-friendly too,
      //    but if it fails we transparently move to the local adhan-based
      //    compute so the widget never lingers on a spinner.
      try {
        if (browserReportsOffline()) throw new Error("offline");
        return await trySource("القاهرة", cityLocationKey, () => fetchPrayerTimes(city, country, method, school, deviceTimeZoneId));
      } catch {
        const cached = readCached(dayKey, cityLocationKey);
        if (cached) return cached;
      }

      // 3) Fully offline last resort for first launch: compute Cairo locally
      // (Jean Meeus formulas via `adhan`) so no-connectivity never leaves a spinner.
      const fallbackCoords = { lat: 30.0444, lng: 31.2357 }; // Cairo, matches the city fallback above
      const computed: PrayerTimesData = {
        ...computeLocalPrayerTimes(fallbackCoords.lat, fallbackCoords.lng, new Date(), method, school),
        __sourceLabel: "حساب محلي — القاهرة (بلا إنترنت)",
      };
      return computed;
    },
    placeholderData: initialCachedData,
    staleTime: Infinity,
    // The query function has a local/cache fallback, so it must run even when
    // React Query's online manager would pause other network-backed queries.
    networkMode: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    retry: 2,
  });

  // Native alarms need tomorrow's location-specific times already queued in
  // the OS, because the app may stay closed across midnight. Fetch only after
  // today's location lookup has settled so this uses the same cached GPS source.
  const tomorrowQuery = useQuery<PrayerTimesData>({
    queryKey: ["prayer-times", "tomorrow-v2", tomorrowKey, method, school, deviceTimeZoneId, clockContext.utcOffsetMinutes, locationIdentity, tomorrowLocationKey],
    enabled: Capacitor.isNativePlatform() && query.data !== undefined && !query.isPlaceholderData,
    staleTime: Infinity,
    networkMode: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    queryFn: async () => {
      const locationKey = tomorrowLocationKey;
      const cached = readCached(tomorrowKey, locationKey);
      if (cached) return cached;

      const coords = cachedCoords;
      const date = parseDateKey(tomorrowKey) ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
      try {
        if (browserReportsOffline()) throw new Error("offline");
        const fresh = coords
          ? await fetchPrayerTimesByCoords(coords.lat, coords.lng, method, school, deviceTimeZoneId, tomorrowKey)
          : await fetchPrayerTimes(city, country, method, school, deviceTimeZoneId, tomorrowKey);
        writeCached(tomorrowKey, locationKey, fresh);
        return { ...fresh, __sourceLabel: coords ? "الموقع الحالي" : "القاهرة" };
      } catch {
        const fallbackCoords = coords ?? { lat: 30.0444, lng: 31.2357 };
        return {
          ...computeLocalPrayerTimes(fallbackCoords.lat, fallbackCoords.lng, date, method, school),
          __sourceLabel: coords ? "حساب محلي (بلا إنترنت)" : "حساب محلي — القاهرة (بلا إنترنت)",
        };
      }
    },
  });

  // Native alarms for the rest of the week, so prayer alerts continue even
  // if the app stays closed for several days.
  const upcomingQuery = useQuery<UpcomingPrayerDay[]>({
    queryKey: ["prayer-times", "upcoming-v1", dayKey, method, school, deviceTimeZoneId, clockContext.utcOffsetMinutes, locationIdentity, tomorrowLocationKey],
    enabled: Capacitor.isNativePlatform() && tomorrowQuery.data !== undefined,
    staleTime: Infinity,
    networkMode: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    queryFn: () => loadUpcomingPrayerDays(
      Array.from({ length: UPCOMING_PRAYER_DAYS }, (_, index) => shiftDateKey(dayKey, index + 2)),
      tomorrowLocationKey,
      { coords: cachedCoords, city, country },
      method,
      school,
      deviceTimeZoneId,
    ),
  });

  const getPrayerTimingsForDate = React.useCallback((date: Date) => {
    const requestedDay = localDateKey(date);
    if (requestedDay === dayKey && query.data?.data?.timings) return query.data.data.timings;
    if (requestedDay === tomorrowKey && tomorrowQuery.data?.data?.timings) return tomorrowQuery.data.data.timings;

    return computeLocalPrayerTimes(
      coordsLat ?? 30.0444,
      coordsLng ?? 31.2357,
      date,
      method,
      school,
    ).data.timings;
  }, [coordsLat, coordsLng, dayKey, method, query.data?.data?.timings, school, tomorrowKey, tomorrowQuery.data?.data?.timings]);

  React.useEffect(() => {
    if (query.data?.data?.timings) {
      syncPrayerWidget(query.data.data.timings, dayKey).catch(() => {});
    }
  }, [clockContext, dayKey, query.data]);

  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleMidnightRefresh = () => {
      const nextMidnight = new Date();
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 2, 0);
      const msUntilRefresh = Math.max(1000, nextMidnight.getTime() - Date.now());
      timeoutId = globalThis.setTimeout(() => {
        void query.refetch();
        scheduleMidnightRefresh();
      }, msUntilRefresh);
    };

    scheduleMidnightRefresh();

    return () => {
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, query.refetch]);

  return { ...query, tomorrow: tomorrowQuery.data, upcoming: upcomingQuery.data, getPrayerTimingsForDate };
}
