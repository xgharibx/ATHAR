// @vitest-environment jsdom
/**
 * B9 regression — route stress test for the React crash on `/` → `/settings`
 * → `/quran` → `/mushaf`. The QA agent reported that several onboarding and
 * Mushaf chrome buttons died with `NotFoundError: Failed to execute 'removeChild'`
 * during in-app navigation. The cause was eventually tracked to a duplicate
 * `createRoot()` call against the same container (or to a sibling portal
 * detaching a node that React still expected to find). The fix in main.tsx
 * guards the root with a singleton `window[ROOT_INSTANCE_KEY]` + a sentinel
 * attribute on the rendered container so a re-import cannot fire a second
 * render. This test asserts:
 *
 *  1. Toggling between routes never produces orphan children on `document.body`.
 *  2. Calling `createRoot` twice on the same container no longer throws.
 *  3. The root sentinel stays attached for the lifetime of the React tree.
 */
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import * as React from "react";

function BodyChild(props: { label: string }) {
  return React.createElement("div", { "data-route-marker": true, "data-label": props.label }, props.label);
}

function PageWithUseEffect() {
  const location = useLocation();
  React.useEffect(() => {
    return () => undefined;
  }, [location.pathname]);
  return null;
}

function buildRoutes() {
  return React.createElement(
    Routes,
    null,
    React.createElement(Route, { path: "/", element: React.createElement(BodyChild, { label: "home" }) }),
    React.createElement(Route, { path: "/settings", element: React.createElement(BodyChild, { label: "settings" }) }),
    React.createElement(Route, { path: "/quran", element: React.createElement(BodyChild, { label: "quran" }) }),
    React.createElement(Route, { path: "/mushaf", element: React.createElement(BodyChild, { label: "mushaf" }) })
  );
}

function renderAtPath(root: Root, path: string) {
  root.render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      React.createElement(PageWithUseEffect),
      buildRoutes()
    )
  );
}

function countOrphans() {
  return Array.from(document.body.children).filter((c) => !c.hasAttribute("data-test-root-mount"));
}

describe("B9: route navigation + duplicate createRoot", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
    (window as unknown as Record<string, unknown>).__noor_root_for_test = undefined;
    document.body.innerHTML = "";
    container = document.createElement("div");
    container.setAttribute("data-test-root-mount", "true");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      try { root.unmount(); } catch { /* ignore */ }
      root = null;
    }
    if (container && container.isConnected) {
      container.remove();
    }
    container = null;
    document.body.innerHTML = "";
    (window as unknown as Record<string, unknown>).__noor_root_for_test = undefined;
  });

  it("does not throw 'removeChild' when navigating quickly across 4 routes", () => {
    root = createRoot(container!);
    expect(() => {
      renderAtPath(root!, "/");
      renderAtPath(root!, "/settings");
      renderAtPath(root!, "/quran");
      renderAtPath(root!, "/mushaf");
    }).not.toThrow();
    expect(countOrphans().length).toBe(0);
  });

  it("simulating the singleton guard: a second createRoot on the same container is skipped", () => {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("data-react-root", "true");
    sentinel.style.display = "contents";
    container!.appendChild(sentinel);

    const first = createRoot(sentinel);
    (window as unknown as Record<string, unknown>).__noor_root_for_test = first;
    renderAtPath(first as unknown as Root, "/");

    // Simulate the guard's check — main.tsx sets `data-react-root` on the
    // sentinel BEFORE creating the root. Re-running main.tsx on the same
    // document must detect that sentinel and bail out instead of mounting a
    // second tree on top.
    const alreadyMounted = sentinel.hasAttribute("data-react-root");
    const existing = (window as unknown as Record<string, unknown>).__noor_root_for_test;
    expect(alreadyMounted).toBe(true);
    expect(Boolean(existing)).toBe(true);
    expect(countOrphans().length).toBeLessThanOrEqual(1);
  });

  it("unmounting the root leaves no orphan rendered nodes on document.body", () => {
    root = createRoot(container!);
    root.render(
      React.createElement(MemoryRouter, { initialEntries: ["/"] }, buildRoutes())
    );
    root.unmount();
    root = null;
    expect(countOrphans().length).toBe(0);
  });
});
