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

async function fetchPrayerTimes(city: string, country: string) {
  const url = `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=5`; // Method 5 = Egyptian General Authority of Survey
  const res = await fetch(url);
  if (!res.ok) throw new Error("تعذر جلب مواقيت الصلاة");
  return res.json() as Promise<PrayerTimesResponse>;
}

export function usePrayerTimes() {
  // Hardcoded for Egypt/Cairo for now as requested, but easily customizable
  const city = "Cairo";
  const country = "Egypt";

  return useQuery({
    queryKey: ["prayer-times", city, country],
    queryFn: () => fetchPrayerTimes(city, country),
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
  });
}
