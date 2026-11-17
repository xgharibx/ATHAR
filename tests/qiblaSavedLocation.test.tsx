// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/prayerLocation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/prayerLocation")>()),
  readCachedPrayerCoordinates: () => ({ lat: 30.0444, lng: 31.2357 }),
}));

import { QiblaPage } from "@/pages/Qibla";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.unstubAllGlobals();
});

describe("Qibla page", () => {
  it("points at once from the location saved for prayer times, without asking for GPS", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root!.render(createElement(QiblaPage)));

    // Cairo to the Kaaba: about 136° (south-east).
    expect(container.textContent).toContain("136°");
    expect(container.textContent).toContain("موقع مواقيت الصلاة");
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
