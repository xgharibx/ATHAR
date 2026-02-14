import { useQuery } from "@tanstack/react-query";

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

function cacheKey(city: string, country: string) {
  return `${PRAYER_CACHE_PREFIX}:${city}:${country}`;
}

function readCached(city: string, country: string): PrayerTimesData | null {
  try {
    const raw = localStorage.getItem(cacheKey(city, country));
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

function writeCached(city: string, country: string, payload: PrayerTimesResponse) {
  try {
    const out = { ...payload, cachedAt: new Date().toISOString() };
    localStorage.setItem(cacheKey(city, country), JSON.stringify(out));
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
  // Fallback defaults
  const city = "Cairo";
  const country = "Egypt";

  return useQuery<PrayerTimesData>({
    queryKey: ["prayer-times", "v2"],
    queryFn: async () => {
      const cachedCoords = readCachedCoords();

      const trySource = async (label: string, fn: () => Promise<PrayerTimesResponse>) => {
        const fresh = await fn();
        const out: PrayerTimesData = { ...fresh, __sourceLabel: label };
        writeCached(city, country, out);
        return out;
      };

      // 1) Live coordinates
      try {
        const pos = await getCurrentPosition();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        writeCachedCoords(lat, lng);
        return await trySource("الموقع الحالي", () => fetchPrayerTimesByCoords(lat, lng));
      } catch {
        // continue
      }

      // 2) Last known coordinates
      if (cachedCoords) {
        try {
          return await trySource("آخر موقع محفوظ", () =>
            fetchPrayerTimesByCoords(cachedCoords.lat, cachedCoords.lng)
          );
        } catch {
          // continue
        }
      }

      // 3) City fallback
      try {
        return await trySource("القاهرة", () => fetchPrayerTimes(city, country));
      } catch {
        const cached = readCached(city, country);
        if (cached) return cached;
        throw new Error("تعذر جلب مواقيت الصلاة");
      }
    },
    initialData: () => readCached(city, country) ?? undefined,
    staleTime: 1000 * 60 * 30,
    retry: 1
  });
}
