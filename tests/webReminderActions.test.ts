// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => "web")
  },
  localNotifications: {
    addListener: vi.fn(async () => ({ remove: vi.fn() }))
  }
}));

vi.mock("@capacitor/core", () => ({ Capacitor: mocks.capacitor }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: mocks.localNotifications }));

import {
  consumePendingNotificationAction,
  registerNotificationDeepLinkListener,
  setPendingNotificationAction,
} from "@/lib/reminders";
import {
  buildWebReminderActionUrl,
  parseWebReminderActionFragment,
  selectReminderActionClient
} from "@/lib/webReminderActions";
import { setAccountStorageOwner } from "@/lib/accountStorageScope";
import { useNoorStore } from "@/store/noorStore";

const originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

const clickDetail = {
  action: "snooze" as const,
  scheduleId: "cr:reminder-a:1800000000000",
  reminderId: "reminder-a",
  accountOwner: "local",
  route: "/c/morning",
  snoozeMinutes: 20,
  title: "أذكار الصباح",
  body: "ابدأ وردك"
};

beforeEach(() => {
  mocks.capacitor.isNativePlatform.mockReturnValue(false);
  setAccountStorageOwner("local");
  useNoorStore.setState({ sectionCompletions: {} });
  consumePendingNotificationAction();
});

afterEach(() => {
  if (originalServiceWorkerDescriptor) {
    Object.defineProperty(navigator, "serviceWorker", originalServiceWorkerDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "serviceWorker");
  }
});

describe("web reminder action handoff", () => {
  it("preserves disabled vibration through the closed-page action URL", () => {
    const url = buildWebReminderActionUrl("https://example.com/", { ...clickDetail, vibration: false });
    expect(parseWebReminderActionFragment(new URL(url).hash)).toMatchObject({ vibration: false });
  });
  it("routes an open action from the service worker through the active app", async () => {
    const serviceWorker = new EventTarget();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: serviceWorker });
    const navigate = vi.fn();
    const cleanup = await registerNotificationDeepLinkListener(navigate);

    serviceWorker.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "athar-reminder-click", detail: { ...clickDetail, action: "open" } }
      })
    );

    expect(navigate).toHaveBeenCalledWith("/c/morning");
    cleanup();
    serviceWorker.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "athar-reminder-click", detail: { ...clickDetail, action: "open" } }
      })
    );
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("applies a live done action without navigating and respects account ownership", async () => {
    const serviceWorker = new EventTarget();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: serviceWorker });
    const navigate = vi.fn();
    const cleanup = await registerNotificationDeepLinkListener(navigate);

    serviceWorker.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "athar-reminder-click", detail: { ...clickDetail, action: "done" } }
      })
    );
    await vi.waitFor(() =>
      expect(useNoorStore.getState().sectionCompletions.morning?.length).toBe(1)
    );
    expect(navigate).not.toHaveBeenCalled();

    const completedSections = useNoorStore.getState().sectionCompletions;
    setAccountStorageOwner("user:another-account");
    serviceWorker.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "athar-reminder-click", detail: { ...clickDetail, action: "done" } }
      })
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useNoorStore.getState().sectionCompletions).toBe(completedSections);
    cleanup();
  });

  it("drains an action buffered before the web app listener mounts", async () => {
    setPendingNotificationAction({
      actionId: "open",
      route: clickDetail.route,
      extra: { accountOwner: "local", route: clickDetail.route },
    });
    const navigate = vi.fn();

    const cleanup = await registerNotificationDeepLinkListener(navigate);

    expect(navigate).toHaveBeenCalledWith(clickDetail.route);
    expect(consumePendingNotificationAction()).toBeNull();
    cleanup();
  });

  it("round-trips cold-start actions in the app-scope fragment without losing route data", () => {
    const url = new URL(buildWebReminderActionUrl("https://example.test/ATHAR/", clickDetail));

    expect(url.pathname).toBe("/ATHAR/");
    expect(url.search).toBe("");
    expect(parseWebReminderActionFragment(url.hash)).toEqual(clickDetail);
  });

  it("ignores unrelated or malformed fragments", () => {
    expect(parseWebReminderActionFragment("#section=morning")).toBeNull();
    expect(parseWebReminderActionFragment("#athar-reminder-action=%7Bbroken")).toBeNull();
    expect(
      parseWebReminderActionFragment("#athar-reminder-action=%7B%22action%22%3A%22delete%22%7D")
    ).toBeNull();
  });

  it("chooses one focused client so a click cannot be applied by every open tab", () => {
    const first = { focused: false };
    const focused = { focused: true };
    expect(selectReminderActionClient([first, focused])).toBe(focused);
    expect(selectReminderActionClient([first])).toBe(first);
    expect(selectReminderActionClient([])).toBeUndefined();
  });
});
