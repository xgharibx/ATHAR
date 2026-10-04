// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://www.athark.org/"}
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hadithMocks = vi.hoisted(() => ({
  fetchDailyHadith: vi.fn(),
  fetchRandomHadith: vi.fn(),
  fetchSharhHadith: vi.fn(),
  prewarmSharhBundle: vi.fn(),
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/lib/hadithSharhAPI", () => ({
  ...hadithMocks,
}));
vi.mock("@/lib/widgetDataBridge", () => ({ syncSunnahWidget: vi.fn() }));
vi.mock("@/lib/shareTargets", () => ({ shareText: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

let container: HTMLDivElement;
let root: Root | undefined;
const dailyHadith = {
  id: "daily-1",
  hadeeth: "حديث اليوم",
  attribution: "راوٍ",
  grade: "صحيح",
  explanation: "شرح الحديث",
};

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  hadithMocks.fetchDailyHadith.mockReset().mockResolvedValue(dailyHadith);
  hadithMocks.fetchRandomHadith.mockReset().mockResolvedValue({ ...dailyHadith, id: "random-1" });
  hadithMocks.fetchSharhHadith.mockReset();
  hadithMocks.prewarmSharhBundle.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount() {
  const { DailyCarousel } = await import("@/components/ui/DailyCarousel");
  root = createRoot(container);
  await act(async () => {
    root!.render(<DailyCarousel dateKey="2026-10-04" />);
  });
}

function selectedSlideIndex() {
  return [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    .findIndex((tab) => tab.getAttribute("aria-selected") === "true");
}

describe("DailyCarousel accessibility", () => {
  it("removes inactive slides and their controls from keyboard and accessibility navigation", async () => {
    await mount();

    const slides = [...container.querySelectorAll<HTMLElement>('[role="group"]')];
    expect(slides).toHaveLength(4);
    expect(slides.filter((slide) => slide.getAttribute("aria-hidden") === "true")).toHaveLength(3);
    expect(slides.filter((slide) => slide.hasAttribute("inert"))).toHaveLength(3);
    expect(slides[1]?.getAttribute("aria-hidden")).toBe("false");
    const inactiveButton = container.querySelector<HTMLButtonElement>("#carousel-slide-0 button");
    expect(inactiveButton?.closest("[inert]")).not.toBeNull();
    expect(inactiveButton?.getAttribute("tabindex")).toBe("-1");
    expect(container.querySelector("#carousel-slide-1 button")?.getAttribute("tabindex")).toBeNull();

    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="آية اليوم"][role="tab"]')!.click());
    expect(selectedSlideIndex()).toBe(0);
    expect(inactiveButton?.getAttribute("tabindex")).toBeNull();
    expect(container.querySelector("#carousel-slide-1 button")?.getAttribute("tabindex")).toBe("-1");
  });

  it("offers a pause control and does not announce automatic slide changes", async () => {
    await mount();

    const pause = container.querySelector<HTMLButtonElement>('button[aria-label="إيقاف العرض التلقائي"]');
    expect(pause).not.toBeNull();
    expect(container.querySelector("[aria-live]")?.getAttribute("aria-live")).toBe("off");

    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(selectedSlideIndex()).toBe(2);

    await act(async () => pause!.click());
    expect(container.querySelector('button[aria-label="تشغيل العرض التلقائي"]')).not.toBeNull();
    expect(container.querySelector("[aria-live]")?.getAttribute("aria-live")).toBe("polite");
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(selectedSlideIndex()).toBe(2);

    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="تشغيل العرض التلقائي"]')!.click());
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(selectedSlideIndex()).toBe(3);
  });

  it("does not turn a first focused pause activation into play", async () => {
    await mount();
    const carousel = container.querySelector<HTMLElement>('[role="region"]')!;
    const pause = container.querySelector<HTMLButtonElement>('button[aria-label="إيقاف العرض التلقائي"]')!;

    await act(async () => {
      carousel.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, relatedTarget: document.body }));
      pause.querySelector("svg")!.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      pause.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
      pause.focus();
    });
    expect(container.querySelector('button[aria-label="إيقاف العرض التلقائي"]')).not.toBeNull();

    await act(async () => pause.click());
    expect(container.querySelector('button[aria-label="تشغيل العرض التلقائي"]')).not.toBeNull();
    await act(async () => {
      carousel.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }));
      await vi.advanceTimersByTimeAsync(8000);
    });
    expect(selectedSlideIndex()).toBe(1);
  });

  it("makes controls keyboard-inert when an inactive slide finishes loading", async () => {
    let resolveHadith: ((value: typeof dailyHadith) => void) | undefined;
    const pendingHadith = new Promise<typeof dailyHadith>((resolve) => { resolveHadith = resolve; });
    hadithMocks.fetchDailyHadith.mockReturnValueOnce(pendingHadith);
    await mount();

    await act(async () => container.querySelector<HTMLButtonElement>('[role="tab"][aria-label="آية اليوم"]')!.click());
    expect(selectedSlideIndex()).toBe(0);
    expect(container.querySelector("#carousel-slide-1 button")).toBeNull();

    await act(async () => {
      resolveHadith?.(dailyHadith);
      await pendingHadith;
    });
    const delayedControl = container.querySelector<HTMLButtonElement>("#carousel-slide-1 button");
    expect(delayedControl).not.toBeNull();
    expect(delayedControl?.getAttribute("tabindex")).toBe("-1");
  });

  it("moves focus out of a slide before hiding it", async () => {
    await mount();
    const hadithControl = container.querySelector<HTMLButtonElement>("#carousel-slide-1 button")!;
    const carousel = container.querySelector<HTMLElement>('[role="region"]')!;
    await act(async () => hadithControl.focus());
    expect(document.activeElement).toBe(hadithControl);

    await act(async () => container.querySelector<HTMLButtonElement>('[role="tab"][aria-label="آية اليوم"]')!.click());
    expect(document.activeElement).toBe(carousel);
  });

  it("starts paused when the system requests reduced motion", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    await mount();
    expect(container.querySelector('button[aria-label="تشغيل العرض التلقائي"]')).not.toBeNull();
    expect(container.querySelector<HTMLElement>("[data-carousel-track]")?.style.transition).toBe("none");
    const disclosureChevron = container.querySelector<SVGElement>("#carousel-slide-1 button > svg")!;
    expect(disclosureChevron.style.transition).toBe("none");
    const randomHadith = container.querySelector<HTMLButtonElement>('#carousel-slide-1 button[aria-label="حديث عشوائي"]')!;
    await act(async () => randomHadith.click());
    expect(randomHadith.querySelector("svg")?.getAttribute("style")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(selectedSlideIndex()).toBe(1);
  });

  it("pauses rotation when keyboard focus enters the carousel", async () => {
    await mount();
    container.querySelector<HTMLButtonElement>("#carousel-slide-1 button")?.focus();
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(selectedSlideIndex()).toBe(1);
  });

  it("pauses rotation when keyboard focus lands on the pause control", async () => {
    await mount();
    const pause = container.querySelector<HTMLButtonElement>('button[aria-label="إيقاف العرض التلقائي"]')!;

    await act(async () => pause.focus());
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });

    expect(selectedSlideIndex()).toBe(1);
    expect(container.querySelector('button[aria-label="تشغيل العرض التلقائي"]')).not.toBeNull();
  });

  it("does not pause keyboard-restarted rotation on an unrelated pointer release", async () => {
    await mount();
    const pause = container.querySelector<HTMLButtonElement>('button[aria-label="إيقاف العرض التلقائي"]')!;

    await act(async () => pause.focus());
    const play = container.querySelector<HTMLButtonElement>('button[aria-label="تشغيل العرض التلقائي"]')!;
    await act(async () => play.click());
    expect(container.querySelector('button[aria-label="إيقاف العرض التلقائي"]')).not.toBeNull();

    await act(async () => {
      document.body.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(container.querySelector('button[aria-label="إيقاف العرض التلقائي"]')).not.toBeNull();
    expect(selectedSlideIndex()).toBe(2);
  });
});
