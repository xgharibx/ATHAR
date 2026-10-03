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
let rejectGeolocation: PositionErrorCallback | undefined;

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
  rejectGeolocation = undefined;
  getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
    rejectGeolocation = error;
  });
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
  rejectGeolocation = undefined;
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

  const errorCases = [
    {
      code: 1,
      nearby: "رفضت الإذن بالوصول للموقع. يرجى السماح للتطبيق بتحديد موقعك من الإعدادات.",
      qibla: "رفضت الإذن بالوصول للموقع. يرجى السماح للتطبيق بتحديد موقعك من الإعدادات.",
    },
    {
      code: 2,
      nearby: "تعذّر تحديد موقعك. تأكد من تفعيل خدمات الموقع الجغرافي.",
      qibla: "تعذر تحديد موقعك. تأكد من تفعيل خدمة الموقع.",
    },
    {
      code: 3,
      nearby: "انتهت مهلة طلب الموقع. حاول مرة أخرى.",
      qibla: "انتهت مهلة تحديد الموقع. يرجى المحاولة مجدداً.",
    },
  ];

  const screens = [
    { name: "Nearby Mosques", render: () => createElement(NearbyMosquesPage), messageKey: "nearby" as const },
    { name: "Qibla", render: () => createElement(QiblaPage), messageKey: "qibla" as const },
  ];

  for (const screen of screens) {
    it.each(errorCases)(`${screen.name} code $code gives accurate error guidance`, async ({ code, [screen.messageKey]: expectedMessage }) => {
      mount(screen.render());

      await act(async () => { buttonNamed("تحديد موقعي").click(); });
      await act(async () => {
        rejectGeolocation?.({
          code,
          message: "browser-specific error text",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      });

      expect(container?.textContent).toContain(expectedMessage);
      expect(container?.textContent).toContain("إعادة المحاولة");
    });
  }
});
