// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemorizationAyahContent } from "@/components/quran/MemorizationAyahContent";

let container: HTMLDivElement;
let root: Root;
const toggle = vi.fn();

function renderContent(props: { enabled: boolean; hidden: boolean }) {
  root.render(createElement(MemorizationAyahContent, {
    enabled: props.enabled,
    hidden: props.hidden,
    label: props.hidden ? "كشف الآية ١ من سورة الفاتحة" : "إخفاء الآية ١ من سورة الفاتحة",
    onToggle: toggle,
  }, "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ"));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  toggle.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Mushaf memorization reveal accessibility", () => {
  it("hides an unrevealed verse from assistive technology and offers a named control", () => {
    act(() => renderContent({ enabled: true, hidden: true }));

    const content = container.querySelector(".mushaf-ayah-content");
    const button = container.querySelector("button");
    expect(content?.getAttribute("aria-hidden")).toBe("true");
    expect(content?.className).toContain("mem-hidden-text");
    expect(button?.getAttribute("aria-label")).toBe("كشف الآية ١ من سورة الفاتحة");
    expect(button?.getAttribute("aria-pressed")).toBe("false");
    expect(button?.tabIndex).toBe(0);
  });

  it.each(["Enter", " "]) ("reveals or hides the verse with the %s key", (key) => {
    act(() => renderContent({ enabled: true, hidden: true }));
    const button = container.querySelector("button")!;
    act(() => button.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })));
    expect(toggle).toHaveBeenCalledOnce();
  });

  it("restores the ayah text to the accessibility tree when revealed", () => {
    act(() => renderContent({ enabled: true, hidden: false }));

    const content = container.querySelector(".mushaf-ayah-content");
    const button = container.querySelector("button");
    expect(content?.hasAttribute("aria-hidden")).toBe(false);
    expect(content?.textContent).toContain("الْحَمْدُ لِلَّهِ");
    expect(button?.getAttribute("aria-label")).toBe("إخفاء الآية ١ من سورة الفاتحة");
    expect(button?.getAttribute("aria-pressed")).toBe("true");
  });

  it("does not add a reveal control when memorization mode is off", () => {
    act(() => renderContent({ enabled: false, hidden: false }));
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector(".mushaf-ayah-content")?.hasAttribute("aria-hidden")).toBe(false);
  });
});
