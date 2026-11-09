// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/data/useAdhkarDB", () => ({
  useAdhkarDB: () => ({
    data: { db: { sections: [] }, flat: [] },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/data/useQuranDB", () => ({ useQuranDB: () => ({ data: undefined }) }));
vi.mock("@/data/useQuranPageMap", () => ({ useQuranPageMap: () => ({ data: undefined }) }));
vi.mock("@/hooks/usePrayerTimes", () => ({
  usePrayerTimes: () => ({ data: undefined }),
  formatPrayerHijriDate: () => "",
}));
vi.mock("@/hooks/useTodayKey", () => ({ useTodayKey: () => "2026-11-09" }));
vi.mock("@/hooks/useStartupReady", () => ({ useStartupReady: () => undefined }));
vi.mock("@/hooks/useScrollRestoration", () => ({
  useScrollRestoration: () => undefined,
  useElementScrollRestoration: () => ({ current: null }),
}));
vi.mock("@/components/ui/NewBadge", () => ({
  NewMark: () => null,
  useIsNew: () => false,
  markNewSeen: vi.fn(),
}));
vi.mock("@/components/layout/PrayerWidget", () => ({ PrayerWidget: () => null }));
vi.mock("@/components/ui/DailyCarousel", () => ({ DailyCarousel: () => null }));
vi.mock("@/components/brand/HomePulse", () => ({ default: () => null }));
vi.mock("@/lib/radioPlayer", () => ({
  getRadioState: () => ({ playing: false, loading: false }),
  subscribeRadio: () => () => undefined,
  toggleRadio: vi.fn(),
}));
vi.mock("@/lib/uxMetrics", () => ({ trackUxEvent: vi.fn() }));

import { HomePage } from "@/pages/Home";
import { useNoorStore } from "@/store/noorStore";

let root: Root;
let container: HTMLDivElement;
let originalState: Pick<ReturnType<typeof useNoorStore.getState>, "customPacks" | "lastVisitedSectionId" | "prefs">;

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const state = useNoorStore.getState();
  originalState = {
    customPacks: state.customPacks,
    lastVisitedSectionId: state.lastVisitedSectionId,
    prefs: state.prefs,
  };
  useNoorStore.setState({
    customPacks: [{ id: "custom_trip", title: "أذكار السفر", createdAt: "2026-11-09", items: [] }],
    lastVisitedSectionId: "custom_trip",
    prefs: {
      ...state.prefs,
      homeWidgets: {
        prayer: false,
        hadith: false,
        wisdom: false,
        smart: false,
        checklist: false,
        dailyStep: false,
        tasbeeh: false,
        dailyWird: false,
        dailyVerse: false,
        quests: false,
      },
    },
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  useNoorStore.setState(originalState);
});

describe("Home resume action", () => {
  it("resumes the last visited locally saved custom adhkar pack", async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/c/:id" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    const resume = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("تابع آخر قسم"));
    expect(resume).toBeDefined();
    act(() => resume?.click());
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe("/c/custom_trip");
  });
});
