// @vitest-environment jsdom
import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DhikrCard } from "@/components/dhikr/DhikrCard";
import { useNoorStore } from "@/store/noorStore";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function touch(target: Element, type: "touchstart" | "touchend", clientX: number) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const point = { clientX, clientY: 100 };
  Object.defineProperty(event, type === "touchstart" ? "touches" : "changedTouches", { value: [point] });
  act(() => target.dispatchEvent(event));
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  useNoorStore.setState((state) => ({
    ...state,
    progress: {},
    sectionResume: {},
    prefs: { ...state.prefs, autoAdvanceDhikr: false, enableHaptics: false },
  }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.unstubAllGlobals();
});

describe("swipe completion resume position", () => {
  it("saves the current reader position when a right swipe completes the dhikr", () => {
    const dayKey = "2026-11-10";
    const savePosition = vi.fn(() => useNoorStore.getState().setSectionResume("morning", 4, dayKey));
    act(() => {
      root!.render(createElement(DhikrCard, {
        sectionId: "morning",
        index: 4,
        item: { text: "سُبْحَانَ اللَّهِ", count: 3, count_description: "", minimal: false },
        onCounted: savePosition,
      }));
    });

    const text = container!.querySelector(".dhikr-flow");
    expect(text).not.toBeNull();
    touch(text!, "touchstart", 100);
    touch(text!, "touchend", 200);

    expect(useNoorStore.getState().progress["morning:4"]).toBe(3);
    expect(savePosition).toHaveBeenCalledOnce();
    expect(useNoorStore.getState().sectionResume.morning).toEqual({ index: 4, dayKey });
  });
});
