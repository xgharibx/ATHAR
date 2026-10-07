/** @vitest-environment jsdom */
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const preferences = vi.hoisted(() => ({ reduceMotion: false }));
vi.mock("@/store/noorStore", () => ({ useNoorStore: (selector: (s: unknown) => unknown) => selector({ prefs: preferences }) }));
vi.mock("framer-motion", () => ({ useReducedMotion: () => false }));
import { RouteScene, RouteViewport } from "@/components/layout/RouteScene";

let root: Root;
let navigate: ReturnType<typeof useNavigate>;
function Navigation() { navigate = useNavigate(); return null; }
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  preferences.reduceMotion = false;
  document.body.innerHTML = '<div id="app-loader" data-hidden="true"></div><div id="test-root"></div>';
  root = createRoot(document.getElementById("test-root")!);
});
afterEach(() => { act(() => root.unmount()); vi.unstubAllGlobals(); });

describe("route scenes", () => {
  it("retains content across nested route trees without remounting the shared background", async () => {
    let resolve!: (value: { default: React.ComponentType }) => void;
    const Pending = React.lazy(() => new Promise<{ default: React.ComponentType }>(done => { resolve = done; }));
    function Shell() { return <><div data-background /><Outlet /></>; }
    await act(async () => root.render(<MemoryRouter><Navigation /><RouteViewport><Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<RouteScene><button>Current page</button></RouteScene>} />
        <Route path="/nested" element={<Outlet />}>
          <Route index element={<RouteScene><Pending /></RouteScene>} />
        </Route>
      </Route>
    </Routes></RouteViewport></MemoryRouter>));
    const background = document.querySelector('[data-background]');
    await act(async () => { React.startTransition(() => navigate("/nested")); });
    expect(document.body.textContent).toContain("Current page");
    expect(document.querySelector('[data-background]')).toBe(background);
    await act(async () => resolve({ default: () => <button>Nested page</button> }));
    expect(document.body.textContent).toContain("Nested page");
    expect(document.querySelector('[data-background]')).toBe(background);
  });

  it("keeps the current page visible while a lazy destination prepares, then swaps without an exit wait", async () => {
    let resolve!: (value: { default: React.ComponentType }) => void;
    const Pending = React.lazy(() => new Promise<{ default: React.ComponentType }>(done => { resolve = done; }));
    await act(async () => root.render(<MemoryRouter><Navigation /><Routes>
      <Route path="/" element={<RouteScene><button>Current page</button></RouteScene>} />
      <Route path="/next" element={<RouteScene><Pending /></RouteScene>} />
    </Routes></MemoryRouter>));
    await act(async () => { React.startTransition(() => navigate("/next")); });
    expect(document.body.textContent).toContain("Current page");
    await act(async () => resolve({ default: () => <button>Next page</button> }));
    expect(document.body.textContent).toContain("Next page");
    expect(document.body.textContent).not.toContain("Current page");
    expect(document.querySelector('[data-route-scene="/next"]')).not.toBeNull();
  });

  it("honors reduced motion and does not animate a covered initial launch", async () => {
    preferences.reduceMotion = true;
    await act(async () => root.render(<MemoryRouter><RouteScene><button>Ready</button></RouteScene></MemoryRouter>));
    expect(document.querySelector('.route-scene-enter')).toBeNull();
    preferences.reduceMotion = false;
    document.getElementById("app-loader")!.removeAttribute("data-hidden");
    await act(async () => root.render(<MemoryRouter key="fresh"><RouteScene><button>Ready</button></RouteScene></MemoryRouter>));
    expect(document.querySelector('.route-scene-enter')).toBeNull();
  });
});
