// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prayerTimesMock = vi.hoisted(() => ({
  data: undefined as any,
  tomorrow: undefined as any,
  getPrayerTimingsForDate: vi.fn(),
}));

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
  usePrayerTimes: () => prayerTimesMock,
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
let originalState: Pick<ReturnType<typeof useNoorStore.getState>, "customPacks" | "lastVisitedSectionId" | "prefs" | "dailyWirdDone" | "dailyChecklist">;

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
    dailyWirdDone: state.dailyWirdDone,
    dailyChecklist: state.dailyChecklist,
  };
  prayerTimesMock.data = undefined;
  prayerTimesMock.tomorrow = undefined;
  prayerTimesMock.getPrayerTimingsForDate.mockReset();
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
  vi.useRealTimers();
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

  it("refreshes the hero and smart adhkar actions at the local-hour boundary", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 14, 59, 30));
    const state = useNoorStore.getState();
    useNoorStore.setState({
      prefs: {
        ...state.prefs,
        homeWidgets: { ...state.prefs.homeWidgets, smart: true },
      },
      dailyWirdDone: { ...state.dailyWirdDone, "2026-11-09": true },
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/"]}>
          <Routes><Route path="/" element={<HomePage />} /></Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    const buttons = () => Array.from(container.querySelectorAll("button"));
    expect(buttons().some((button) => button.textContent?.includes("ابدأ بأذكار الصباح"))).toBe(true);
    expect(buttons().some((button) => button.textContent?.includes("🌙 أذكار المساء"))).toBe(false);

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });

    expect(buttons().some((button) => button.textContent?.includes("ابدأ بأذكار المساء"))).toBe(true);
    expect(buttons().some((button) => button.textContent?.includes("🌙 أذكار المساء"))).toBe(true);
  });

  it("refreshes the smart prayer suggestion when a prayer time passes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 12, 59));
    prayerTimesMock.data = {
      data: {
        timings: {
          Fajr: "13:00", Dhuhr: "14:00", Asr: "15:30", Maghrib: "18:00", Isha: "19:30",
        },
      },
    };
    prayerTimesMock.getPrayerTimingsForDate.mockReturnValue({
      Fajr: "04:58", Dhuhr: "12:00", Asr: "15:30", Maghrib: "18:00", Isha: "19:30",
    });
    const state = useNoorStore.getState();
    useNoorStore.setState({
      prefs: {
        ...state.prefs,
        homeWidgets: { ...state.prefs.homeWidgets, smart: true },
      },
      dailyWirdDone: { ...state.dailyWirdDone, "2026-11-09": true },
      dailyChecklist: { ...state.dailyChecklist, "2026-11-09": {} },
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/"]}>
          <Routes><Route path="/" element={<HomePage />} /></Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
    });
    expect(prayerTimesMock.getPrayerTimingsForDate).toHaveBeenCalledWith(new Date(2026, 10, 10));
    expect(container.textContent).toContain("استعد لصلاة الفجر القادمة");

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });

    expect(container.textContent).not.toContain("استعد لصلاة الفجر القادمة");
    expect(container.textContent).toContain("ثبّت الصلوات القادمة في وقتها");
  });
});
