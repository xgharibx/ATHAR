// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const platform = vi.hoisted(() => ({ value: "android" as "ios" | "android" | null, allowed: true }));
vi.mock("@/lib/prayerLiveActivity", () => ({
  prayerCountdownPlatform: () => platform.value,
  prayerCountdownAllowed: async () => platform.allowed,
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: toastMock }));

import { CountdownSuggestion } from "@/components/prayer/CountdownSuggestion";
import { useNoorStore } from "@/store/noorStore";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(createElement(CountdownSuggestion)));
}

function button(name: string) {
  const found = Array.from(container!.querySelectorAll("button")).find((b) => b.textContent?.trim() === name || b.getAttribute("aria-label") === name);
  if (!found) throw new Error(`no button ${name}`);
  return found;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  platform.value = "android";
  platform.allowed = true;
  useNoorStore.getState().setReminders({ prayerLiveActivity: false });
  toastMock.success.mockClear();
  toastMock.error.mockClear();
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = undefined;
  vi.unstubAllGlobals();
});

describe("next-prayer countdown suggestion", () => {
  it("offers the countdown in the apps, worded for each platform", () => {
    mount();
    expect(container!.textContent).toContain("شريط الإشعارات");
    act(() => root!.unmount());
    platform.value = "ios";
    mount();
    expect(container!.textContent).toContain("الجزيرة التفاعلية");
  });

  it("turns the countdown on, and says so when the system blocks it", async () => {
    mount();
    await act(async () => { button("تفعيل").click(); });
    expect(useNoorStore.getState().reminders.prayerLiveActivity).toBe(true);
    expect(toastMock.success).toHaveBeenCalled();
    expect(container!.textContent).toBe("");

    act(() => root!.unmount());
    useNoorStore.getState().setReminders({ prayerLiveActivity: false });
    platform.allowed = false;
    mount();
    await act(async () => { button("تفعيل").click(); });
    expect(toastMock.error).toHaveBeenCalledWith("اسمح لتطبيق أثر بإرسال الإشعارات من إعدادات الجهاز");
  });

  it("stays away once dismissed, and never shows on the web", () => {
    mount();
    act(() => button("لا، شكرًا").click());
    expect(container!.textContent).toBe("");
    act(() => root!.unmount());
    mount();
    expect(container!.textContent).toBe("");
    act(() => root!.unmount());
    localStorage.clear();
    platform.value = null;
    mount();
    expect(container!.textContent).toBe("");
  });
});
