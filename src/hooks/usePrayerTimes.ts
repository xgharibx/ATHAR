import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTodayKey } from "@/hooks/useTodayKey";
import { useNoorStore } from "@/store/noorStore";
import { syncPrayerWidget } from "@/lib/prayerWidget";

export const PRAYER_COORDS_KEY_EXPORT = "noor_prayer_coords_v1";

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

type PrayerTimesData = PrayerTimesResponse & {
  __fromCache?: boolean;
  __cachedAt?: string;
  __sourceLabel?: string;
};

const PRAYER_CACHE_PREFIX = "noor_prayer_times_v1";
const PRAYER_COORDS_KEY = "noor_prayer_coords_v1";

function cacheKey(dayKey: string, locationKey: string) {
  return `${PRAYER_CACHE_PREFIX}:${dayKey}:${locationKey}`;
}

function readCached(dayKey: string, locationKey: string): PrayerTimesData | null {
  try {
    const raw = localStorage.getItem(cacheKey(dayKey, locationKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrayerTimesResponse & { cachedAt?: string };
    if (!parsed?.data?.timings) return null;
    return {
      ...parsed,
      __fromCache: true,
      __cachedAt: parsed.cachedAt
    };
  } catch {
    return null;
  }
}

function writeCached(dayKey: string, locationKey: string, payload: PrayerTimesResponse) {
  try {
    const out = { ...payload, cachedAt: new Date().toISOString() };
    localStorage.setItem(cacheKey(dayKey, locationKey), JSON.stringify(out));
  } catch {
    // ignore storage failures
  }
}

async function fetchPrayerTimes(city: string, country: string, method: number, school: number) {
  const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&school=${school}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("تعذر جلب مواقيت الصلاة");
  return res.json() as Promise<PrayerTimesResponse>;
}

async function fetchPrayerTimesByCoords(latitude: number, longitude: number, method: number, school: number) {
  const url = `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("تعذر جلب مواقيت الصلاة بالموقع");
  return res.json() as Promise<PrayerTimesResponse>;
}

type CachedCoords = { lat: number; lng: number; savedAt: string };

function readCachedCoords(): CachedCoords | null {
  try {
    const raw = localStorage.getItem(PRAYER_COORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCoords;
    if (!Number.isFinite(parsed?.lat) || !Number.isFinite(parsed?.lng)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedCoords(lat: number, lng: number) {
  try {
    localStorage.setItem(
      PRAYER_COORDS_KEY,
      JSON.stringify({ lat, lng, savedAt: new Date().toISOString() } satisfies CachedCoords)
    );
  } catch {
    // ignore storage failures
  }
}

function getCurrentPosition(timeoutMs = 2500): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: timeoutMs,
      maximumAge: 30 * 60 * 1000
    });
  });
}

export function usePrayerTimes() {
  const dayKey = useTodayKey();
  const method = useNoorStore((s) => s.prefs.prayerCalcMethod ?? 5);
  const school = useNoorStore((s) => s.prefs.asrMadhab ?? 0);
  // Fallback defaults
  const city = "Cairo";
  const country = "Egypt";
  const cityLocationKey = `city:${city}:${country}:${method}:${school}`;

  const query = useQuery<PrayerTimesData>({
    queryKey: ["prayer-times", "v3", dayKey, method, school],
    queryFn: async () => {
      const cachedCoords = readCachedCoords();

      const trySource = async (label: string, locationKey: string, fn: () => Promise<PrayerTimesResponse>) => {
        const fresh = await fn();
        const out: PrayerTimesData = { ...fresh, __sourceLabel: label };
        writeCached(dayKey, locationKey, out);
        return out;
      };

      // 1) Live coordinates
      try {
        const pos = await getCurrentPosition();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const locationKey = `coords:${lat.toFixed(3)}:${lng.toFixed(3)}:${method}:${school}`;
        writeCachedCoords(lat, lng);
        try {
          return await trySource("الموقع الحالي", locationKey, () => fetchPrayerTimesByCoords(lat, lng, method, school));
        } catch {
          const cached = readCached(dayKey, locationKey);
          if (cached) return cached;
        }
      } catch {
        // continue
      }

      // 2) Last known coordinates
      if (cachedCoords) {
        const locationKey = `coords:${cachedCoords.lat.toFixed(3)}:${cachedCoords.lng.toFixed(3)}:${method}:${school}`;
        try {
          return await trySource(
            "آخر موقع محفوظ",
            locationKey,
            () =>
            fetchPrayerTimesByCoords(cachedCoords.lat, cachedCoords.lng, method, school)
          );
        } catch {
          const cached = readCached(dayKey, locationKey);
          if (cached) return cached;
        }
      }

      // 3) City fallback
      try {
        return await trySource("القاهرة", cityLocationKey, () => fetchPrayerTimes(city, country, method, school));
      } catch {
        const cached = readCached(dayKey, cityLocationKey);
        if (cached) return cached;
        throw new Error("تعذر جلب مواقيت الصلاة");
      }
    },
    initialData: () => readCached(dayKey, cityLocationKey) ?? undefined,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    retry: 2,
  });

  React.useEffect(() => {
    if (query.data?.data?.timings) {
      syncPrayerWidget(query.data.data.timings).catch(() => {});
    }
  }, [query.data]);

  React.useEffect(() => {
    let timeoutId: number | null = null;

    const scheduleMidnightRefresh = () => {
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 2, 0);
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
  }, [dayKey, query.refetch]);

  return query;
}
