// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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
vi.mock("@/data/useIslamicLibraryDB", () => ({ useIslamicLibraryDB: () => ({ data: undefined }) }));
vi.mock("@/data/useHadithBook", () => ({ useHadithPack: () => ({ data: undefined, isLoading: false }) }));
vi.mock("@/hooks/useScrollRestoration", () => ({ useScrollRestoration: () => undefined }));

import { SearchPage } from "@/pages/Search";
import { useNoorStore } from "@/store/noorStore";

let root: Root;
let container: HTMLDivElement;
let originalCustomPacks: ReturnType<typeof useNoorStore.getState>["customPacks"];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

function renderSearch() {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/c/:id" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

function enterSearchTerm(value: string) {
  const input = container.querySelector<HTMLInputElement>('input[aria-label="حقل البحث"]');
  if (!input) throw new Error("Search input was not rendered");
  act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  originalCustomPacks = useNoorStore.getState().customPacks;
  useNoorStore.setState({ customPacks: [] });
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
  useNoorStore.setState({ customPacks: originalCustomPacks });
});

describe("adhkar search recovery and custom packs", () => {
  it("shows retry when the adhkar catalog failed instead of claiming there are no matches", () => {
    mocks.adhkarQuery.error = new Error("catalog unavailable");
    renderSearch();
    enterSearchTerm("كلمة للبحث");

    expect(container.textContent).toContain("تعذّر تحميل الأذكار");
    expect(container.textContent).not.toContain("لا توجد نتائج لـ «كلمة للبحث»");
    expect(container.textContent?.match(/تعذّر/g) ?? []).toHaveLength(1);

    const retry = container.querySelector<HTMLButtonElement>('button[aria-label="إعادة تحميل الأذكار"]');
    expect(retry).not.toBeNull();
    act(() => retry?.click());
    expect(mocks.adhkarQuery.refetch).toHaveBeenCalledOnce();
  });

  it("searches and opens locally saved custom adhkar while the catalog is offline", () => {
    mocks.adhkarQuery.error = new Error("catalog unavailable");
    useNoorStore.setState({
      customPacks: [{
        id: "custom_trip",
        title: "أذكار السفر",
        createdAt: "2026-11-09T00:00:00.000Z",
        items: [
          { id: "duplicate_id", text: "اللهم احفظني في الطريق الطويل", count: 1 },
          { id: "duplicate_id", text: "دعاء السفر عند ركوب السيارة", count: 1 },
        ],
      }],
    });
    renderSearch();
    enterSearchTerm("الطريق الطويل");

    expect(container.textContent).toContain("اللهم احفظني في الطريق الطويل");
    expect(container.textContent).toContain("أذكار السفر");

    const result = Array.from(container.querySelectorAll("a"))
      .find((link) => link.textContent?.includes("اللهم احفظني في الطريق الطويل"));
    expect(result).toBeDefined();
    act(() => result?.click());
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe("/c/custom_trip?focus=0");
  });

  it("keeps copy actions separate from navigation and keyboard-visible", () => {
    mocks.adhkarQuery.data = {
      db: { sections: [] },
      flat: [{ key: "morning:0", sectionId: "morning", sectionTitle: "أذكار الصباح", index: 0, text: "سبحان الله", count: 3 }],
    };
    renderSearch();
    enterSearchTerm("سبحان الله");

    const resultItem = container.querySelector('[aria-label="نتائج الأذكار"] [role="listitem"]');
    expect(resultItem).not.toBeNull();
    expect(resultItem?.querySelectorAll("button button, a button, button a, a a")).toHaveLength(0);

    const copy = resultItem?.querySelector<HTMLButtonElement>('button[aria-label="نسخ"]');
    expect(copy?.className).toContain("opacity-60");
    expect(copy?.className).not.toContain("opacity-0");
    expect(copy?.className).toContain("group-focus-within:opacity-100");
    expect(copy?.className).toContain("focus-visible:opacity-100");
  });

  it("keeps normal no-results messaging after a successful catalog load", () => {
    mocks.adhkarQuery.data = {
      db: { sections: [] },
      flat: [{ key: "morning:0", sectionId: "morning", sectionTitle: "أذكار الصباح", index: 0, text: "سبحان الله", count: 3 }],
    };
    renderSearch();
    enterSearchTerm("كلمة للبحث");

    expect(container.textContent).toContain("لا توجد نتائج لـ «كلمة للبحث»");
    expect(container.textContent).not.toContain("تعذّر تحميل الأذكار");
  });
});
