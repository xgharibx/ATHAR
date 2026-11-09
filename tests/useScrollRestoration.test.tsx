// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetScrollForRouteChange, useScrollRestoration } from "@/hooks/useScrollRestoration";

function CategoryRoute() {
  useScrollRestoration();
  const { id } = useParams();
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate("/c/evening")}>{id}</button>;
}

function RemountRouteOnPathChange() {
  const location = useLocation();
  return (
    <div key={location.pathname}>
      <Routes>
        <Route path="/c/:id" element={<CategoryRoute />} />
      </Routes>
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;
let scrollToSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.sessionStorage.clear();
  Object.defineProperty(window, "scrollY", { configurable: true, value: 720 });
  scrollToSpy = vi.fn();
  Object.defineProperty(window, "scrollTo", { configurable: true, value: scrollToSpy });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("adhkar route scroll restoration", () => {
  it("starts a never-visited section at the top after navigating from a scrolled section", () => {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={["/c/morning"]}>
          <RemountRouteOnPathChange />
        </MemoryRouter>,
      );
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "instant" });

    scrollToSpy.mockClear();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 720 });
    act(() => container.querySelector("button")?.click());

    expect(container.textContent).toBe("evening");
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
  });

  it("restores a saved scroll position when the destination has one", () => {
    window.sessionStorage.setItem("scroll_y:/c/evening", "240");

    act(() => {
      root.render(
        <MemoryRouter initialEntries={["/c/evening"]}>
          <RemountRouteOnPathChange />
        </MemoryRouter>,
      );
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 240, behavior: "instant" });
  });

  it("rejects partially numeric saved positions", () => {
    window.sessionStorage.setItem("scroll_y:/c/evening", "720junk");

    act(() => {
      root.render(
        <MemoryRouter initialEntries={["/c/evening"]}>
          <RemountRouteOnPathChange />
        </MemoryRouter>,
      );
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
  });

  it("does not replace a saved section position with the route reset to the top", async () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem("scroll_y:/c/morning", "520");

    act(() => {
      root.render(
        <MemoryRouter initialEntries={["/c/morning"]}>
          <RemountRouteOnPathChange />
        </MemoryRouter>,
      );
    });

    Object.defineProperty(window, "scrollY", { configurable: true, value: 520 });
    act(() => window.dispatchEvent(new Event("scroll")));

    // App.tsx saves the outgoing position and switches the active route before
    // resetting window scroll while the old page remains in its exit animation.
    act(() => resetScrollForRouteChange("/c/evening", "/c/morning"));
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    act(() => window.dispatchEvent(new Event("scroll")));
    await act(async () => { await vi.advanceTimersByTimeAsync(120); });

    expect(window.sessionStorage.getItem("scroll_y:/c/morning")).toBe("520");
  });
});
