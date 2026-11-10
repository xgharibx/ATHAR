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
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
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

  it("opens a menu with its destinations, in order", () => {
    mount();
    click(moreBtn());
    expect(menu()).not.toBeNull();
    // Icons only — the labels live in aria-label, not visible text.
    expect(items().map((b) => b.getAttribute("aria-label"))).toEqual(["مقاطع قصيرة", "الدورات", "الإحصائيات", "المفضلة"]);
    expect(items().every((b) => b.textContent?.trim() === "")).toBe(true);
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
    const fav = items().find((b) => b.getAttribute("aria-label") === "المفضلة")!;
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

  it("leaves the bar itself at exactly six tabs", () => {
    // The overflow is NOT a tab — it floats on its own, outside the bar.
    mount();
    expect(qa(".floating-nav .floating-nav-item").length).toBe(6);
  });

  it("renders the overflow outside the bar, with no label", () => {
    mount();
    const dots = q(".floating-nav-dots")!;
    expect(dots).not.toBeNull();
    expect(dots.closest(".floating-nav")).toBeNull();
    expect(dots.textContent?.trim()).toBe("");
  });

  it("sits beside the bar in one shared row", () => {
    // The row owns position and hide state for both, so every body.*-mode rule
    // that hides the bar takes the dots with it instead of stranding them.
    mount();
    const row = q(".floating-nav-row")!;
    expect(row).not.toBeNull();
    expect(row.querySelector(".floating-nav")).not.toBeNull();
    expect(row.querySelector(".floating-nav-dots")).not.toBeNull();
  });

  it("removes the scrolled-away nav from keyboard focus", () => {
    mount();
    const navLink = q('nav[aria-label="التنقل الرئيسي"] a[href="/quran"]') as HTMLAnchorElement;
    expect(navLink).not.toBeNull();
    navLink.focus();
    expect(document.activeElement).toBe(navLink);

    Object.defineProperty(window, "scrollY", { configurable: true, value: 200 });
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => { callback(16); return 1; };
    act(() => window.dispatchEvent(new Event("scroll")));
    window.requestAnimationFrame = originalRaf;

    const row = q(".floating-nav-row")!;
    expect(row.getAttribute("aria-hidden")).toBe("true");
    expect(row.hasAttribute("inert")).toBe(true);
    expect(Array.from(row.querySelectorAll<HTMLElement>("a, button")).every((element) => element.tabIndex === -1)).toBe(true);
    expect(row.contains(document.activeElement)).toBe(false);
  });

  it.each([
    "quran-focus-mode",
    "focus-mode",
    "companion-sheet-open",
    "companion-focus",
    "shorts-open",
  ])("removes the nav from keyboard focus while body.%s hides it", async (mode) => {
    mount();

    await act(async () => {
      document.body.classList.add(mode);
      await Promise.resolve();
    });

    const row = q(".floating-nav-row")!;
    expect(row.getAttribute("aria-hidden")).toBe("true");
    expect(row.hasAttribute("inert")).toBe(true);
    expect(Array.from(row.querySelectorAll<HTMLElement>("a, button")).every((element) => element.tabIndex === -1)).toBe(true);

    await act(async () => {
      document.body.classList.remove(mode);
      await Promise.resolve();
    });
    expect(row.getAttribute("aria-hidden")).toBeNull();
    expect(row.hasAttribute("inert")).toBe(false);
  });

  it("closes an open overflow menu when a CSS-only hidden mode starts", async () => {
    mount();
    click(moreBtn());
    expect(menu()).not.toBeNull();

    await act(async () => {
      document.body.classList.add("quran-focus-mode");
      await Promise.resolve();
    });

    await act(async () => {
      document.body.classList.remove("quran-focus-mode");
      await Promise.resolve();
    });
    expect(menu()).toBeNull();
  });

  it("removes the nav while a full-screen modal or tasbeeh focus surface is open", async () => {
    mount();
    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("data-state", "open");
    const tasbeehFocus = document.createElement("div");
    tasbeehFocus.className = "sebha-focus";

    await act(async () => {
      document.body.append(modal, tasbeehFocus);
      await Promise.resolve();
    });

    const row = q(".floating-nav-row")!;
    expect(row.getAttribute("aria-hidden")).toBe("true");
    expect(row.hasAttribute("inert")).toBe(true);

    await act(async () => {
      modal.remove();
      tasbeehFocus.remove();
      await Promise.resolve();
    });
    expect(row.getAttribute("aria-hidden")).toBeNull();
  });
});
