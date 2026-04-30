import * as React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import { useApplyTheme } from "@/hooks/useApplyTheme";
import { AppShell } from "@/components/layout/AppShell";
import { LeaderboardSyncBridge } from "@/components/leaderboard/LeaderboardSyncBridge";
import { useNoorStore } from "@/store/noorStore";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { SplashIntro, SPLASH_SESSION_KEY } from "@/components/brand/SplashIntro";
import { getNextIbadahBoundary, getNextLocalMidnight } from "@/lib/dayBoundaries";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { syncReminders } from "@/lib/reminders";

const HomePage = React.lazy(() => import("@/pages/Home").then((m) => ({ default: m.HomePage })));
const CategoryPage = React.lazy(() => import("@/pages/Category").then((m) => ({ default: m.CategoryPage })));
const SearchPage = React.lazy(() => import("@/pages/Search").then((m) => ({ default: m.SearchPage })));
const FavoritesPage = React.lazy(() => import("@/pages/Favorites").then((m) => ({ default: m.FavoritesPage })));
const SettingsPage = React.lazy(() => import("@/pages/Settings").then((m) => ({ default: m.SettingsPage })));
const SourcesPage = React.lazy(() => import("@/pages/Sources").then((m) => ({ default: m.SourcesPage })));
const InsightsPage = React.lazy(() => import("@/pages/Insights").then((m) => ({ default: m.InsightsPage })));
const LeaderboardPage = React.lazy(() => import("@/pages/Leaderboard").then((m) => ({ default: m.LeaderboardPage })));
const NotFoundPage = React.lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFoundPage })));
const QuranPage = React.lazy(() => import("@/pages/Quran").then((m) => ({ default: m.QuranPage })));
const SurahPage = React.lazy(() => import("@/pages/Surah").then((m) => ({ default: m.SurahPage })));
const MushafPage = React.lazy(() => import("@/pages/Mushaf").then((m) => ({ default: m.MushafPage })));
const PrayerTimesPage = React.lazy(() => import("@/pages/PrayerTimes").then((m) => ({ default: m.PrayerTimesPage })));

export default function App() {
  useApplyTheme();
  const ensureDailyResets = useNoorStore((s) => s.ensureDailyResets);
  const reminders = useNoorStore((s) => s.reminders);
  const location = useLocation();
  const prayerTimes = usePrayerTimes();
  const fajrTime = prayerTimes.data?.data?.timings?.Fajr ?? null;
  const notificationPrayerTimings = React.useMemo(() => {
    const timings = prayerTimes.data?.data?.timings;
    if (!timings) return null;

    return {
      Fajr: timings.Fajr,
      Dhuhr: timings.Dhuhr,
      Asr: timings.Asr,
      Maghrib: timings.Maghrib,
      Isha: timings.Isha,
    };
  }, [
    prayerTimes.data?.data?.timings?.Asr,
    prayerTimes.data?.data?.timings?.Dhuhr,
    prayerTimes.data?.data?.timings?.Fajr,
    prayerTimes.data?.data?.timings?.Isha,
    prayerTimes.data?.data?.timings?.Maghrib,
  ]);

  // Show animated splash once per browser/app session
  const [showSplash, setShowSplash] = React.useState<boolean>(() => {
    try {
      if (sessionStorage.getItem(SPLASH_SESSION_KEY)) return false;
      sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
      return true;
    } catch {
      return false;
    }
  });

  // Scroll to top on page navigation (skip for hash-only changes)
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  React.useEffect(() => {
    const w = globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const runPrefetch = () => {
      void import("@/pages/Leaderboard");
      void import("@/pages/Quran");
      void import("@/pages/Insights");
    };

    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(runPrefetch);
      return () => {
        if (typeof w.cancelIdleCallback === "function") {
          w.cancelIdleCallback(id);
        }
      };
    }

    const timeoutId = setTimeout(runPrefetch, 1200);
    return () => clearTimeout(timeoutId);
  }, []);

  React.useEffect(() => {
    ensureDailyResets(fajrTime);
    let midnightTimeoutId: number | null = null;
    let ibadahTimeoutId: number | null = null;

    const scheduleMidnightReset = () => {
      const nextMidnight = getNextLocalMidnight(new Date());
      const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - Date.now());
      midnightTimeoutId = globalThis.setTimeout(() => {
        ensureDailyResets(fajrTime);
        scheduleMidnightReset();
      }, msUntilMidnight);
    };

    const scheduleIbadahReset = () => {
      const nextBoundary = getNextIbadahBoundary(new Date(), fajrTime);
      if (!nextBoundary) return;

      const msUntilBoundary = Math.max(1000, nextBoundary.getTime() - Date.now());
      ibadahTimeoutId = globalThis.setTimeout(() => {
        ensureDailyResets(fajrTime);
        scheduleIbadahReset();
      }, msUntilBoundary);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") ensureDailyResets(fajrTime);
    };
    const onFocus = () => ensureDailyResets(fajrTime);

    document.addEventListener("visibilitychange", onVisible);
    globalThis.addEventListener("focus", onFocus);

    scheduleMidnightReset();
    scheduleIbadahReset();

    return () => {
      if (midnightTimeoutId !== null) {
        globalThis.clearTimeout(midnightTimeoutId);
      }
      if (ibadahTimeoutId !== null) {
        globalThis.clearTimeout(ibadahTimeoutId);
      }
      document.removeEventListener("visibilitychange", onVisible);
      globalThis.removeEventListener("focus", onFocus);
    };
  }, [ensureDailyResets, fajrTime]);

  React.useEffect(() => {
    void syncReminders(reminders, notificationPrayerTimings);
  }, [notificationPrayerTimings, reminders]);

  return (
    <>
      {showSplash && <SplashIntro onDone={() => setShowSplash(false)} />}
      <React.Suspense
        fallback={
          <div className="p-4" dir="rtl">
            <PageSkeleton />
          </div>
        }
      >
        <LeaderboardSyncBridge />
        <Routes>
          <Route path="mushaf/:page?" element={<MushafPage />} />
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="c/:id" element={<CategoryPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="quran" element={<QuranPage />} />
            <Route path="quran/:id" element={<SurahPage />} />
            <Route path="prayer-times" element={<PrayerTimesPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="sources" element={<SourcesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </React.Suspense>
    </>
  );
}
