// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adhkarResult: { data: undefined as unknown, isLoading: false, error: new Error("catalog offline"), refetch: vi.fn() },
}));

vi.mock("@/data/useAdhkarDB", () => ({ useAdhkarDB: () => mocks.adhkarResult }));
vi.mock("@/hooks/usePrayerTimes", () => ({ usePrayerTimes: () => ({ data: undefined }) }));

import { CategoryPage } from "@/pages/Category";
import { addCustomDhikrItem, loadPacks, savePacks } from "@/data/packs";
import { useNoorStore } from "@/store/noorStore";

let container: HTMLDivElement;
let root: Root;
let originalCustomPacks: ReturnType<typeof useNoorStore.getState>["customPacks"];
let originalIndexedState: Pick<ReturnType<typeof useNoorStore.getState>, "progress" | "favorites" | "sectionItemOrder" | "sectionResume" | "migratedDhikrStateKeys">;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  mocks.adhkarResult.refetch.mockReset();
  originalCustomPacks = useNoorStore.getState().customPacks;
  originalIndexedState = {
    progress: useNoorStore.getState().progress,
    favorites: useNoorStore.getState().favorites,
    sectionItemOrder: useNoorStore.getState().sectionItemOrder,
    sectionResume: useNoorStore.getState().sectionResume,
    migratedDhikrStateKeys: useNoorStore.getState().migratedDhikrStateKeys,
  };
  savePacks([]);
  mocks.adhkarResult.data = undefined;
  useNoorStore.setState({
    customPacks: [{
      id: "custom_trip",
      title: "أذكار السفر",
      createdAt: "2026-11-09T00:00:00.000Z",
      items: [{ text: "سبحان الله", count: 3 }],
    }],
    migratedDhikrStateKeys: {},
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  savePacks([]);
  useNoorStore.setState({ customPacks: originalCustomPacks, ...originalIndexedState });
});

describe("custom adhkar when the bundled catalog is unavailable", () => {
  it("still opens the locally saved pack and its dhikr", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    act(() => {
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={["/c/custom_trip"]}>
            <Routes><Route path="/c/:id" element={<CategoryPage />} /></Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain("أذكار السفر");
    expect(container.textContent).toContain("سبحان الله");
    expect(container.textContent).not.toContain("القسم غير موجود");
  });

  it("shows a retry action for a built-in section instead of saying it is missing", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    act(() => {
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={["/c/morning"]}>
            <Routes><Route path="/c/:id" element={<CategoryPage />} /></Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    const retry = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("إعادة المحاولة"));
    expect(container.textContent).toContain("تعذّر تحميل الأذكار");
    expect(container.textContent).not.toContain("القسم غير موجود");
    expect(retry).not.toBeUndefined();

    act(() => retry?.click());
    expect(mocks.adhkarResult.refetch).toHaveBeenCalledOnce();
  });

  it("keeps each remaining My Adhkar counter attached to its own text after deletion", () => {
    for (const text of ["الأول", "المحذوف", "الأخير"]) {
      addCustomDhikrItem({ text, count: 10 });
    }
    const items = loadPacks().flatMap((pack) => pack.sections)
      .find((section) => section.id === "my_adhkar")?.content ?? [];
    mocks.adhkarResult.data = { db: { sections: [{ id: "my_adhkar", title: "أذكاري", content: items }] }, flat: [] };
    useNoorStore.setState({
      progress: { "my_adhkar:0": 1, "my_adhkar:1": 2, "my_adhkar:2": 3 },
      favorites: { "my_adhkar:1": true, "my_adhkar:2": true },
      migratedDhikrStateKeys: {},
      sectionItemOrder: { my_adhkar: [2, 1, 0] },
      sectionResume: { my_adhkar: { index: 2, dayKey: "2026-11-09" } },
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    act(() => {
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={["/c/my_adhkar"]}>
            <Routes><Route path="/c/:id" element={<CategoryPage />} /></Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    const deleteButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-label="حذف الذكر"]'));
    expect(deleteButtons).toHaveLength(3);
    act(() => deleteButtons[1]?.click());
    const confirmDelete = Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.trim() === "تأكيد الحذف");
    expect(confirmDelete).toBeDefined();
    act(() => confirmDelete?.click());

    expect(useNoorStore.getState().progress).toEqual({
      [`my_adhkar:item:${encodeURIComponent(items[0]!.id!)}`]: 1,
      [`my_adhkar:item:${encodeURIComponent(items[2]!.id!)}`]: 3,
    });
    expect(useNoorStore.getState().favorites).toEqual({ [`my_adhkar:item:${encodeURIComponent(items[2]!.id!)}`]: true });
    expect(useNoorStore.getState().sectionItemOrder).toEqual({ my_adhkar: [1, 0] });
    expect(useNoorStore.getState().sectionResume.my_adhkar).toEqual({ index: 1, dayKey: "2026-11-09" });
  });
});
