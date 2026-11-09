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
import { useNoorStore } from "@/store/noorStore";

let container: HTMLDivElement;
let root: Root;
let originalCustomPacks: ReturnType<typeof useNoorStore.getState>["customPacks"];

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  mocks.adhkarResult.refetch.mockReset();
  originalCustomPacks = useNoorStore.getState().customPacks;
  useNoorStore.setState({
    customPacks: [{
      id: "custom_trip",
      title: "أذكار السفر",
      createdAt: "2026-11-09T00:00:00.000Z",
      items: [{ text: "سبحان الله", count: 3 }],
    }],
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  useNoorStore.setState({ customPacks: originalCustomPacks });
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
});
