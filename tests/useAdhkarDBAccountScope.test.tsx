// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadAdhkarDB: vi.fn(),
  migrateDhikrItemState: vi.fn(),
}));

vi.mock("@/data/load", () => ({ loadAdhkarDB: mocks.loadAdhkarDB }));
vi.mock("@/store/noorStore", () => ({
  useNoorStore: (selector: (state: { migrateDhikrItemState: typeof mocks.migrateDhikrItemState; customPacks: never[] }) => unknown) =>
    selector({ migrateDhikrItemState: mocks.migrateDhikrItemState, customPacks: [] }),
}));

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { setAccountStorageOwner } from "@/lib/accountStorageScope";

function AdhkarProbe() {
  const { data } = useAdhkarDB();
  return <output>{data?.db.sections.map((section) => section.id).join(",") ?? "loading"}</output>;
}

let root: Root;
let container: HTMLDivElement;
let queryClient: QueryClient;

function mountProbe() {
  root = createRoot(container);
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <AdhkarProbe />
      </QueryClientProvider>,
    );
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  setAccountStorageOwner("local");
  mocks.migrateDhikrItemState.mockReset();
  mocks.loadAdhkarDB.mockReset();
  mocks.loadAdhkarDB.mockImplementation(() => new Promise(() => undefined));
  queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 60 * 1000, retry: false } },
  });
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => root?.unmount());
  queryClient.clear();
  container.remove();
  setAccountStorageOwner("local");
});

describe("account-scoped adhkar query cache", () => {
  it("uses a different cached query when the active account changes", () => {
    setAccountStorageOwner("user:account-a");
    mountProbe();

    const accountAQuery = queryClient.getQueryCache().getAll().find((query) => query.queryKey[0] === "adhkar-db");
    expect(accountAQuery).toBeDefined();

    act(() => root.unmount());
    act(() => queryClient.setQueryData(accountAQuery!.queryKey, {
      db: { sections: [{ id: "private-account-a", title: "أذكار الحساب الأول", content: [] }] },
      flat: [],
    }));
    setAccountStorageOwner("user:account-b");
    mountProbe();

    const accountBQuery = queryClient.getQueryCache().getAll()
      .find((query) => query.queryKey[0] === "adhkar-db" && query.getObserversCount() > 0);
    expect(accountBQuery).toBeDefined();
    expect(accountBQuery!.queryKey).not.toEqual(accountAQuery!.queryKey);
    expect(container.textContent).not.toContain("private-account-a");
  });
});
