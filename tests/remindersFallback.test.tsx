// @vitest-environment jsdom
import * as React from "react";
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { useNoorStore } from "@/store/noorStore";
import { dismissTemplateFlag, flushCustomReminderWrites } from "@/store/customReminderActions";
import { REMINDER_TEMPLATES } from "@/data/reminderTemplates";
import { RemindersPage } from "@/pages/Reminders";

const mocks = vi.hoisted(() => ({
  getExactAlarmPermissionState: vi.fn(),
  getCustomReminderPermissionState: vi.fn(),
  requestExactAlarmPermission: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/usePrayerTimes", () => ({ usePrayerTimes: () => ({ data: undefined }) }));
vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  ModalCloseButton: () => null,
}));
vi.mock("@/components/ui/Switch", () => ({
  Switch: ({ checked }: { checked: boolean }) => <input type="checkbox" checked={checked} readOnly />,
}));
vi.mock("react-hot-toast", () => ({
  default: { error: mocks.toastError, success: vi.fn() },
}));
vi.mock("@/lib/customReminderNotifications", () => ({
  getExactAlarmPermissionState: mocks.getExactAlarmPermissionState,
  getCustomReminderPermissionState: mocks.getCustomReminderPermissionState,
  notifyCustomReminderPermissionChange: vi.fn(),
  requestExactAlarmPermission: mocks.requestExactAlarmPermission,
  requestCustomReminderPermission: vi.fn(),
}));
vi.mock("@/lib/reminders", () => ({
  applyNotificationAction: vi.fn(),
  REMINDER_SOUND_OPTIONS: [{ id: "rain_calm", label: "هادئ" }],
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  useNoorStore.setState({
    customReminders: undefined,
    seenTemplateIds: {},
  } as unknown as Partial<ReturnType<typeof useNoorStore.getState>>);
  mocks.getExactAlarmPermissionState.mockResolvedValue("not-applicable");
  mocks.getCustomReminderPermissionState.mockReturnValue("unsupported");
  mocks.requestExactAlarmPermission.mockResolvedValue("granted");
});

afterEach(async () => {
  act(() => root.unmount());
  await flushCustomReminderWrites();
  container.remove();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("RemindersPage missing-list fallback", () => {
  it("does not rebuild template recommendations on an unrelated local rerender", () => {
    const originalSome = Array.prototype.some;
    let emptyListSomeCalls = 0;
    vi.spyOn(Array.prototype, "some").mockImplementation(function <T>(
      this: T[],
      predicate: (value: T, index: number, array: T[]) => unknown,
      thisArg?: unknown,
    ) {
      if (this.length === 0 && new Error().stack?.includes("Reminders.tsx")) {
        emptyListSomeCalls += 1;
      }
      return originalSome.call(this, predicate, thisArg);
    });

    act(() => {
      root.render(<MemoryRouter><RemindersPage /></MemoryRouter>);
    });
    const callsAfterMount = emptyListSomeCalls;
    expect(callsAfterMount).toBeGreaterThan(0);

    act(() => {
      container.querySelector<HTMLButtonElement>('button[aria-label="تذكير جديد"]')!.click();
    });

    expect(emptyListSomeCalls).toBe(callsAfterMount);
  });

  it("shows schedule counts without claiming completion rates or streaks", async () => {
    useNoorStore.setState({ customReminders: [] });
    useNoorStore.getState().addCustomReminder({
      category: "custom",
      title: "ورد الصباح",
      repeat: "daily",
      atTimeOfDay: "18:00",
    });

    await act(async () => {
      root.render(<MemoryRouter><RemindersPage /></MemoryRouter>);
      await Promise.resolve();
    });

    const text = container.textContent ?? "";
    expect(text).toContain("مفعّلة الآن");
    expect(text).toContain("مواعيد اليوم");
    expect(text).toContain("خلال ٧ أيام");
    expect(text).toContain("وفق التكرار");
    expect(text).not.toContain("نسبة الالتزام");
    expect(text).not.toContain("أفضل تتابع");
    const summaryValues = Array.from(container.querySelectorAll("p.text-base"), (node) => node.textContent ?? "");
    expect(summaryValues).toHaveLength(3);
    expect(summaryValues.every((value) => /[٠-٩]/.test(value))).toBe(true);
  });

  it("explains platform limits beside sound and vibration preferences", async () => {
    act(() => {
      root.render(<MemoryRouter><RemindersPage /></MemoryRouter>);
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="تذكير جديد"]')!.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("على Android يُطبّق الاختيار عبر قناة الإشعارات");
    expect(container.textContent).toContain("في الويب يحدد المتصفح الصوت");
    expect(container.textContent).toContain("وعلى iOS يحدد النظام سلوك الإشعار");
  });

  it("updates recommendations when a template is dismissed without changing reminders", () => {
    const firstTemplate = REMINDER_TEMPLATES[0]!;
    useNoorStore.setState({ customReminders: [] });

    act(() => {
      root.render(<MemoryRouter><RemindersPage /></MemoryRouter>);
    });
    expect(container.querySelector("section article h3")?.textContent).toBe(firstTemplate.title.ar);

    act(() => dismissTemplateFlag(firstTemplate.id));

    expect(useNoorStore.getState().customReminders).toHaveLength(0);
    expect(container.querySelector("section article h3")?.textContent).toBe(REMINDER_TEMPLATES[1]!.title.ar);
  });
});

describe("RemindersPage Android exact-alarm access", () => {
  it("keeps active reminders enabled and offers an optional timing-settings action", async () => {
    useNoorStore.setState({ customReminders: [] });
    useNoorStore.getState().addCustomReminder({
      category: "custom",
      title: "ورد الصباح",
      repeat: "daily",
      atTimeOfDay: "09:00",
    });
    mocks.getExactAlarmPermissionState.mockResolvedValue("denied");

    await act(async () => {
      root.render(<MemoryRouter><RemindersPage /></MemoryRouter>);
      await Promise.resolve();
    });

    expect(useNoorStore.getState().customReminders[0]?.enabled).toBe(true);
    expect(container.textContent).toContain("قد تتأخر إشعارات التذكير على أندرويد");
    const enableExactButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="ضبط دقة أوقات التذكير"]',
    );
    expect(enableExactButton).not.toBeNull();
    expect(enableExactButton?.className).toContain("min-h-11");
    expect(mocks.requestExactAlarmPermission).not.toHaveBeenCalled();

    await act(async () => {
      enableExactButton!.click();
      await Promise.resolve();
    });

    expect(mocks.requestExactAlarmPermission).toHaveBeenCalledOnce();
    expect(useNoorStore.getState().customReminders[0]?.enabled).toBe(true);
    expect(container.textContent).not.toContain("قد تتأخر إشعارات التذكير على أندرويد");
  });

  it("keeps a truthful warning when Android exact-alarm settings are unavailable", async () => {
    useNoorStore.setState({ customReminders: [] });
    useNoorStore.getState().addCustomReminder({
      category: "custom",
      title: "قراءة القرآن",
      repeat: "daily",
      atTimeOfDay: "20:00",
    });
    mocks.getExactAlarmPermissionState.mockResolvedValue("denied");
    mocks.requestExactAlarmPermission.mockResolvedValue("unsupported");

    await act(async () => {
      root.render(<MemoryRouter><RemindersPage /></MemoryRouter>);
      await Promise.resolve();
    });
    const enableExactButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="ضبط دقة أوقات التذكير"]',
    );
    expect(enableExactButton).not.toBeNull();

    await act(async () => {
      enableExactButton!.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("تعذّر التحقق من دقة التنبيهات على هذا الجهاز");
    expect(container.textContent).not.toContain("قد تتأخر إشعارات التذكير على أندرويد");
    expect(container.querySelector('button[aria-label="ضبط دقة أوقات التذكير"]')).toBeNull();
    expect(useNoorStore.getState().customReminders[0]?.enabled).toBe(true);
    expect(mocks.toastError).toHaveBeenCalledWith("تعذّر التحقق من دقة التنبيهات على هذا الجهاز.");
  });

  it("refreshes the timing notice when returning from Android settings", async () => {
    useNoorStore.setState({ customReminders: [] });
    useNoorStore.getState().addCustomReminder({
      category: "custom",
      title: "ورد المساء",
      repeat: "daily",
      atTimeOfDay: "18:00",
    });
    mocks.getExactAlarmPermissionState.mockResolvedValue("denied");

    await act(async () => {
      root.render(<MemoryRouter><RemindersPage /></MemoryRouter>);
      await Promise.resolve();
    });
    expect(container.textContent).toContain("قد تتأخر إشعارات التذكير على أندرويد");

    mocks.getExactAlarmPermissionState.mockResolvedValue("granted");
    await act(async () => {
      window.dispatchEvent(new Event("athar-app-resume"));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).not.toContain("قد تتأخر إشعارات التذكير على أندرويد");
    expect(useNoorStore.getState().customReminders[0]?.enabled).toBe(true);
  });
});

describe("RemindersPage web notification reliability", () => {
  it("keeps a background-delivery caveat visible after browser permission is granted", async () => {
    useNoorStore.setState({ customReminders: [] });
    useNoorStore.getState().addCustomReminder({
      category: "custom",
      title: "ورد الصباح",
      repeat: "daily",
      atTimeOfDay: "09:00",
    });
    mocks.getCustomReminderPermissionState.mockReturnValue("granted");

    await act(async () => {
      root.render(<MemoryRouter><RemindersPage /></MemoryRouter>);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("قد يفوت إشعار الويب إذا أُغلقت الصفحة أو أوقف المتصفح نشاطها في الخلفية");
    expect(container.querySelector('button[aria-label="تفعيل إشعارات التذكيرات"]')).toBeNull();
  });
});
