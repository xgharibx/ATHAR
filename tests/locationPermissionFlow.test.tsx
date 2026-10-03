// @vitest-environment jsdom
import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { NearbyMosquesPage } from "@/pages/NearbyMosques";
import { QiblaPage } from "@/pages/Qibla";

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let geoDescriptor: PropertyDescriptor | undefined;
let getCurrentPosition: ReturnType<typeof vi.fn>;

function mount(component: React.ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(component));
}

function buttonNamed(name: string) {
  const button = Array.from(container!.querySelectorAll("button"))
    .find((candidate) => candidate.textContent?.trim() === name);
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  geoDescriptor = Object.getOwnPropertyDescriptor(navigator, "geolocation");
  getCurrentPosition = vi.fn();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ elements: [] }),
  }));
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  if (geoDescriptor) Object.defineProperty(navigator, "geolocation", geoDescriptor);
  else Reflect.deleteProperty(navigator, "geolocation");
  geoDescriptor = undefined;
  vi.unstubAllGlobals();
});

describe("explicit location permission flows", () => {
  it("waits for the visitor to request location before searching nearby mosques", async () => {
    mount(createElement(NearbyMosquesPage));

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(container?.textContent).toContain("تحديد موقعي");
    expect(container?.textContent).toContain("OpenStreetMap");

    await act(async () => { buttonNamed("تحديد موقعي").click(); });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it("waits for the visitor to request location before calculating Qibla", async () => {
    mount(createElement(QiblaPage));

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(container?.textContent).toContain("تحديد موقعي");
    expect(container?.textContent).toContain("على جهازك");

    await act(async () => { buttonNamed("تحديد موقعي").click(); });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });
});
