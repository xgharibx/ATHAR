import { useQuery } from "@tanstack/react-query";
import { useTodayKey } from "@/hooks/useTodayKey";

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

async function fetchPrayerTimes(city: string, country: string) {
  const url = `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=5`; // Method 5 = Egyptian General Authority of Survey
  const res = await fetch(url);
  if (!res.ok) throw new Error("تعذر جلب مواقيت الصلاة");
  return res.json() as Promise<PrayerTimesResponse>;
}

async function fetchPrayerTimesByCoords(latitude: number, longitude: number) {
  const url = `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=5`;
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
  // Fallback defaults
  const city = "Cairo";
  const country = "Egypt";
  const cityLocationKey = `city:${city}:${country}`;

  return useQuery<PrayerTimesData>({
    queryKey: ["prayer-times", "v3", dayKey],
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
        writeCachedCoords(lat, lng);
        return await trySource(
          "الموقع الحالي",
          `coords:${lat.toFixed(3)}:${lng.toFixed(3)}`,
          () => fetchPrayerTimesByCoords(lat, lng)
        );
      } catch {
        // continue
      }

      // 2) Last known coordinates
      if (cachedCoords) {
        try {
          return await trySource(
            "آخر موقع محفوظ",
            `coords:${cachedCoords.lat.toFixed(3)}:${cachedCoords.lng.toFixed(3)}`,
            () =>
            fetchPrayerTimesByCoords(cachedCoords.lat, cachedCoords.lng)
          );
        } catch {
          // continue
        }
      }

      // 3) City fallback
      try {
        return await trySource("القاهرة", cityLocationKey, () => fetchPrayerTimes(city, country));
      } catch {
        const cached = readCached(dayKey, cityLocationKey);
        if (cached) return cached;
        throw new Error("تعذر جلب مواقيت الصلاة");
      }
    },
    initialData: () => readCached(dayKey, cityLocationKey) ?? undefined,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 2,
  });
}
