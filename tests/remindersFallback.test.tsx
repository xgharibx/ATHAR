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

vi.mock("@/hooks/usePrayerTimes", () => ({ usePrayerTimes: () => ({ data: undefined }) }));
vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  ModalCloseButton: () => null,
}));
vi.mock("@/components/ui/Switch", () => ({
  Switch: ({ checked }: { checked: boolean }) => <input type="checkbox" checked={checked} readOnly />,
}));
vi.mock("@/lib/customReminderNotifications", () => ({
  getCustomReminderPermissionState: () => "unsupported",
  notifyCustomReminderPermissionChange: vi.fn(),
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
