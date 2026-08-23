// @vitest-environment jsdom
/**
 * The bottom bar's overflow menu.
 *
 * Six tabs is the practical ceiling at Arabic label widths — a seventh, eighth
 * and ninth would either shrink every tap target or push the row into
 * horizontal scrolling, where tabs hide off-screen and stop looking tappable.
 * So الدورات / الإحصائيات / المفضلة live one tap deeper.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { FloatingNav } from "@/components/layout/FloatingNav";

let container: HTMLDivElement;
let root: Root;

function mount(path = "/") {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(createElement(MemoryRouter, { initialEntries: [path] }, createElement(FloatingNav)));
  });
}

const q = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const qa = (sel: string) => Array.from(document.querySelectorAll(sel)) as HTMLElement[];
const moreBtn = () => q('button[aria-label="المزيد"]')!;
const menu = () => q('[role="menu"]');
const items = () => qa('[role="menuitem"]');
const click = (el: HTMLElement) => act(() => { el.click(); });

beforeEach(() => {
  document.body.innerHTML = "";
  // jsdom implements neither of these; the nav uses both for real behaviour.
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe("overflow button", () => {
  it("is closed until pressed", () => {
    mount();
    expect(moreBtn().getAttribute("aria-expanded")).toBe("false");
    expect(menu()).toBeNull();
  });

  it("opens a menu with the three destinations, in order", () => {
    mount();
    click(moreBtn());
    expect(menu()).not.toBeNull();
    expect(items().map((b) => b.textContent)).toEqual(["الدورات", "الإحصائيات", "المفضلة"]);
  });

  it("announces itself to screen readers", () => {
    mount();
    click(moreBtn());
    expect(moreBtn().getAttribute("aria-expanded")).toBe("true");
    expect(moreBtn().getAttribute("aria-haspopup")).toBe("menu");
    expect(moreBtn().getAttribute("aria-controls")).toBe("floating-nav-more-menu");
  });

  it("toggles shut on a second press", () => {
    mount();
    click(moreBtn());
    click(moreBtn());
    expect(menu()).toBeNull();
  });

  it("closes on Escape", () => {
    mount();
    click(moreBtn());
    act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(menu()).toBeNull();
  });

  it("closes when something else is pressed", () => {
    mount();
    click(moreBtn());
    act(() => { document.dispatchEvent(new Event("pointerdown", { bubbles: true })); });
    expect(menu()).toBeNull();
  });
});

describe("showing where you are", () => {
  it("highlights the overflow while one of its pages is open", () => {
    // Otherwise those three pages look like nowhere in the bar at all.
    mount("/insights");
    expect(moreBtn().className).toContain("active");
  });

  it("leaves it unhighlighted on a normal tab", () => {
    mount("/quran");
    expect(moreBtn().className).not.toContain("active");
  });

  it("marks the open page inside the menu", () => {
    mount("/favorites");
    click(moreBtn());
    const fav = items().find((b) => b.textContent === "المفضلة")!;
    expect(fav.className).toContain("active");
  });
});

describe("the six main tabs are untouched", () => {
  it("still renders every one of them", () => {
    mount();
    for (const label of ["الرئيسية", "القرآن", "أثر", "الإعجاز", "المكتبة", "الترتيب"]) {
      expect(q(`[aria-label="${label}"]`)).not.toBeNull();
    }
  });

  it("adds exactly one control to the bar", () => {
    mount();
    expect(qa(".floating-nav-item").length).toBe(7);
  });
});
