// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchSharhRoots: vi.fn(),
  fetchSharhChildren: vi.fn(),
  fetchSharhList: vi.fn(),
  fetchSharhHadith: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams()],
}));
vi.mock("@/hooks/useScrollRestoration", () => ({ useScrollRestoration: () => {} }));
vi.mock("@/lib/hadithSharhAPI", () => api);
vi.mock("react-hot-toast", () => ({ toast: { success: vi.fn() } }));

import { HadithSharhPage } from "@/pages/HadithSharh";

type Category = { id: string; title: string; hadeeths_count: string; parent_id: string | null };

const rootA: Category = { id: "root-a", title: "القسم أ", hadeeths_count: "2", parent_id: null };
const rootB: Category = { id: "root-b", title: "القسم ب", hadeeths_count: "2", parent_id: null };
const childA: Category = { id: "child-a", title: "فرع أ", hadeeths_count: "1", parent_id: rootA.id };
const childB: Category = { id: "child-b", title: "فرع ب", hadeeths_count: "1", parent_id: rootB.id };
const listA = { items: [{ id: "hadith-a", title: "حديث أ" }], hasMore: false };
const listB = { items: [{ id: "hadith-b", title: "حديث ب" }], hasMore: false };
const detailA = { id: "hadith-a", hadeeth: "نص أ", attribution: "مصدر أ", grade: "صحيح", explanation: "شرح أ" };
const detailB = { id: "hadith-b", hadeeth: "نص ب", attribution: "مصدر ب", grade: "صحيح", explanation: "شرح ب" };

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function mountPage() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(createElement(HadithSharhPage)));
}

function buttonContaining(label: string): HTMLButtonElement {
  const button = Array.from(container!.querySelectorAll("button"))
    .find((candidate) => candidate.textContent?.includes(label));
  if (!button) throw new Error(`Button not found: ${label}`);
  return button;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function click(label: string) {
  await act(async () => {
    buttonContaining(label).click();
    await Promise.resolve();
  });
}

async function clickBack() {
  const button = container!.querySelector<HTMLButtonElement>('button[aria-label="رجوع"]');
  if (!button) throw new Error("Back button not found");
  await act(async () => {
    button.click();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.fetchSharhRoots.mockReset().mockResolvedValue([rootA, rootB]);
  api.fetchSharhChildren.mockReset();
  api.fetchSharhList.mockReset();
  api.fetchSharhHadith.mockReset();
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.unstubAllGlobals();
});

describe("Hadith Sharh category navigation", () => {
  it("clears the previous root's child buttons while the next root loads", async () => {
    const nextRootChildren = deferred<Category[]>();
    api.fetchSharhChildren
      .mockResolvedValueOnce([childA])
      .mockReturnValueOnce(nextRootChildren.promise);

    mountPage();
    await flush();
    await click(rootA.title);
    await flush();
    expect(container?.textContent).toContain(childA.title);

    await clickBack();
    await click(rootB.title);

    expect(container?.textContent).toContain(rootB.title);
    expect(container?.textContent).not.toContain(childA.title);

    nextRootChildren.resolve([childB]);
    await flush();
  });

  it("ignores an older root response that resolves after the active root", async () => {
    const responseA = deferred<Category[]>();
    const responseB = deferred<Category[]>();
    api.fetchSharhChildren.mockImplementation((id: string) =>
      id === rootA.id ? responseA.promise : responseB.promise,
    );

    mountPage();
    await flush();
    await click(rootA.title);
    await clickBack();
    await click(rootB.title);
    expect(api.fetchSharhChildren.mock.calls).toEqual([[rootA.id], [rootB.id]]);

    await act(async () => {
      responseB.resolve([childB]);
      await responseB.promise;
    });
    await vi.waitFor(() => expect(container?.textContent).toContain(childB.title));
    await act(async () => {
      responseA.resolve([childA]);
      await responseA.promise;
    });
    await flush();

    expect(container?.textContent).toContain(rootB.title);
    expect(container?.textContent).toContain(childB.title);
    expect(container?.textContent).not.toContain(childA.title);
  });

  it("ignores an older hadith-list response after navigating to another category", async () => {
    const responseA = deferred<typeof listA>();
    const responseB = deferred<typeof listB>();
    api.fetchSharhChildren.mockImplementation((id: string) => Promise.resolve(id === rootA.id ? [childA] : [childB]));
    api.fetchSharhList.mockImplementation((id: string) => id === rootA.id ? responseA.promise : responseB.promise);

    mountPage();
    await flush();
    await click(rootA.title);
    await flush();
    await click("كل أحاديث القسم");
    await clickBack();
    await click(rootB.title);
    await flush();
    await click("كل أحاديث القسم");

    await act(async () => {
      responseB.resolve(listB);
      await responseB.promise;
    });
    expect(container?.textContent).toContain("حديث ب");

    await act(async () => {
      responseA.resolve(listA);
      await responseA.promise;
    });
    await flush();
    expect(container?.textContent).toContain("حديث ب");
    expect(container?.textContent).not.toContain("حديث أ");
  });

  it("ignores an older hadith-detail response after opening a different hadith", async () => {
    const responseA = deferred<typeof detailA>();
    const responseB = deferred<typeof detailB>();
    api.fetchSharhChildren.mockImplementation((id: string) => Promise.resolve(id === rootA.id ? [childA] : []));
    api.fetchSharhList.mockResolvedValue({ items: [
      { id: "hadith-a", title: "حديث أ" },
      { id: "hadith-b", title: "حديث ب" },
    ], hasMore: false });
    api.fetchSharhHadith.mockImplementation((id: string) => id === detailA.id ? responseA.promise : responseB.promise);

    mountPage();
    await flush();
    await click(rootA.title);
    await flush();
    await click("كل أحاديث القسم");
    await flush();
    await click("حديث أ");
    await clickBack();
    await flush();
    await click("حديث ب");

    await act(async () => {
      responseB.resolve(detailB);
      await responseB.promise;
    });
    expect(container?.textContent).toContain("نص ب");

    await act(async () => {
      responseA.resolve(detailA);
      await responseA.promise;
    });
    await flush();
    expect(container?.textContent).toContain("نص ب");
    expect(container?.textContent).not.toContain("نص أ");
  });
});
