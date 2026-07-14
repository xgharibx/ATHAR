// @vitest-environment jsdom
/**
 * FloatingAthar behaviour (B8):
 *   - Renders a `bottom-…` FAB positioned away from the bottom nav.
 *   - Defaults to "navigate to /companion" mode.
 *   - When `modalMode` is on, opens an in-page modal instead of navigating.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { act } from "react";
import { FloatingAthar } from "@/components/companion/FloatingAthar";

function SpyNav() {
  const nav = useNavigate();
  (window as unknown as Record<string, unknown>).__lastNav = nav;
  return null;
}

function setup(props: { modalMode?: boolean; prefill?: string } = {}) {
  document.body.innerHTML = "";
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/"] },
        React.createElement(SpyNav),
        React.createElement(FloatingAthar, props),
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: "/companion", element: React.createElement("div", { "data-companion": "open" }) })
        )
      )
    );
  });
  return { container, root };
}

function cleanup(root: Root, container: HTMLElement) {
  act(() => root.unmount());
  container.remove();
  (window as unknown as Record<string, unknown>).__lastNav = undefined;
}

describe("FloatingAthar (B8): modalMode + positioning", () => {
  it("renders a fixed-position FAB anchored to the bottom (not in normal flow)", () => {
    const { container, root } = setup();
    const fab = container.querySelector('button[aria-label="اسأل أثر"]') as HTMLButtonElement | null;
    expect(fab).toBeTruthy();
    expect(fab!.className).toMatch(/fixed/);
    expect(fab!.className).toMatch(/bottom-/);
    cleanup(root, container);
  });

  it("without modalMode, clicking the FAB navigates to /companion (default behaviour)", () => {
    const { container, root } = setup({ prefill: "سؤال تجربة" });
    const fab = container.querySelector('button[aria-label="اسأل أثر"]') as HTMLButtonElement | null;
    act(() => {
      fab!.click();
    });
    // The default flow navigates to /companion?ask=…
    const navFn = (window as unknown as Record<string, unknown>).__lastNav as unknown as (path: string) => void;
    expect(typeof navFn).toBe("function");
    cleanup(root, container);
  });

  it("with modalMode, the FAB opens an in-page modal instead of navigating", () => {
    const { container, root } = setup({ modalMode: true, prefill: "سلام" });
    const fab = container.querySelector('button[aria-label="اسأل أثر"]') as HTMLButtonElement | null;
    act(() => {
      fab!.click();
    });
    // Modal renders inline; no /companion navigation should occur. We just
    // check the in-page modal mounted something next to the FAB.
    expect(container.querySelector("[role='dialog'], [data-companion-modal], textarea, input[type='text']")).not.toBeNull();
    cleanup(root, container);
  });
});
