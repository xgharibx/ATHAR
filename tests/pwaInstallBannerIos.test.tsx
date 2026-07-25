// @vitest-environment jsdom
/**
 * iOS install prompt.
 *
 * Apple never implemented `beforeinstallprompt`, so the banner's original
 * event-only implementation meant iOS users saw nothing at all and had no way
 * to discover that installing was even possible. On iOS the banner must
 * instead surface manual Share → "Add to Home Screen" instructions, and must
 * NOT offer an install button (there is no API behind it).
 */
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PwaInstallBanner } from "@/components/brand/PwaInstallBanner";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";

function setUA(ua: string) {
  Object.defineProperty(window.navigator, "userAgent", { value: ua, configurable: true });
}
function setStandalone(v: boolean | undefined) {
  Object.defineProperty(window.navigator, "standalone", { value: v, configurable: true });
}

let container: HTMLDivElement;
let root: Root;

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root.render(<PwaInstallBanner />); });
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  setStandalone(undefined);
  // jsdom has no matchMedia by default; report "not standalone".
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  act(() => { root?.unmount(); });
  container?.remove();
  vi.useRealTimers();
});

describe("PwaInstallBanner on iOS", () => {
  it("shows Share instructions after the delay, with no install button", () => {
    setUA(IPHONE_UA);
    mount();
    // Nothing immediately — it must not collide with first paint.
    expect(container.textContent).toBe("");

    act(() => { vi.advanceTimersByTime(4000); });

    expect(container.textContent).toContain("ثبّت أثر على شاشتك الرئيسية");
    expect(container.textContent).toContain("أضف إلى الشاشة الرئيسية");
    // The Share glyph is the whole point of the iOS copy.
    expect(container.querySelector('[aria-label="زر المشاركة"]')).not.toBeNull();
    // No install button: there is no iOS API to back one.
    const labels = [...container.querySelectorAll("button")].map((b) => b.textContent);
    expect(labels).not.toContain("تثبيت");
  });

  it("stays hidden when already installed (standalone)", () => {
    setUA(IPHONE_UA);
    setStandalone(true);
    mount();
    act(() => { vi.advanceTimersByTime(4000); });
    expect(container.textContent).toBe("");
  });

  it("stays hidden once dismissed", () => {
    setUA(IPHONE_UA);
    localStorage.setItem("noor_pwa_install_dismissed", "1");
    mount();
    act(() => { vi.advanceTimersByTime(4000); });
    expect(container.textContent).toBe("");
  });

  it("does not show the iOS instructions on Android (that path waits for the event)", () => {
    setUA(ANDROID_UA);
    mount();
    act(() => { vi.advanceTimersByTime(4000); });
    expect(container.textContent).toBe("");
  });
});
