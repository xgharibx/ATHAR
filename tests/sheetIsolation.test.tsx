// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "@/components/ui/Modal";
import { FocusManagedDialog } from "@/components/ui/FocusManagedDialog";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const roots: Array<{ root: Root; container: HTMLDivElement }> = [];

function render(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push({ root, container });
  act(() => root.render(node));
}
afterEach(() => {
  for (const { root, container } of roots.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
  document.body.innerHTML = "";
  document.documentElement.style.overflow = "";
});

const touch = (el: Element, type: string) =>
  act(() => { el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true })); });

describe("sheets keep their touches to themselves", () => {
  it("Modal does not pass touches to the page that opened it", () => {
    const onTouchStart = vi.fn();
    const onTouchEnd = vi.fn();
    render(
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <Modal open onClose={() => {}} ariaLabel="x"><button id="inner">tafsir</button></Modal>
      </div>,
    );
    const inner = document.getElementById("inner")!;
    touch(inner, "touchstart");
    touch(inner, "touchend");
    expect(onTouchStart).not.toHaveBeenCalled();
    expect(onTouchEnd).not.toHaveBeenCalled();
  });

  it("FocusManagedDialog does the same for non-portal sheets", () => {
    const onTouchEnd = vi.fn();
    render(
      <div onTouchEnd={onTouchEnd}>
        <FocusManagedDialog onClose={() => {}}><button id="in2">x</button></FocusManagedDialog>
      </div>,
    );
    touch(document.getElementById("in2")!, "touchend");
    expect(onTouchEnd).not.toHaveBeenCalled();
  });

  it("locks and restores page scroll on both <html> and <body>", () => {
    render(<Modal open onClose={() => {}} ariaLabel="x"><p>hi</p></Modal>);
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");
    act(() => roots[0].root.render(<div />));
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });
});
