import * as React from "react";
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useApplyTheme } from "@/hooks/useApplyTheme";
import { AppShell } from "@/components/layout/AppShell";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { LeaderboardSyncBridge } from "@/components/leaderboard/LeaderboardSyncBridge";
import { useNoorStore } from "@/store/noorStore";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { SplashIntro, SPLASH_SESSION_KEY } from "@/components/brand/SplashIntro";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { getNextIbadahBoundary, getNextLocalMidnight } from "@/lib/dayBoundaries";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { syncReminders, registerNotificationDeepLinkListener, ensureDefaultNotificationChannels } from "@/lib/reminders";
import { syncCustomReminders } from "@/lib/reminderSync";
import { CUSTOM_REMINDER_PERMISSION_CHANGE_EVENT } from "@/lib/customReminderNotifications";
import { listenForAppResume } from "@/lib/reminderAppResume";
import { syncAllWidgets } from "@/lib/widgetDataBridge";
import { PwaInstallBanner } from "@/components/brand/PwaInstallBanner";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useQueryClient } from "@tanstack/react-query";
import { ensureMushafCoreOffline } from "@/lib/mushafOffline";
import { ensureAllWbwSurahsCached } from "@/lib/quranWBW";
import { idbPruneQuranTranslationCache } from "@/lib/quranIDB";
import { ANGELS_SECTION } from "@/data/angels";
import { DIVINE_BOOKS_SECTION } from "@/data/divineBooks";
import { ISLAM_PILLARS_SECTION } from "@/data/islamPillars";
import { FAITH_PILLARS_SECTION } from "@/data/faithPillars";
import { FAITH_BRANCHES_SECTION } from "@/data/faithBranches";
import { MAJOR_SINS_SECTION } from "@/data/majorSins";

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
const CompanionPage = React.lazy(() => import("@/pages/Companion").then((m) => ({ default: m.CompanionPage })));
const RemindersPage = React.lazy(() => import("@/pages/Reminders").then((m) => ({ default: m.RemindersPage })));
const HadithSharhPage = React.lazy(() => import("@/pages/HadithSharh").then((m) => ({ default: m.HadithSharhPage })));
const TasmeePage = React.lazy(() => import("@/pages/Tasmee").then((m) => ({ default: m.TasmeePage })));
const QiblaPage = React.lazy(() => import("@/pages/Qibla").then((m) => ({ default: m.QiblaPage })));

// C1-C7: New content pages
const AsmaAlHusnaPage = React.lazy(() => import("@/pages/AsmaAlHusna").then((m) => ({ default: m.AsmaAlHusnaPage })));
const DuasPage = React.lazy(() => import("@/pages/Duas").then((m) => ({ default: m.DuasPage })));
const QuranVocabPage = React.lazy(() => import("@/pages/QuranVocab").then((m) => ({ default: m.QuranVocabPage })));
const ProphetStoriesPage = React.lazy(() => import("@/pages/ProphetStories").then((m) => ({ default: m.ProphetStoriesPage })));
const KnowledgeSectionPage = React.lazy(() => import("@/pages/KnowledgeSection").then((m) => ({ default: m.KnowledgeSectionPage })));
const PrayerGuidePage = React.lazy(() => import("@/pages/PrayerGuide").then((m) => ({ default: m.PrayerGuidePage })));
const WuduGuidePage = React.lazy(() => import("@/pages/WuduGuide").then((m) => ({ default: m.WuduGuidePage })));
const RuqyahPage = React.lazy(() => import("@/pages/Ruqyah").then((m) => ({ default: m.RuqyahPage })));
const LibraryPage = React.lazy(() => import("@/pages/Library").then((m) => ({ default: m.LibraryPage })));
const LibraryItemPage = React.lazy(() => import("@/pages/LibraryItem").then((m) => ({ default: m.LibraryItemPage })));
const VideoLibraryPage = React.lazy(() => import("@/pages/VideoLibrary").then((m) => ({ default: m.VideoLibraryPage })));
const HadithBooksPage = React.lazy(() => import("@/pages/HadithBooks").then((m) => ({ default: m.HadithBooksPage })));
const HadithBookViewPage = React.lazy(() => import("@/pages/HadithBookView").then((m) => ({ default: m.HadithBookViewPage })));
const HadithReaderPage = React.lazy(() => import("@/pages/HadithReader").then((m) => ({ default: m.HadithReaderPage })));
const HadithMemoPage = React.lazy(() => import("@/pages/HadithMemo").then((m) => ({ default: m.HadithMemoPage })));
const CompanionsPage = React.lazy(() => import("@/pages/Companions"));
const SeerahPage = React.lazy(() => import("@/pages/SeerahTimeline"));
const QuranPlansPage = React.lazy(() => import("@/pages/QuranPlans").then((m) => ({ default: m.QuranPlansPage })));
const CustomAdhkarPage = React.lazy(() => import("@/pages/CustomAdhkar").then((m) => ({ default: m.CustomAdhkarPage })));
const NearbyMosquesPage = React.lazy(() => import("@/pages/NearbyMosques").then((m) => ({ default: m.NearbyMosquesPage })));
const TafsirPage = React.lazy(() => import("@/pages/Tafsir").then((m) => ({ default: m.TafsirPage })));
const ShortsPage = React.lazy(() => import("@/pages/Shorts").then((m) => ({ default: m.ShortsPage })));

// ── الإعجاز العلمي (MIRC) section ──
import { IjazShell } from "@/components/layout/IjazShell";
const IjazHome          = React.lazy(() => import("@/ijaz/pages/IjazHome"));
const IjazMiracles      = React.lazy(() => import("@/ijaz/pages/IjazMiracles"));
const IjazMiracleDetail = React.lazy(() => import("@/ijaz/pages/IjazMiracleDetail"));
const IjazCategory      = React.lazy(() => import("@/ijaz/pages/IjazCategory"));
const IjazJourney       = React.lazy(() => import("@/ijaz/pages/IjazJourney"));
const IjazRefute        = React.lazy(() => import("@/ijaz/pages/IjazRefute"));
const IjazTimeline      = React.lazy(() => import("@/ijaz/pages/IjazTimeline"));
const IjazVerseExplorer = React.lazy(() => import("@/ijaz/pages/IjazVerseExplorer"));
const IjazSearch        = React.lazy(() => import("@/ijaz/pages/IjazSearch"));

export default function App() {
  const accountScope = useCloudSync();

  if (accountScope.needsImportChoice) {
    return (
      <main className="min-h-screen-safe flex items-center justify-center p-6" dir="rtl">
        <section className="w-full max-w-lg rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-6">
          <h1 className="text-xl font-bold">بيانات هذا الجهاز وحسابك</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            وجدنا بيانات محفوظة على هذا الجهاز. اختر إن كنت تريد نسخها إلى حسابك أو إبقاءها على الجهاز فقط.
            ستبقى النسخة الأصلية محفوظة على هذا الجهاز في الحالتين.
          </p>
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              disabled={accountScope.importing || accountScope.checkingImport}
              onClick={() => void accountScope.chooseImport("copy", accountScope.includeCompanionData)}
              className="min-h-[48px] rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--on-accent)] disabled:opacity-50"
            >
              {accountScope.checkingImport ? "جارٍ فحص البيانات المحلية…" : accountScope.importing ? "جارٍ نسخ البيانات بأمان…" : "نسخ بيانات هذا الجهاز إلى الحساب"}
            </button>
            {accountScope.hasLocalCompanionData && (
              <label className="flex items-start gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--card-2)] p-3 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={accountScope.includeCompanionData}
                  disabled={accountScope.importing || accountScope.checkingImport}
                  onChange={(event) => accountScope.setIncludeCompanionData(event.currentTarget.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
                <span>
                  <span className="block font-medium">أضم سجل الرفيق وملفه وذاكرته إلى هذا الحساب على هذا الجهاز</span>
                  <span className="block text-xs text-[var(--muted)]">
                    اختياري وغير محدد مسبقًا. لا تدخل في المزامنة السحابية؛ وقد تُرسل البيانات اللازمة إلى خدمة الرفيق عند طلب رد.
                  </span>
                </span>
              </label>
            )}
            <button
              type="button"
              disabled={accountScope.importing || accountScope.checkingImport}
              onClick={() => void accountScope.chooseImport("keep")}
              className="min-h-[48px] rounded-2xl border border-[var(--stroke)] bg-[var(--card-2)] px-4 py-3 font-semibold disabled:opacity-50"
            >
              إبقاؤها على هذا الجهاز فقط
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!accountScope.ready) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center p-6" dir="rtl">
        <div className="w-full max-w-sm rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-6 text-center">
          {accountScope.error ? (
            <>
              <p role="alert" className="text-sm leading-7">تعذّر تحميل بيانات الحساب بأمان.</p>
              <button type="button" className="mt-4 min-h-[44px] rounded-2xl px-5" onClick={accountScope.retry}>
                إعادة المحاولة
              </button>
            </>
          ) : (
            <div role="status" aria-live="polite" className="text-sm leading-7">جارٍ تجهيز بياناتك…</div>
          )}
        </div>
      </div>
    );
  }

  return <AppContent />;
}

function AppContent() {
  useApplyTheme();
  const navigate = useNavigate();
  const [reminderScheduleRevision, setReminderScheduleRevision] = React.useState(0);
  const ensureDailyResets = useNoorStore((s) => s.ensureDailyResets);
  const reminders = useNoorStore((s) => s.reminders);
  const customReminders = useNoorStore((s) => s.customReminders);
  const onboardingDone = useNoorStore((s) => s.onboardingDone);
  const sectionCompletions = useNoorStore((s) => s.sectionCompletions);
  const progress = useNoorStore((s) => s.progress);
  const location = useLocation();
  const prayerTimes = usePrayerTimes();

  React.useEffect(() => {
    const reconcile = () => setReminderScheduleRevision((revision) => revision + 1);
    window.addEventListener(CUSTOM_REMINDER_PERMISSION_CHANGE_EVENT, reconcile);
    const stopListeningForResume = listenForAppResume(reconcile);
    return () => {
      window.removeEventListener(CUSTOM_REMINDER_PERMISSION_CHANGE_EVENT, reconcile);
      stopListeningForResume();
    };
  }, []);
  const fajrTime = prayerTimes.data?.data?.timings?.Fajr ?? null;
  const notificationPrayerTimings = React.useMemo(() => {
    const timings = prayerTimes.data?.data?.timings;
    if (!timings) return null;

    return {
      Fajr: timings.Fajr,
      Sunrise: timings.Sunrise,
      Dhuhr: timings.Dhuhr,
      Asr: timings.Asr,
      Maghrib: timings.Maghrib,
      Isha: timings.Isha,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    prayerTimes.data?.data?.timings?.Asr,
    prayerTimes.data?.data?.timings?.Dhuhr,
    prayerTimes.data?.data?.timings?.Fajr,
    prayerTimes.data?.data?.timings?.Isha,
    prayerTimes.data?.data?.timings?.Maghrib,
    prayerTimes.data?.data?.timings?.Sunrise,
  ]);

  const tomorrowNotificationPrayerTimings = React.useMemo(() => {
    const timings = prayerTimes.tomorrow?.data?.timings;
    if (!timings) return null;

    return {
      Fajr: timings.Fajr,
      Sunrise: timings.Sunrise,
      Dhuhr: timings.Dhuhr,
      Asr: timings.Asr,
      Maghrib: timings.Maghrib,
      Isha: timings.Isha,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    prayerTimes.tomorrow?.data?.timings?.Asr,
    prayerTimes.tomorrow?.data?.timings?.Dhuhr,
    prayerTimes.tomorrow?.data?.timings?.Fajr,
    prayerTimes.tomorrow?.data?.timings?.Isha,
    prayerTimes.tomorrow?.data?.timings?.Maghrib,
    prayerTimes.tomorrow?.data?.timings?.Sunrise,
  ]);

  // N6: Smart-reminder completion snapshot — lets reminders skip already-done azkar
  // and switch to a "finish what you started" nudge when partially complete.
  const reminderCompletion = React.useMemo(() => {
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const doneToday = (id: string) => (sectionCompletions[id] ?? []).includes(todayISO);
    const startedToday = (id: string) =>
      Object.entries(progress).some(([k, v]) => k.startsWith(`${id}:`) && Number(v) > 0);
    return {
      morningDone: doneToday("morning"),
      morningStarted: startedToday("morning"),
      eveningDone: doneToday("evening"),
      eveningStarted: startedToday("evening"),
    };
  }, [sectionCompletions, progress]);

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
      void import("@/pages/VideoLibrary");
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

  // Quran Foundation translation text may remain in local storage for at most
  // one week. Prune at startup and when the app returns from the background.
  React.useEffect(() => {
    const prune = () => { void idbPruneQuranTranslationCache(); };
    prune();
    document.addEventListener("visibilitychange", prune);
    return () => document.removeEventListener("visibilitychange", prune);
  }, []);

  React.useEffect(() => {
    const w = globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    // Respect the OS/browser data-saver signal — this prefetch pulls the
    // entire Quran's word-by-word dataset (114 requests) in the background;
    // don't spend a metered/limited connection's data budget on it uninvited.
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const isDataConstrained = !!connection?.saveData || connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g";

    const prepareMushaf = () => {
      if (isDataConstrained) return;
      // Only warm the small Mushaf core on first launch. WBW (Tajweed
      // colors) is heavier — defer it until the user actually opens
      // Mushaf at least once, so fresh installs don't burn 30 MB before
      // any user interaction.
      const hasOpenedMushaf = localStorage.getItem("athar_mushaf_opened") === "1";
      void ensureMushafCoreOffline().catch(() => {
        // Settings and the reader expose a retry path if the first background attempt fails.
      });
      if (hasOpenedMushaf) {
        void ensureAllWbwSurahsCached().catch(() => {
          // Mushaf still exposes a manual retry inside the reader if background warming fails.
        });
      }
    };

    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(prepareMushaf);
      return () => {
        if (typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(id);
      };
    }

    const timeoutId = globalThis.setTimeout(prepareMushaf, 1200);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  React.useEffect(() => {
    ensureDailyResets(fajrTime);
    let midnightTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let ibadahTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
    void syncReminders(reminders, notificationPrayerTimings, reminderCompletion, tomorrowNotificationPrayerTimings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    notificationPrayerTimings,
    tomorrowNotificationPrayerTimings,
    reminders,
    reminderCompletion.morningDone,
    reminderCompletion.morningStarted,
    reminderCompletion.eveningDone,
    reminderCompletion.eveningStarted,
    reminderScheduleRevision,
  ]);

  // Schedule the next-N firings of every user-defined reminder. Each
  // re-render of `customReminders` (add / edit / toggle / delete)
  // tears down the previous schedule and starts fresh. Prayer-time data is
  // threaded through so prayer_aligned/sunnah_aligned reminders resolve to
  // a real time instead of silently never firing (they'd otherwise fall
  // back to their usually-unset `atTimeOfDay`).
  React.useEffect(() => {
    const cleanup = syncCustomReminders(customReminders, { prayerTimes: prayerTimes.getPrayerTimingsForDate });
    return cleanup;
  }, [customReminders, prayerTimes.getPrayerTimingsForDate, reminderScheduleRevision]);

  // 11C: Pre-create default notification channels on native platforms
  React.useEffect(() => {
    void ensureDefaultNotificationChannels();
  }, []);

  // Widget data bridge: sync adhkar + wird progress to native SharedPreferences
  // so Android home-screen widgets can display live data. Before pushing data
  // out, pull in tasbeeh taps made on the home-screen widget so they count
  // toward streaks and stats.
  React.useEffect(() => {
    const syncWidgets = async () => {
      const { mergeTasbeehFromWidget } = await import("@/lib/tasbeehWidgetSync");
      await mergeTasbeehFromWidget();
      await syncAllWidgets();
    };
    void syncWidgets();
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncWidgets();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // 3C: Register notification deep-link listener on native platforms
  React.useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    registerNotificationDeepLinkListener(navigate).then((fn) => {
      if (cancelled) fn();
      else cleanup = fn;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [navigate]);

  // Custom adhkar arriving from another device change what the adhkar DB
  // should render, and that DB is a cached query — without invalidating it the
  // user's own adhkar would sit in localStorage unseen until a full reload.
  const queryClient = useQueryClient();
  React.useEffect(() => {
    const onPacks = () => { void queryClient.invalidateQueries({ queryKey: ["adhkar-db"] }); };
    window.addEventListener("athar-data-packs-changed", onPacks);
    return () => window.removeEventListener("athar-data-packs-changed", onPacks);
  }, [queryClient]);

  // Deliberately NOT cleared on navigation. The confetti is a reward for
  // finishing a dhikr, and cutting it off the instant the screen changes is
  // exactly what made it vanish mid-air — finishing an item often navigates.
  // It is drawn on its own top-level canvas that belongs to no screen, so it
  // is free to finish falling wherever the user goes. Backgrounding the app
  // still clears it (see celebrate.ts): rAF freezes there, so a burst caught
  // mid-flight could never land on its own.

  return (
    <>
      {showSplash && <SplashIntro onDone={() => setShowSplash(false)} />}
      {!showSplash && !onboardingDone && <OnboardingFlow />}
      <LeaderboardSyncBridge />
      <PwaInstallBanner />
      <Routes>
        <Route path="mushaf/:page?" element={<S><MushafPage /></S>} />
        {/* ── الإعجاز العلمي section (full-screen dark theme) ── */}
        <Route path="ijaz" element={<IjazShell />}>
          <Route index element={<S><IjazHome /></S>} />
          <Route path="miracles" element={<S><IjazMiracles /></S>} />
          <Route path="miracles/:slug" element={<S><IjazMiracleDetail /></S>} />
          <Route path="categories/:category" element={<S><IjazCategory /></S>} />
          <Route path="journey" element={<S><IjazJourney /></S>} />
          <Route path="refute" element={<S><IjazRefute /></S>} />
          <Route path="timeline" element={<S><IjazTimeline /></S>} />
          <Route path="verse-explorer" element={<S><IjazVerseExplorer /></S>} />
          <Route path="search" element={<S><IjazSearch /></S>} />
        </Route>
        <Route element={<AppShell />}>
          <Route index element={<S><HomePage /></S>} />
          <Route path="c/:id" element={<S><CategoryPage /></S>} />
          <Route path="search" element={<S><SearchPage /></S>} />
          <Route path="favorites" element={<S><FavoritesPage /></S>} />
          <Route path="shorts" element={<S><ShortsPage /></S>} />
          <Route path="quran" element={<S><QuranPage /></S>} />
          <Route path="quran/plans" element={<S><QuranPlansPage /></S>} />
          <Route path="adhkar/custom" element={<S><CustomAdhkarPage /></S>} />
          <Route path="sebha" element={<S><SebhaPage /></S>} />
          <Route path="tafsir" element={<S><TafsirPage /></S>} />
          <Route path="companion" element={<S><CompanionPage /></S>} />
          <Route path="reminders" element={<S><RemindersPage /></S>} />
          <Route path="library/sharh" element={<S><HadithSharhPage /></S>} />
          <Route path="tasmee" element={<S><TasmeePage /></S>} />
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
          <Route path="angels" element={<S><KnowledgeSectionPage config={ANGELS_SECTION} /></S>} />
          <Route path="divine-books" element={<S><KnowledgeSectionPage config={DIVINE_BOOKS_SECTION} /></S>} />
          <Route path="islam-pillars" element={<S><KnowledgeSectionPage config={ISLAM_PILLARS_SECTION} /></S>} />
          <Route path="faith-pillars" element={<S><KnowledgeSectionPage config={FAITH_PILLARS_SECTION} /></S>} />
          <Route path="faith-branches" element={<S><KnowledgeSectionPage config={FAITH_BRANCHES_SECTION} /></S>} />
          <Route path="major-sins" element={<S><KnowledgeSectionPage config={MAJOR_SINS_SECTION} /></S>} />
          <Route path="prayer-guide" element={<S><PrayerGuidePage /></S>} />
          <Route path="wudu" element={<S><WuduGuidePage /></S>} />
          <Route path="ruqyah" element={<S><RuqyahPage /></S>} />
          <Route path="library" element={<S><LibraryPage /></S>} />
          {/* Hadith used to have two separate pages here and at /hadith with
              different stats and different designs — merged into one at
              /hadith; this just keeps old links working. */}
          <Route path="library/hadith" element={<Navigate to="/hadith" replace />} />
          <Route path="library/:collectionId/:entryId" element={<S><LibraryItemPage /></S>} />
          <Route path="video-library" element={<S><VideoLibraryPage /></S>} />
          <Route path="video-library/course/:courseId" element={<S><VideoLibraryPage /></S>} />
          <Route path="video-library/watch/:videoId" element={<S><VideoLibraryPage /></S>} />
          <Route path="video-library/topic/:topicId" element={<S><VideoLibraryPage /></S>} />
          <Route path="video-library/:channelId" element={<S><VideoLibraryPage /></S>} />
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
