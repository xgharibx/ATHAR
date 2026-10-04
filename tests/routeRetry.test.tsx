/** @vitest-environment jsdom */
import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

const reload = vi.fn();
let root: Root | undefined;
let container: HTMLDivElement | undefined;
const suppressExpectedRenderError = (event: Event) => event.preventDefault();

function mountRoute(route: React.ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(RouteErrorBoundary, { onReload: reload },
      createElement(React.Suspense, { fallback: createElement("div", { role: "status" }, "Loading") }, route)));
  });
}

function retryButton() {
  return container?.querySelector<HTMLButtonElement>('[role="alert"] button');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.addEventListener("error", suppressExpectedRenderError);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  window.removeEventListener("error", suppressExpectedRenderError);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("route retry", () => {
  it("recovers ordinary render errors in place without reloading", async () => {
    let shouldThrow = true;
    function TransientPageError() {
      if (shouldThrow) throw new Error("temporary render failure");
      return createElement("div", null, "Route recovered");
    }

    mountRoute(createElement(TransientPageError));
    expect(retryButton()?.textContent).toBe("إعادة المحاولة");

    shouldThrow = false;
    await act(async () => { retryButton()!.click(); });

    expect(container?.textContent).toContain("Route recovered");
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads the document after a lazy route chunk rejects", async () => {
    const FailedLazyRoute = React.lazy(() => Promise.reject(new TypeError("Failed to fetch dynamically imported module")));
    mountRoute(createElement(FailedLazyRoute));
    await act(async () => { await Promise.resolve(); });

    expect(retryButton()?.textContent).toBe("إعادة تحميل الصفحة");
    await act(async () => { retryButton()!.click(); });

    expect(reload).toHaveBeenCalledOnce();
  });
});
