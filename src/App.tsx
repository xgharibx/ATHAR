import * as React from "react";
import { Routes, Route } from "react-router-dom";

import { useApplyTheme } from "@/hooks/useApplyTheme";
import { AppShell } from "@/components/layout/AppShell";
import { useNoorStore } from "@/store/noorStore";

const HomePage = React.lazy(() => import("@/pages/Home").then((m) => ({ default: m.HomePage })));
const CategoryPage = React.lazy(() => import("@/pages/Category").then((m) => ({ default: m.CategoryPage })));
const SearchPage = React.lazy(() => import("@/pages/Search").then((m) => ({ default: m.SearchPage })));
const FavoritesPage = React.lazy(() => import("@/pages/Favorites").then((m) => ({ default: m.FavoritesPage })));
const SettingsPage = React.lazy(() => import("@/pages/Settings").then((m) => ({ default: m.SettingsPage })));
const SourcesPage = React.lazy(() => import("@/pages/Sources").then((m) => ({ default: m.SourcesPage })));
const InsightsPage = React.lazy(() => import("@/pages/Insights").then((m) => ({ default: m.InsightsPage })));
const RamadanPage = React.lazy(() => import("@/pages/Ramadan").then((m) => ({ default: m.RamadanPage })));
const LeaderboardPage = React.lazy(() => import("@/pages/Leaderboard").then((m) => ({ default: m.LeaderboardPage })));
const MissedPage = React.lazy(() => import("@/pages/Missed").then((m) => ({ default: m.MissedPage })));
const NotFoundPage = React.lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFoundPage })));
const QuranPage = React.lazy(() => import("@/pages/Quran").then((m) => ({ default: m.QuranPage })));
const SurahPage = React.lazy(() => import("@/pages/Surah").then((m) => ({ default: m.SurahPage })));

export default function App() {
  useApplyTheme();
  const ensureDailyResets = useNoorStore((s) => s.ensureDailyResets);

  React.useEffect(() => {
    const w = globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const runPrefetch = () => {
      void import("@/pages/Ramadan");
      void import("@/pages/Leaderboard");
      void import("@/pages/Missed");
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
    ensureDailyResets();
    let intervalId: number | null = null;

    const onVisible = () => {
      if (document.visibilityState === "visible") ensureDailyResets();
    };
    const onFocus = () => ensureDailyResets();

    document.addEventListener("visibilitychange", onVisible);
    globalThis.addEventListener("focus", onFocus);

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());

    const timeoutId = globalThis.setTimeout(() => {
      ensureDailyResets();
      intervalId = globalThis.setInterval(() => {
        ensureDailyResets();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    return () => {
      globalThis.clearTimeout(timeoutId);
      if (intervalId !== null) {
        globalThis.clearInterval(intervalId);
      }
      document.removeEventListener("visibilitychange", onVisible);
      globalThis.removeEventListener("focus", onFocus);
    };
  }, [ensureDailyResets]);

  return (
    <React.Suspense fallback={<div className="p-6 opacity-75">... جاري التحميل</div>}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="c/:id" element={<CategoryPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="quran" element={<QuranPage />} />
          <Route path="quran/:id" element={<SurahPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="ramadan" element={<RamadanPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="missed" element={<MissedPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </React.Suspense>
  );
}
