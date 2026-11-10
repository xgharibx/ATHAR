// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { arNum } from "@/lib/formatNumber";
import { MuhasabaPage } from "@/pages/Muhasaba";
import { useNoorStore } from "@/store/noorStore";

vi.mock("@/hooks/useScrollRestoration", () => ({ useScrollRestoration: () => {} }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<MemoryRouter><MuhasabaPage /></MemoryRouter>));
}

function clickDay(day: number) {
  const tab = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    .find((candidate) => candidate.textContent?.includes(arNum(day)));
  if (!tab) throw new Error(`Missing day tab: ${day}`);
  act(() => tab.click());
}

function clickButton(label: string) {
  const button = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button"))
    .find((candidate) => candidate.getAttribute("aria-label") === label || candidate.dataset.testid === label || candidate.textContent?.includes(label));
  if (!button) throw new Error(`Missing button: ${label}`);
  act(() => button.click());
}

beforeEach(() => {
  document.body.innerHTML = "";
  useNoorStore.setState((state) => ({
    ...state,
    muhasabaLog: {},
    muhasabaGender: "male",
    muhasabaHidden: {},
    prayerLog: {},
    lastIbadahResetISO: "2026-10-17",
  }));
  HTMLElement.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
});

describe("Muhasaba selected-day rollover", () => {
  it("keeps a past day while visible, then logs to today after it leaves the week", () => {
    mount();

    // October 12 is still in the strip after the day advances to October 18.
    clickDay(12);
    clickButton("deed-fajr");
    expect(document.body.querySelector('[data-testid="ladder-sheet"]')).not.toBeNull();
    act(() => useNoorStore.setState({ lastIbadahResetISO: "2026-10-18" }));
    expect(document.body.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(arNum(12));
    expect(document.body.querySelector('[data-testid="ladder-sheet"]')).not.toBeNull();

    // On October 19, October 12 is no longer in the seven-day strip.
    act(() => useNoorStore.setState({ lastIbadahResetISO: "2026-10-19" }));
    expect(document.body.querySelector('[data-testid="ladder-sheet"]')).toBeNull();
    clickButton("deed-fajr");
    clickButton("أدّيتُها في وقتها");

    expect(useNoorStore.getState().muhasabaLog["2026-10-19|fajr"]).toBe(1);
    expect(useNoorStore.getState().muhasabaLog["2026-10-12|fajr"]).toBeUndefined();
  });
});
