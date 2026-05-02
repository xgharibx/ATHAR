import * as React from "react";
import { Routes, Route, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useApplyTheme } from "@/hooks/useApplyTheme";
import { AppShell } from "@/components/layout/AppShell";
import { LeaderboardSyncBridge } from "@/components/leaderboard/LeaderboardSyncBridge";
import { useNoorStore } from "@/store/noorStore";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { SplashIntro, SPLASH_SESSION_KEY } from "@/components/brand/SplashIntro";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { getNextIbadahBoundary, getNextLocalMidnight } from "@/lib/dayBoundaries";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { syncReminders, registerNotificationDeepLinkListener, ensureDefaultNotificationChannels } from "@/lib/reminders";
import { PwaInstallBanner } from "@/components/brand/PwaInstallBanner";

// T7: Per-route error boundary — prevents a single page crash from killing the whole app
class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
          <div className="text-2xl">??</div>
          <div className="text-base font-semibold opacity-90">??? ??? ?? ??? ??????</div>
          <button
            className="px-4 py-2 rounded-2xl bg-white/10 border border-white/10 text-sm"
            onClick={() => this.setState({ hasError: false })}
          >
            ????? ????????
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Wraps a lazy route element with Suspense + per-route RouteErrorBoundary */
function S({ children }: { children: React.ReactNode }) {
  return (
    <RouteErrorBoundary>
      <React.Suspense fallback={<div className="p-4" dir="rtl"><PageSkeleton /></div>}>
        {children}
      </React.Suspense>
    </RouteErrorBoundary>
  );
}

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
const MushafPage = React.lazy(() => import("@/pages/Mushaf").then((m) => ({ default: m.MushafPage })));
const PrayerTimesPage = React.lazy(() => import("@/pages/PrayerTimes").then((m) => ({ default: m.PrayerTimesPage })));
const SebhaPage = React.lazy(() => import("@/pages/Sebha").then((m) => ({ default: m.SebhaPage })));
const QiblaPage = React.lazy(() => import("@/pages/Qibla").then((m) => ({ default: m.QiblaPage })));

// C1-C7: New content pages
const AsmaAlHusnaPage = React.lazy(() => import("@/pages/AsmaAlHusna").then((m) => ({ default: m.AsmaAlHusnaPage })));
const DuasPage = React.lazy(() => import("@/pages/Duas").then((m) => ({ default: m.DuasPage })));
const QuranVocabPage = React.lazy(() => import("@/pages/QuranVocab").then((m) => ({ default: m.QuranVocabPage })));
const ProphetStoriesPage = React.lazy(() => import("@/pages/ProphetStories").then((m) => ({ default: m.ProphetStoriesPage })));
const PrayerGuidePage = React.lazy(() => import("@/pages/PrayerGuide").then((m) => ({ default: m.PrayerGuidePage })));
const WuduGuidePage = React.lazy(() => import("@/pages/WuduGuide").then((m) => ({ default: m.WuduGuidePage })));
const RuqyahPage = React.lazy(() => import("@/pages/Ruqyah").then((m) => ({ default: m.RuqyahPage })));
const LibraryPage = React.lazy(() => import("@/pages/Library").then((m) => ({ default: m.LibraryPage })));
const LibraryItemPage = React.lazy(() => import("@/pages/LibraryItem").then((m) => ({ default: m.LibraryItemPage })));
const HadithBooksPage = React.lazy(() => import("@/pages/HadithBooks").then((m) => ({ default: m.HadithBooksPage })));
const HadithBookViewPage = React.lazy(() => import("@/pages/HadithBookView").then((m) => ({ default: m.HadithBookViewPage })));
const HadithReaderPage = React.lazy(() => import("@/pages/HadithReader").then((m) => ({ default: m.HadithReaderPage })));
const HadithMemoPage = React.lazy(() => import("@/pages/HadithMemo").then((m) => ({ default: m.HadithMemoPage })));
const CompanionsPage = React.lazy(() => import("@/pages/Companions"));
const SeerahPage = React.lazy(() => import("@/pages/SeerahTimeline"));
const QuranPlansPage = React.lazy(() => import("@/pages/QuranPlans").then((m) => ({ default: m.QuranPlansPage })));
const CustomAdhkarPage = React.lazy(() => import("@/pages/CustomAdhkar").then((m) => ({ default: m.CustomAdhkarPage })));
const NearbyMosquesPage = React.lazy(() => import("@/pages/NearbyMosques").then((m) => ({ default: m.NearbyMosquesPage })));

export default function App() {
  useApplyTheme();
  const navigate = useNavigate();
  const ensureDailyResets = useNoorStore((s) => s.ensureDailyResets);
  const reminders = useNoorStore((s) => s.reminders);
  const onboardingDone = useNoorStore((s) => s.onboardingDone);
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

  // 11C: Pre-create default notification channels on native platforms
  React.useEffect(() => {
    void ensureDefaultNotificationChannels();
  }, []);

  // 3C: Register notification deep-link listener on native platforms
  React.useEffect(() => {
    let cleanup: (() => void) | undefined;
    registerNotificationDeepLinkListener(navigate).then((fn) => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, [navigate]);

  return (
    <>
      {showSplash && <SplashIntro onDone={() => setShowSplash(false)} />}
      {!showSplash && !onboardingDone && <OnboardingFlow />}
      <LeaderboardSyncBridge />
      <PwaInstallBanner />
      <Routes>
        <Route path="mushaf/:page?" element={<S><MushafPage /></S>} />
        <Route element={<AppShell />}>
          <Route index element={<S><HomePage /></S>} />
          <Route path="c/:id" element={<S><CategoryPage /></S>} />
          <Route path="search" element={<S><SearchPage /></S>} />
          <Route path="favorites" element={<S><FavoritesPage /></S>} />
          <Route path="quran" element={<S><QuranPage /></S>} />
          <Route path="quran/plans" element={<S><QuranPlansPage /></S>} />
          <Route path="adhkar/custom" element={<S><CustomAdhkarPage /></S>} />
          <Route path="sebha" element={<S><SebhaPage /></S>} />
          <Route path="qibla" element={<S><QiblaPage /></S>} />
          <Route path="mosques" element={<S><NearbyMosquesPage /></S>} />
          <Route path="prayer-times" element={<S><PrayerTimesPage /></S>} />
          <Route path="insights" element={<S><InsightsPage /></S>} />
          <Route path="leaderboard" element={<S><LeaderboardPage /></S>} />
          <Route path="settings" element={<S><SettingsPage /></S>} />
          <Route path="sources" element={<S><SourcesPage /></S>} />
          {/* C1-C7: New content pages */}
          <Route path="asma" element={<S><AsmaAlHusnaPage /></S>} />
          <Route path="duas" element={<S><DuasPage /></S>} />
          <Route path="quran-vocab" element={<S><QuranVocabPage /></S>} />
          <Route path="stories" element={<S><ProphetStoriesPage /></S>} />
          <Route path="prayer-guide" element={<S><PrayerGuidePage /></S>} />
          <Route path="wudu" element={<S><WuduGuidePage /></S>} />
          <Route path="ruqyah" element={<S><RuqyahPage /></S>} />
          <Route path="library" element={<S><LibraryPage /></S>} />
          <Route path="library/:collectionId/:entryId" element={<S><LibraryItemPage /></S>} />
          {/* Hadith pages */}
          <Route path="hadith" element={<Outlet />}>
            <Route index element={<S><HadithBooksPage /></S>} />
            <Route path="memo" element={<S><HadithMemoPage /></S>} />
            <Route path=":bookKey" element={<S><HadithBookViewPage /></S>} />
            <Route path=":bookKey/:hadithNumber" element={<S><HadithReaderPage /></S>} />
          </Route>
          <Route path="companions" element={<S><CompanionsPage /></S>} />
          <Route path="seerah" element={<S><SeerahPage /></S>} />
          <Route path="*" element={<S><NotFoundPage /></S>} />
        </Route>
      </Routes>
    </>
  );
}
