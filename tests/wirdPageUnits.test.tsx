// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { arNum } from "@/lib/formatNumber";
import { WirdPage } from "@/pages/Wird";
import { useNoorStore } from "@/store/noorStore";

vi.mock("@/hooks/useScrollRestoration", () => ({ useScrollRestoration: () => {} }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<MemoryRouter><WirdPage /></MemoryRouter>));
}

function button(label: string): HTMLButtonElement {
  const found = Array.from(document.body.querySelectorAll("button")).find((candidate) =>
    candidate.getAttribute("aria-label") === label || candidate.textContent?.trim() === label,
  );
  if (!(found instanceof HTMLButtonElement)) throw new Error(`Missing button: ${label}`);
  return found;
}

function chooseOption(label: string) {
  const option = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]'))
    .find((candidate) => candidate.textContent?.trim() === label);
  if (!option) throw new Error(`Missing option: ${label}`);
  act(() => option.click());
}

beforeEach(() => {
  document.body.innerHTML = "";
  useNoorStore.setState((state) => ({ ...state, wirdItems: {}, wirdLog: {}, lastIbadahResetISO: "2026-10-17" }));
  HTMLElement.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
});

describe("Wird Quran auto-link units", () => {
  it("offers ayah auto-tracking only for ayah goals and clears it when changing to pages", () => {
    mount();
    act(() => button("أنشئ وردي بنفسي").click());

    act(() => button("الربط التلقائي").click());
    expect(document.body.textContent).not.toContain("يُحتسب من قراءتك في التطبيق (آيات)");
    chooseOption("بدون ربط (أسجّله بنفسي)");

    act(() => button("الوحدة").click());
    chooseOption("آية");
    act(() => button("الربط التلقائي").click());
    chooseOption("يُحتسب من قراءتك في التطبيق (آيات)");

    act(() => button("الوحدة").click());
    chooseOption("وجه");
    expect(button("الربط التلقائي").textContent).toContain("بدون ربط (أسجّله بنفسي)");

    const title = document.body.querySelector<HTMLInputElement>('input[aria-label="اسم الورد"]')!;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setValue.call(title, "ورد القرآن");
      title.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => button("حفظ").click());

    expect(Object.values(useNoorStore.getState().wirdItems)[0]).toMatchObject({ unit: "وجه", auto: null });
  });

  it("opens a legacy page goal in manual mode and does not revive ayah tracking", () => {
    useNoorStore.setState((state) => ({
      ...state,
      wirdItems: { w1: { id: "w1", title: "ورد القرآن", kind: "quran", unit: "وجه", target: 5, slot: "fajr", days: [], createdISO: "2026-01-01", auto: "quranAyahs" } },
    }));
    mount();

    act(() => button("ورد القرآن").click());
    expect(button("الربط التلقائي").textContent).toContain("بدون ربط (أسجّله بنفسي)");

    act(() => button("الوحدة").click());
    chooseOption("آية");
    expect(button("الربط التلقائي").textContent).toContain("بدون ربط (أسجّله بنفسي)");

    act(() => button("قرآن").click());
    expect(button("الوحدة").textContent).toContain("آية");
    act(() => button("حفظ").click());
    expect(useNoorStore.getState().wirdItems.w1).toMatchObject({ unit: "آية", auto: null });
  });

  it("follows Fajr day changes unless the user selected an older day", () => {
    useNoorStore.setState((state) => ({
      ...state,
      wirdItems: { w1: { id: "w1", title: "ورد القرآن", kind: "quran", unit: "وجه", target: 1, slot: "fajr", days: [], createdISO: "2026-01-01", auto: null } },
    }));
    mount();

    const selectedText = () => document.body.querySelector('[role="tab"][aria-selected="true"]')?.textContent ?? "";
    expect(selectedText()).toContain(arNum(17));

    act(() => useNoorStore.setState({ lastIbadahResetISO: "2026-10-18" }));
    expect(selectedText()).toContain(arNum(18));

    const yesterday = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
      .find((candidate) => candidate.textContent?.includes(arNum(16)))!;
    act(() => yesterday.click());
    expect(selectedText()).toContain(arNum(16));

    act(() => useNoorStore.setState({ lastIbadahResetISO: "2026-10-19" }));
    expect(selectedText()).toContain(arNum(16));
  });

  it("moves off a historical day after it leaves the strip and logs against the visible day", () => {
    useNoorStore.setState((state) => ({
      ...state,
      wirdItems: { w1: { id: "w1", title: "ورد القرآن", kind: "quran", unit: "وجه", target: 5, slot: "fajr", days: [], createdISO: "2026-01-01", auto: null } },
    }));
    mount();

    const dayEleven = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
      .find((candidate) => candidate.textContent?.includes(arNum(11)))!;
    act(() => dayEleven.click());
    act(() => button("زيادة ورد القرآن").click());
    expect(useNoorStore.getState().wirdLog["2026-10-11|w1"]).toBe(1);

    act(() => useNoorStore.setState({ lastIbadahResetISO: "2026-10-18" }));
    expect(document.body.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(arNum(18));
    act(() => button("زيادة ورد القرآن").click());
    expect(useNoorStore.getState().wirdLog["2026-10-18|w1"]).toBe(1);
    expect(useNoorStore.getState().wirdLog["2026-10-11|w1"]).toBe(1);
  });
});
