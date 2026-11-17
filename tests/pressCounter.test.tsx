// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePressCounter } from "@/hooks/usePressCounter";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function Counter({ onCount }: { onCount: () => void }) {
  const press = usePressCounter(onCount);
  return createElement("button", { type: "button", ...press }, "+");
}

function mount(onCount: () => void) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(createElement(Counter, { onCount })));
  return container.querySelector("button")!;
}

function pointerDown(target: Element, init: { button?: number; isPrimary?: boolean } = {}) {
  const event = new MouseEvent("pointerdown", { bubbles: true, button: init.button ?? 0 });
  Object.defineProperty(event, "isPrimary", { value: init.isPrimary ?? true });
  act(() => { target.dispatchEvent(event); });
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.unstubAllGlobals();
});

describe("count on press", () => {
  it("counts when the finger goes down, and not again when it lifts", () => {
    const onCount = vi.fn();
    const button = mount(onCount);
    pointerDown(button);
    expect(onCount).toHaveBeenCalledTimes(1);
    act(() => button.click());
    expect(onCount).toHaveBeenCalledTimes(1);
  });

  it("counts keyboard and screen-reader activation, which has no press", () => {
    const onCount = vi.fn();
    const button = mount(onCount);
    act(() => button.click());
    act(() => button.click());
    expect(onCount).toHaveBeenCalledTimes(2);
  });

  it("ignores a second finger and the right mouse button", () => {
    const onCount = vi.fn();
    const button = mount(onCount);
    pointerDown(button, { isPrimary: false });
    pointerDown(button, { button: 2 });
    expect(onCount).not.toHaveBeenCalled();
  });
});
