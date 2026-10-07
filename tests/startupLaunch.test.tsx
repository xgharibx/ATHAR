/** @vitest-environment jsdom */
import fs from "node:fs";
import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StartupReady } from "@/components/StartupReady";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import * as startup from "@/lib/startup";

const html = fs.readFileSync("index.html", "utf8");
let root: Root | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  document.body.innerHTML = '<div id="app-loader"></div><div id="root"><div data-react-root="true"></div></div>';
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("launch surface", () => {
  it("runs optional startup callbacks once after readiness and cancels unmounted subscribers", () => {
    expect(startup).toHaveProperty("afterStartupReady");
    const run = vi.fn();
    const canceled = vi.fn();
    const cleanup = startup.afterStartupReady(run);
    startup.afterStartupReady(canceled)();
    expect(run).not.toHaveBeenCalled();
    startup.markStartupReady();
    startup.markStartupReady();
    expect(run).toHaveBeenCalledOnce();
    expect(canceled).not.toHaveBeenCalled();
    cleanup();
    const alreadyReady = vi.fn();
    startup.afterStartupReady(alreadyReady)();
    expect(alreadyReady).toHaveBeenCalledOnce();
  });
  it("identifies the covered initial render so later Home visits can keep their entrance animations", () => {
    expect(startup).toHaveProperty("isStartupPending");
    expect(startup.isStartupPending()).toBe(true);
    startup.markStartupReady();
    expect(startup.isStartupPending()).toBe(false);
    document.getElementById("app-loader")?.remove();
    expect(startup.isStartupPending()).toBe(false);
  });
  it("restores the text-only golden intro before JavaScript", () => {
    const page = new DOMParser().parseFromString(html, "text/html");
    const loader = page.getElementById("app-loader")!;
    expect(loader.style.background).toBe("rgb(47, 79, 55)");
    expect(loader.querySelector("svg")).toBeNull();
    expect(loader.querySelector(".athar-intro-name")?.textContent?.trim()).toBe("أثر");
    expect(loader.querySelector(".athar-intro-tagline")?.textContent?.trim()).toBe("همسة تطمئن قلبك، وتترك أثرًا.");
  });

  it("releases the app immediately and fades the intro over the ready screen", async () => {
    startup.markStartupReady();
    const loader = document.getElementById("app-loader")!;
    expect(startup.isStartupPending()).toBe(false);
    expect(loader.style.pointerEvents).toBe("none");
    expect(loader.style.opacity).toBe("0");
    await vi.advanceTimersByTimeAsync(1000);
    expect(loader.style.display).toBe("none");
  });

  it("skips the exit animation when reduced motion is requested", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    startup.markStartupReady();
    expect(document.getElementById("app-loader")?.style.display).toBe("none");
    expect(startup.isStartupPending()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not dismiss for an empty React sentinel or a slow account hydration", async () => {
    const script = html.match(/<script>\s*(document\.addEventListener\('DOMContentLoaded'[\s\S]*?)<\/script>/)?.[1];
    if (script) new Function(script)();
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.advanceTimersByTimeAsync(7000);
    expect(document.getElementById("app-loader")?.style.opacity).not.toBe("0");
    expect(document.getElementById("app-loader")?.style.display).not.toBe("none");
  });

  it("keeps a pending lazy route covered, then dismisses on usable content", async () => {
    let resolveRoute!: (value: { default: React.ComponentType }) => void;
    const LazyRoute = React.lazy(() => new Promise<{ default: React.ComponentType }>((resolve) => { resolveRoute = resolve; }));
    root = createRoot(document.querySelector('[data-react-root]')!);
    act(() => root!.render(createElement(React.Suspense, { fallback: null },
      createElement(LazyRoute), createElement(StartupReady))));
    expect(document.getElementById("app-loader")?.style.display).not.toBe("none");
    await act(async () => { resolveRoute({ default: () => createElement("button", null, "Ready") }); });
    expect(startup.isStartupPending()).toBe(false);
  });

  it("does not dismiss for Home loading, but allows data or error readiness", async () => {
    root = createRoot(document.querySelector('[data-react-root]')!);
    act(() => root!.render(createElement(StartupReady, { ready: false })));
    expect(document.getElementById("app-loader")?.style.display).not.toBe("none");
    act(() => root!.render(createElement(StartupReady, { ready: true })));
    expect(startup.isStartupPending()).toBe(false);
  });

  it("reveals an actionable initial-route error instead of keeping it covered", () => {
    const suppressError = (event: Event) => event.preventDefault();
    window.addEventListener("error", suppressError);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    function FailedRoute(): React.ReactNode { throw new Error("render failure"); }
    root = createRoot(document.querySelector('[data-react-root]')!);
    try {
      act(() => root!.render(createElement(RouteErrorBoundary, null, createElement(FailedRoute))));
      expect(document.querySelector('[role="alert"] button')?.textContent).toBe("إعادة المحاولة");
      expect(startup.isStartupPending()).toBe(false);
    } finally {
      window.removeEventListener("error", suppressError);
      log.mockRestore();
    }
  });
});
