// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { QuickTasbeehFab } from "@/components/layout/QuickTasbeehFab";
import { useNoorStore } from "@/store/noorStore";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route path="/home" element={<><QuickTasbeehFab /><Link to="/next">انتقال</Link></>} />
          <Route path="/next" element={<><QuickTasbeehFab /><output>الصفحة التالية</output></>} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

beforeEach(() => {
  document.body.innerHTML = "";
  useNoorStore.setState((state) => ({
    ...state,
    quickTasbeeh: {},
    sebhaTarget: 100,
    prefs: { ...state.prefs, enableHaptics: false },
  }));
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

describe("Quick Tasbeeh floating counter", () => {
  it("does not move keyboard focus when the lazy floating button mounts", () => {
    const pageButton = document.createElement("button");
    pageButton.textContent = "صفحة";
    document.body.appendChild(pageButton);
    pageButton.focus();

    mount();

    expect(document.activeElement).toBe(pageButton);
  });

  it("returns focus to its trigger after the user closes the counter", () => {
    mount();
    const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="تسبيح سريع"]')!;
    act(() => trigger.click());
    expect(document.activeElement).toBe(container.querySelector('button[aria-label="إغلاق"]'));

    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="إغلاق"]')!.click());
    expect(document.activeElement).toBe(container.querySelector('button[aria-label="تسبيح سريع"]'));
  });

  it("announces the selected dhikr and target to assistive technology", () => {
    mount();
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="تسبيح سريع"]')!.click());

    const phrase = [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "سبحان الله")!;
    const target = [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "100")!;
    expect(phrase.getAttribute("aria-pressed")).toBe("true");
    expect(target.getAttribute("aria-pressed")).toBe("true");

    act(() => [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "الحمد لله")!.click());
    expect(phrase.getAttribute("aria-pressed")).toBe("false");
    expect([...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "الحمد لله")!.getAttribute("aria-pressed")).toBe("true");
  });

  it("closes when the app route changes", () => {
    mount();
    const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="تسبيح سريع"]')!;
    act(() => trigger.click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.querySelector('[role="dialog"]')?.getAttribute("data-state")).toBe("open");

    const nextLink = [...container.querySelectorAll<HTMLAnchorElement>("a")].find((link) => link.textContent?.trim() === "انتقال")!;
    nextLink.focus();
    act(() => nextLink.click());

    expect(container.textContent).toContain("الصفحة التالية");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).not.toBe(container.querySelector('button[aria-label="تسبيح سريع"]'));
  });

  it("counts taps and stops the visible round at its selected target", () => {
    mount();
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="تسبيح سريع"]')!.click());
    act(() => [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "33")!.click());
    const countButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("اضغط للعدّ"))!;

    for (let i = 0; i < 34; i += 1) act(() => countButton.click());

    expect(container.textContent).toContain("33 / 33");
    expect(useNoorStore.getState().quickTasbeeh.subhanallah).toBe(33);
    expect(useNoorStore.getState().tasbeehLifetime.subhanallah).toBe(34);
    expect(container.textContent).toContain("تم 33 — سبحان الله");
  });
});
