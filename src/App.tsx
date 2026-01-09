import * as React from "react";
import { Routes, Route } from "react-router-dom";

import { useApplyTheme } from "@/hooks/useApplyTheme";
import { AppShell } from "@/components/layout/AppShell";

import { HomePage } from "@/pages/Home";
import { CategoryPage } from "@/pages/Category";
import { SearchPage } from "@/pages/Search";
import { FavoritesPage } from "@/pages/Favorites";
import { SettingsPage } from "@/pages/Settings";
import { SourcesPage } from "@/pages/Sources";
import { InsightsPage } from "@/pages/Insights";
import { NotFoundPage } from "@/pages/NotFound";

export default function App() {
  useApplyTheme();

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="c/:id" element={<CategoryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
