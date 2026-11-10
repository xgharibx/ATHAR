// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adhkarQuery: {
    data: undefined as unknown,
    error: null as unknown,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  },
}));

vi.mock("@/data/useAdhkarDB", () => ({ useAdhkarDB: () => mocks.adhkarQuery }));
vi.mock("@/data/useQuranDB", () => ({ useQuranDB: () => ({ data: undefined }) }));
vi.mock("@/data/useHadithBook", () => ({ useHadithPack: () => ({ data: undefined }) }));
vi.mock("@/hooks/useScrollRestoration", () => ({ useScrollRestoration: () => undefined }));

import { FavoritesPage } from "@/pages/Favorites";
import { dhikrStateKey } from "@/lib/dhikrItemIdentity";
import { useNoorStore } from "@/store/noorStore";

let root: Root;
let container: HTMLDivElement;
let originalState: Pick<ReturnType<typeof useNoorStore.getState>, "favorites" | "customPacks">;

function renderFavorites() {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes><Route path="/" element={<FavoritesPage />} /></Routes>
      </MemoryRouter>,
    );
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  originalState = {
    favorites: useNoorStore.getState().favorites,
    customPacks: useNoorStore.getState().customPacks,
  };
  useNoorStore.setState({
    favorites: { [dhikrStateKey("morning", 0, "morning-item")]: true },
    customPacks: [],
  });
  mocks.adhkarQuery.data = undefined;
  mocks.adhkarQuery.error = null;
  mocks.adhkarQuery.isLoading = false;
  mocks.adhkarQuery.isFetching = false;
  mocks.adhkarQuery.refetch.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  useNoorStore.setState(originalState);
});

describe("Favorites while the adhkar catalog is unavailable", () => {
  it("offers retry instead of claiming saved adhkar favorites do not exist", () => {
    mocks.adhkarQuery.error = new Error("catalog unavailable");
    renderFavorites();

    expect(container.textContent).toContain("تعذّر تحميل الأذكار");
    expect(container.textContent).not.toContain("لا توجد مفضلة بعد");
    const retry = container.querySelector<HTMLButtonElement>('button[aria-label="إعادة تحميل الأذكار"]');
    expect(retry).not.toBeNull();
    act(() => retry?.click());
    expect(mocks.adhkarQuery.refetch).toHaveBeenCalledOnce();
  });

  it("shows a loading state instead of an empty state before saved adhkar can be resolved", () => {
    mocks.adhkarQuery.isLoading = true;
    renderFavorites();

    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(container.textContent).not.toContain("لا توجد مفضلة بعد");
  });

  it("keeps cached favorites visible and offers a non-blocking retry after refresh failure", () => {
    mocks.adhkarQuery.data = {
      db: { sections: [] },
      flat: [{
        key: dhikrStateKey("morning", 0, "morning-item"),
        sectionId: "morning",
        sectionTitle: "أذكار الصباح",
        index: 0,
        itemId: "morning-item",
        text: "سبحان الله وبحمده",
        count: 3,
      }],
    };
    mocks.adhkarQuery.error = new Error("refresh unavailable");
    renderFavorites();

    expect(container.textContent).toContain("سبحان الله وبحمده");
    expect(container.textContent).toContain("تعذّر تحديث الأذكار");
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    const retry = container.querySelector<HTMLButtonElement>('button[aria-label="إعادة تحميل الأذكار"]');
    expect(retry).not.toBeNull();
    act(() => retry?.click());
    expect(mocks.adhkarQuery.refetch).toHaveBeenCalledOnce();
  });

  it("shows local custom favorites without blocking on an unavailable bundled catalog", () => {
    useNoorStore.setState({
      favorites: { [dhikrStateKey("custom_trip", 0, "custom-item")]: true },
      customPacks: [{
        id: "custom_trip",
        title: "أذكار السفر",
        createdAt: "2026-11-09",
        items: [{ id: "custom-item", text: "دعاء السفر المحفوظ", count: 1 }],
      }],
    });
    mocks.adhkarQuery.error = new Error("bundled catalog unavailable");
    renderFavorites();

    expect(container.textContent).toContain("دعاء السفر المحفوظ");
    expect(container.textContent).not.toContain("لا توجد مفضلة بعد");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("does not claim favorites are empty when cached data misses a saved item and refresh fails", () => {
    mocks.adhkarQuery.data = {
      db: { sections: [] },
      flat: [{
        key: dhikrStateKey("evening", 0, "evening-item"),
        sectionId: "evening",
        sectionTitle: "أذكار المساء",
        index: 0,
        itemId: "evening-item",
        text: "حسبي الله لا إله إلا هو",
        count: 1,
      }],
    };
    mocks.adhkarQuery.error = new Error("refresh unavailable");
    renderFavorites();

    expect(container.textContent).toContain("تعذّر تحديث الأذكار");
    expect(container.textContent).not.toContain("لا توجد مفضلة بعد");
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });

  it("explains when a successful catalog load cannot resolve a saved favorite", () => {
    mocks.adhkarQuery.data = {
      db: { sections: [] },
      flat: [{
        key: dhikrStateKey("evening", 0, "evening-item"),
        sectionId: "evening",
        sectionTitle: "أذكار المساء",
        index: 0,
        itemId: "evening-item",
        text: "حسبي الله لا إله إلا هو",
        count: 1,
      }],
    };
    renderFavorites();

    expect(container.textContent).toContain("تعذّر العثور على بعض الأذكار المحفوظة");
    expect(container.textContent).not.toContain("لا توجد مفضلة بعد");
    const retry = container.querySelector<HTMLButtonElement>('button[aria-label="إعادة تحميل الأذكار"]');
    expect(retry).not.toBeNull();
    act(() => retry?.click());
    expect(mocks.adhkarQuery.refetch).toHaveBeenCalledOnce();
  });

  it("keeps resolvable favorites visible alongside a missing-item recovery notice", () => {
    useNoorStore.setState({
      favorites: {
        [dhikrStateKey("morning", 0, "morning-item")]: true,
        [dhikrStateKey("morning", 1, "missing-item")]: true,
      },
    });
    mocks.adhkarQuery.data = {
      db: { sections: [] },
      flat: [{
        key: dhikrStateKey("morning", 0, "morning-item"),
        sectionId: "morning",
        sectionTitle: "أذكار الصباح",
        index: 0,
        itemId: "morning-item",
        text: "سبحان الله وبحمده",
        count: 3,
      }],
    };
    renderFavorites();

    expect(container.textContent).toContain("سبحان الله وبحمده");
    expect(container.textContent).toContain("تعذّر العثور على بعض الأذكار المحفوظة");
    expect(container.textContent).not.toContain("لا توجد مفضلة بعد");
  });
});
