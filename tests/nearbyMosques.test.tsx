// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { NearbyMosquesPage } from "@/pages/NearbyMosques";

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let geolocationDescriptor: PropertyDescriptor | undefined;
let grantLocation: PositionCallback | undefined;
let fetchMock: ReturnType<typeof vi.fn>;

function mountNearbyMosques() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(createElement(NearbyMosquesPage)));
}

function requestLocation() {
  const button = Array.from(container!.querySelectorAll("button"))
    .find((candidate) => candidate.textContent?.trim() === "تحديد موقعي");
  if (!button) throw new Error("Location button not found");
  act(() => button.click());
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  geolocationDescriptor = Object.getOwnPropertyDescriptor(navigator, "geolocation");
  grantLocation = undefined;
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((success: PositionCallback) => { grantLocation = success; }),
    },
  });
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ elements: [] }),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  if (geolocationDescriptor) Object.defineProperty(navigator, "geolocation", geolocationDescriptor);
  else Reflect.deleteProperty(navigator, "geolocation");
  geolocationDescriptor = undefined;
  grantLocation = undefined;
  vi.unstubAllGlobals();
});

describe("Nearby Mosques request lifecycle", () => {
  it("does not search after a pending location callback resolves after unmount", async () => {
    mountNearbyMosques();
    requestLocation();
    expect(grantLocation).toBeDefined();

    act(() => root!.unmount());
    root = undefined;

    await act(async () => {
      grantLocation?.({ coords: { latitude: 30.0444, longitude: 31.2357 } } as GeolocationPosition);
      await Promise.resolve();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the retryable Arabic error for a malformed successful Overpass payload", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ remark: "runtime error" }),
    });
    mountNearbyMosques();
    requestLocation();

    await act(async () => {
      grantLocation?.({ coords: { latitude: 30.0444, longitude: 31.2357 } } as GeolocationPosition);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container?.textContent).toContain("تعذر جلب بيانات المساجد. تحقق من اتصالك وحاول مرة أخرى.");
    expect(container?.textContent).toContain("إعادة المحاولة");
    expect(container?.textContent).not.toContain("elements");
  });

  it("shows a retryable error when Overpass returns a runtime remark with partial elements", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [{ type: "node", id: 1, lat: 30.0444, lon: 31.2357, tags: { name: "مسجد جزئي" } }],
        remark: "runtime error: Query timed out",
      }),
    });
    mountNearbyMosques();
    requestLocation();

    await act(async () => {
      grantLocation?.({ coords: { latitude: 30.0444, longitude: 31.2357 } } as GeolocationPosition);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container?.textContent).toContain("تعذر جلب بيانات المساجد. تحقق من اتصالك وحاول مرة أخرى.");
    expect(container?.textContent).toContain("إعادة المحاولة");
    expect(container?.textContent).not.toContain("مسجد جزئي");
  });

  it("uses a safe Arabic fallback when a mosque name is not a string", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [{ type: "node", id: 1, lat: 30.0444, lon: 31.2357, tags: { name: { malformed: true } } }],
      }),
    });
    mountNearbyMosques();
    requestLocation();

    await act(async () => {
      grantLocation?.({ coords: { latitude: 30.0444, longitude: 31.2357 } } as GeolocationPosition);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container?.textContent).toContain("مسجد");
    expect(container?.textContent).not.toContain("malformed");
  });

  it("does not let the server's arbitrary output limit hide the nearest mosque", async () => {
    const elements = Array.from({ length: 26 }, (_, index) => ({
      type: "node",
      id: index + 1,
      lat: index === 25 ? 30.0444 : 30.05,
      lon: index === 25 ? 31.2357 : 31.24,
      tags: { name: index === 25 ? "أقرب مسجد" : `مسجد ${index + 1}` },
    }));
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ elements }) });
    mountNearbyMosques();
    requestLocation();

    await act(async () => {
      grantLocation?.({ coords: { latitude: 30.0444, longitude: 31.2357 } } as GeolocationPosition);
      await Promise.resolve();
      await Promise.resolve();
    });

    const query = new URLSearchParams(String(fetchMock.mock.calls[0]?.[1]?.body)).get("data") ?? "";
    expect(query).not.toContain("out center 25");
    expect(container?.textContent).toContain("أقرب مسجد");
  });

  it("does not label a way center outside five kilometers as nearby", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [{
        type: "way",
        id: 100,
        center: { lat: 30.1, lon: 31.2 },
        tags: { name: "مسجد خارج النطاق" },
      }] }),
    });
    mountNearbyMosques();
    requestLocation();

    await act(async () => {
      grantLocation?.({ coords: { latitude: 30.0444, longitude: 31.2357 } } as GeolocationPosition);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container?.textContent).not.toContain("مسجد خارج النطاق");
    expect(container?.textContent).toContain("لم يُعثر على مساجد مسجّلة في نطاق 5 كم");
  });
});
