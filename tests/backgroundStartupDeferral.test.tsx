/** @vitest-environment jsdom */
import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markStartupReady } from "@/lib/startup";

const state = vi.hoisted(() => ({ prefs: { enable3D: true, reduceMotion: false, theme: "forest", transparentMode: false } }));
vi.mock("@/store/noorStore", () => ({ useNoorStore: (selector: (value: typeof state) => unknown) => selector(state) }));
vi.mock("@/components/background/NoorStarfield", () => ({ default: () => null }));
import { NoorBackground } from "@/components/background/NoorBackground";

let root: Root | undefined;
let idleCallbacks: Array<() => void>;
let requestIdle: ReturnType<typeof vi.fn>;
let cancelIdle: ReturnType<typeof vi.fn>;
let getContext: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  document.body.innerHTML = '<div id="app-loader"></div><div id="test-root"></div>';
  idleCallbacks = [];
  requestIdle = vi.fn((callback: () => void) => { idleCallbacks.push(callback); return idleCallbacks.length; });
  cancelIdle = vi.fn();
  vi.stubGlobal("requestIdleCallback", requestIdle);
  vi.stubGlobal("cancelIdleCallback", cancelIdle);
  getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  state.prefs.enable3D = true;
  state.prefs.reduceMotion = false;
  root = createRoot(document.getElementById("test-root")!);
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("optional background startup work", () => {
  it("waits for usable app content before scheduling idle WebGL work", () => {
    act(() => root!.render(createElement(NoorBackground)));
    expect(getContext).not.toHaveBeenCalled();
    expect(requestIdle).not.toHaveBeenCalled();
    act(() => markStartupReady());
    expect(requestIdle).toHaveBeenCalledOnce();
    expect(getContext).not.toHaveBeenCalled();
    act(() => idleCallbacks[0]());
    expect(getContext).toHaveBeenCalled();
  });

  it("does not schedule a background that unmounted before readiness", () => {
    act(() => root!.render(createElement(NoorBackground)));
    act(() => root!.unmount());
    root = undefined;
    markStartupReady();
    expect(requestIdle).not.toHaveBeenCalled();
    expect(getContext).not.toHaveBeenCalled();
  });

  it("cancels scheduled work on unmount after readiness", () => {
    markStartupReady();
    act(() => root!.render(createElement(NoorBackground)));
    expect(requestIdle).toHaveBeenCalledOnce();
    act(() => root!.unmount());
    root = undefined;
    expect(cancelIdle).toHaveBeenCalledWith(1);
    act(() => idleCallbacks[0]());
    expect(getContext).not.toHaveBeenCalled();
  });

  it.each([{ reduceMotion: true, enable3D: true }, { reduceMotion: false, enable3D: false }])("respects background preferences %j after readiness", (prefs) => {
    Object.assign(state.prefs, prefs);
    markStartupReady();
    act(() => root!.render(createElement(NoorBackground)));
    expect(requestIdle).not.toHaveBeenCalled();
    expect(getContext).not.toHaveBeenCalled();
  });

  it("starts its existing timeout fallback only after readiness when idle callbacks are unavailable", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    act(() => root!.render(createElement(NoorBackground)));
    act(() => vi.advanceTimersByTime(2000));
    expect(getContext).not.toHaveBeenCalled();
    act(() => markStartupReady());
    act(() => vi.advanceTimersByTime(1499));
    expect(getContext).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(getContext).toHaveBeenCalled();
  });
});
