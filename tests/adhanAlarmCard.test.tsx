// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const alarm = vi.hoisted(() => ({
  status: { available: true, authorized: false } as { available: boolean; authorized: boolean },
  afterRequest: { available: true, authorized: true } as { available: boolean; authorized: boolean },
  request: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/adhanAlarm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/adhanAlarm")>()),
  adhanAlarmStatus: vi.fn(async () => alarm.status),
  requestAdhanAlarmPermission: vi.fn(async () => { alarm.request(); return alarm.afterRequest; }),
  testAdhanAlarm: vi.fn(async () => true),
}));

import { AdhanAlarmCard } from "@/components/settings/AdhanAlarmCard";
import type { Reminders } from "@/store/noorStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
const setReminders = vi.fn();
const base = { enabled: true, prayerAlertsEnabled: true, prayerAlerts: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true } } as Reminders;

async function render(reminders: Reminders, platform: "ios" | "android" = "android") {
  await act(async () => {
    root.render(<AdhanAlarmCard reminders={reminders} setReminders={setReminders} platform={platform} />);
    await Promise.resolve();
  });
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  setReminders.mockReset();
  alarm.request.mockReset();
  alarm.status = { available: true, authorized: false };
  alarm.afterRequest = { available: true, authorized: true };
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Settings › الأذان كمنبّه", () => {
  it("asks for the alarm permission, then turns the alarm on", async () => {
    await render(base);
    const toggle = container.querySelector('[aria-label="الأذان كمنبّه"]') as HTMLButtonElement;
    await act(async () => { toggle.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(alarm.request).toHaveBeenCalled();
    expect(setReminders).toHaveBeenCalledWith({
      adhanAlarm: { enabled: true, prayers: { Fajr: true, Dhuhr: false, Asr: false, Maghrib: false, Isha: false } },
    });
  });

  it("stays off when the permission is refused", async () => {
    alarm.afterRequest = { available: true, authorized: false };
    await render(base);
    const toggle = container.querySelector('[aria-label="الأذان كمنبّه"]') as HTMLButtonElement;
    await act(async () => { toggle.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(setReminders).not.toHaveBeenCalled();
  });

  it("lets the person pick the prayers once on", async () => {
    await render({ ...base, adhanAlarm: { enabled: true, prayers: { Fajr: true, Dhuhr: false, Asr: false, Maghrib: false, Isha: false } } });
    const isha = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "العشاء")!;
    expect(isha.getAttribute("aria-pressed")).toBe("false");
    act(() => isha.click());
    expect(setReminders).toHaveBeenCalledWith({
      adhanAlarm: { enabled: true, prayers: { Fajr: true, Dhuhr: false, Asr: false, Maghrib: false, Isha: true } },
    });
  });

  it("explains the iOS 26 requirement on older iPhones", async () => {
    alarm.status = { available: false, authorized: false };
    await render(base, "ios");
    expect(container.textContent).toContain("iOS 26");
    expect(container.querySelector('[aria-label="الأذان كمنبّه"]')).toBeNull();
  });
});
