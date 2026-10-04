// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://www.athark.org/"}
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class WorkerDouble extends EventTarget {
  state: ServiceWorkerState = "installed";
  postMessage = vi.fn();
}

let worker: WorkerDouble;
let registration: EventTarget & {
  active: WorkerDouble;
  waiting: WorkerDouble | null;
  installing: WorkerDouble | null;
  update: ReturnType<typeof vi.fn>;
};
let workers: EventTarget & {
  controller: WorkerDouble | null;
  register: ReturnType<typeof vi.fn>;
};
let container: HTMLDivElement;
let root: Root | undefined;
let reload: ReturnType<typeof vi.fn>;
let confirm: ReturnType<typeof vi.spyOn>;
let open: ReturnType<typeof vi.spyOn>;
let listeners: Array<[EventTarget, string, EventListenerOrEventListenerObject]>;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  sessionStorage.clear();
  worker = new WorkerDouble();
  registration = Object.assign(new EventTarget(), {
    active: new WorkerDouble(), waiting: null as WorkerDouble | null,
    installing: null as WorkerDouble | null, update: vi.fn().mockResolvedValue(undefined),
  });
  workers = Object.assign(new EventTarget(), {
    controller: registration.active, register: vi.fn().mockResolvedValue(registration),
  });
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: workers });
  reload = vi.fn();
  vi.stubGlobal("location", { hostname: "www.athark.org", reload });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: "99.0.0" }))));
  confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  open = vi.spyOn(window, "open").mockReturnValue(null);
  listeners = [];
  for (const target of [window, document]) {
    const add = target.addEventListener.bind(target);
    vi.spyOn(target, "addEventListener").mockImplementation((type, listener, options) => {
      if (listener) listeners.push([target, type, listener]);
      add(type, listener, options);
    });
  }
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container.remove();
  for (const [target, type, listener] of listeners) target.removeEventListener(type, listener);
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount() {
  const { UpdatePill } = await import("@/components/layout/UpdatePill");
  root = createRoot(container);
  await act(async () => { root!.render(<><input aria-label="Draft" defaultValue="unsaved words" /><UpdatePill /></>); });
}

async function announceWaiting() {
  await act(async () => {
    registration.installing = worker;
    registration.dispatchEvent(new Event("updatefound"));
    registration.waiting = worker;
    worker.dispatchEvent(new Event("statechange"));
  });
}

function updateButton() {
  const button = container.querySelector<HTMLButtonElement>("button.update-pill");
  expect(button).not.toBeNull();
  return button!;
}

describe("PWA update consent", () => {
  it("keeps an unfinished form when a worker becomes ready and checks run", async () => {
    await mount();
    await announceWaiting();
    await act(async () => { vi.advanceTimersByTime(61000); window.dispatchEvent(new Event("focus")); });
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(container.querySelector("input")?.value).toBe("unsaved words");
    updateButton();
  });

  it("leaves the waiting worker untouched when the refresh confirmation is cancelled", async () => {
    await mount();
    await announceWaiting();
    act(() => updateButton().click());
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm.mock.calls[0]?.[0]).toContain("احفظ");
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    updateButton();
  });

  it("activates only after acceptance and refreshes this tab after controller change", async () => {
    await mount();
    await announceWaiting();
    confirm.mockReturnValue(true);
    await act(async () => updateButton().click());
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith({ type: "SKIP_WAITING" });
    expect(reload).not.toHaveBeenCalled();
    workers.controller = worker;
    workers.dispatchEvent(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("does not refresh an unapproved tab when another tab activates an update", async () => {
    await mount();
    await announceWaiting();
    registration.waiting = null;
    workers.controller = worker;
    await act(async () => workers.dispatchEvent(new Event("controllerchange")));
    expect(reload).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await act(async () => updateButton().click());
    expect(reload).toHaveBeenCalledOnce();
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it("refreshes an accepting page even if it was not previously controlled", async () => {
    workers.controller = null;
    registration.waiting = worker;
    await mount();
    confirm.mockReturnValue(true);
    await act(async () => updateButton().click());
    workers.controller = worker;
    workers.dispatchEvent(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("refreshes on approval when another tab activates the first controller", async () => {
    workers.controller = null;
    registration.waiting = worker;
    await mount();
    updateButton();

    registration.waiting = null;
    workers.controller = worker;
    await act(async () => workers.dispatchEvent(new Event("controllerchange")));
    expect(reload).not.toHaveBeenCalled();
    updateButton();

    confirm.mockReturnValue(true);
    await act(async () => updateButton().click());
    expect(reload).toHaveBeenCalledOnce();
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it("applies the newest waiting worker after another tab has activated an earlier update", async () => {
    await mount();
    await announceWaiting();
    registration.waiting = null;
    workers.controller = worker;
    await act(async () => workers.dispatchEvent(new Event("controllerchange")));
    worker = new WorkerDouble();
    await announceWaiting();
    confirm.mockReturnValue(true);
    await act(async () => updateButton().click());
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith({ type: "SKIP_WAITING" });
    expect(reload).not.toHaveBeenCalled();
  });

  it("lets the user dismiss the pill without applying the worker", async () => {
    await mount();
    await announceWaiting();
    act(() => container.querySelector<HTMLButtonElement>("button.update-pill-dismiss")!.click());
    expect(container.querySelector("button.update-pill")).toBeNull();
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(container.querySelector("input")?.value).toBe("unsaved words");
  });

  it("offers an already waiting update after reopening the page", async () => {
    registration.waiting = worker;
    await mount();
    updateButton();
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it("keeps a failed activation retryable", async () => {
    await mount();
    await announceWaiting();
    worker.postMessage.mockImplementationOnce(() => { throw new Error("worker unavailable"); });
    confirm.mockReturnValue(true);
    await act(async () => updateButton().click());
    expect(updateButton().disabled).toBe(false);
    await act(async () => updateButton().click());
    expect(worker.postMessage).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
  });
});
