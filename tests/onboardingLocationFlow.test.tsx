// @vitest-environment jsdom
import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  nativePlatform: true,
  requestPrayerLocation: vi.fn<() => Promise<boolean>>(),
  requestNotificationPermission: vi.fn(),
  setOnboardingDone: vi.fn(),
  setReminders: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mocks.nativePlatform },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock("@/store/noorStore", () => ({
  useNoorStore: (selector: (state: { setOnboardingDone: typeof mocks.setOnboardingDone; setReminders: typeof mocks.setReminders }) => unknown) =>
    selector({ setOnboardingDone: mocks.setOnboardingDone, setReminders: mocks.setReminders }),
}));
vi.mock("@/lib/reminders", () => ({ isNativePlatform: vi.fn(), requestNotificationPermission: mocks.requestNotificationPermission }));
vi.mock("@/hooks/usePrayerTimes", () => ({ requestPrayerLocation: mocks.requestPrayerLocation }));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn() } }));
vi.mock("framer-motion", () => ({
  motion: { div: "div" },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(createElement(OnboardingFlow)));
}

function buttonNamed(name: string) {
  const button = Array.from(container!.querySelectorAll("button")).find((candidate) => candidate.textContent?.trim() === name);
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.nativePlatform = true;
  mocks.requestPrayerLocation.mockResolvedValue(true);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.unstubAllGlobals();
});

describe("onboarding location choice", () => {
  it("discloses the prayer-times location recipient before asking for permission", async () => {
    mount();
    await act(async () => { buttonNamed("التالي").click(); });

    expect(container?.textContent).toContain("AlAdhan");
    expect(container?.textContent).toContain("القاهرة");
    expect(mocks.requestPrayerLocation).not.toHaveBeenCalled();
  });

  it("continues to notification setup when the user chooses not now", async () => {
    mount();
    await act(async () => { buttonNamed("التالي").click(); });

    expect(container?.textContent).toContain("مواقيت الصلاة");
    expect(container?.textContent).toContain("استخدام موقعي");

    await act(async () => { buttonNamed("ليس الآن").click(); });

    expect(container?.textContent).toContain("التنبيهات");
    expect(mocks.requestPrayerLocation).not.toHaveBeenCalled();
    expect(mocks.setOnboardingDone).not.toHaveBeenCalled();
  });

  it("does not wait for a slow location lookup before advancing", async () => {
    let resolveLocation!: (saved: boolean) => void;
    const pendingLocation = new Promise<boolean>((resolve) => { resolveLocation = resolve; });
    mocks.requestPrayerLocation.mockReturnValue(pendingLocation);
    mount();
    await act(async () => { buttonNamed("التالي").click(); });

    await act(async () => { buttonNamed("استخدام موقعي").click(); });

    expect(mocks.requestPrayerLocation).toHaveBeenCalledOnce();
    expect(container?.textContent).toContain("التنبيهات");
    expect(mocks.setOnboardingDone).not.toHaveBeenCalled();

    await act(async () => { resolveLocation(true); await pendingLocation; });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["prayer-times", "v3"] });
  });

  it("finishes web onboarding without asking for notification permission or promising prayer alerts", async () => {
    mocks.nativePlatform = false;
    const requestPermission = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    mount();

    await act(async () => { buttonNamed("التالي").click(); });
    expect(container?.textContent).toContain("مواقيت الصلاة");
    await act(async () => { buttonNamed("ليس الآن").click(); });

    expect(mocks.setOnboardingDone).toHaveBeenCalledWith(true);
    expect(container?.textContent).not.toContain("تذكير بأوقات الصلاة");
    expect(container?.textContent).not.toContain("التنبيهات");
    expect(requestPermission).not.toHaveBeenCalled();
    expect(mocks.requestNotificationPermission).not.toHaveBeenCalled();
    expect(mocks.setReminders).not.toHaveBeenCalled();
  });

  it("completes web onboarding after the optional location request", async () => {
    mocks.nativePlatform = false;
    mount();
    await act(async () => { buttonNamed("التالي").click(); });
    await act(async () => { buttonNamed("استخدام موقعي").click(); });

    expect(mocks.requestPrayerLocation).toHaveBeenCalledOnce();
    expect(mocks.setOnboardingDone).toHaveBeenCalledWith(true);
    expect(container?.textContent).not.toContain("التنبيهات");
  });
});
