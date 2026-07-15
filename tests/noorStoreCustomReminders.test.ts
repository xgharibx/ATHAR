// @vitest-environment jsdom
/**
 * Verifies the custom-reminder store integration.
 *
 * The store's Zustand `addCustomReminder` (set by the B1 companion work)
 * handles the basic CRUD without a debounced IDB flush. The richer
 * helpers — `updateCustomReminder`, `dismissTemplate`, debounced IDB
 * saves, etc. — live in `@/store/customReminderActions`. This test
 * covers both surfaces.
 */
import "fake-indexeddb/auto";
import { describe, expect, it, beforeEach } from "vitest";
import { useNoorStore } from "@/store/noorStore";
import {
  addCustomReminder,
  updateCustomReminder,
  deleteCustomReminder,
  toggleCustomReminder,
  dismissTemplateFlag,
  flushCustomReminderWrites,
  getSeenTemplateIds,
} from "@/store/customReminderActions";
import type { CustomReminder } from "@/data/reminderTypes";

function fixture(overrides: Partial<CustomReminder> = {}): CustomReminder {
  const now = new Date().toISOString();
  return {
    id: "cr_test_x",
    category: "custom",
    title: "Sample",
    enabled: true,
    repeat: "daily",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("noorStore custom reminders", () => {
  beforeEach(async () => {
    try { localStorage.clear(); } catch { /* ignore */ }
    useNoorStore.setState({ customReminders: [] } as Partial<ReturnType<typeof useNoorStore.getState>>);
    // Reset the seenTemplateIds slice too, if it exists on the type.
    useNoorStore.setState(
      { seenTemplateIds: {} } as unknown as Partial<ReturnType<typeof useNoorStore.getState>>,
    );
    await flushCustomReminderWrites();
  });

  it("defaults customReminders to []", () => {
    expect(useNoorStore.getState().customReminders).toEqual([]);
  });

  it("addCustomReminder (store action) mints id, createdAt, updatedAt", () => {
    const id = useNoorStore.getState().addCustomReminder({
      category: "sunnah",
      title: "Stretch",
      description: "5 minutes",
      repeat: "weekly",
      atTimeOfDay: "07:15",
      dayOfWeek: 1,
      deeplink: { route: "/health" },
    });
    expect(typeof id).toBe("string");
    expect(id.startsWith("cr_")).toBe(true);
    const created = useNoorStore.getState().customReminders[0]!;
    expect(created.title).toBe("Stretch");
    expect(created.enabled).toBe(true);
    expect(created.repeat).toBe("weekly");
    expect(typeof created.createdAt).toBe("string");
    expect(typeof created.updatedAt).toBe("string");
    expect(Number.isFinite(Date.parse(created.createdAt))).toBe(true);
  });

  it("addCustomReminder (action helper) writes through as a CustomReminder", () => {
    const id = addCustomReminder({
      category: "custom",
      title: "Helper",
      repeat: "daily",
      atTimeOfDay: "08:30",
    });
    expect(id.startsWith("cr_")).toBe(true);
    const created = useNoorStore.getState().customReminders.find((r) => r.id === id);
    expect(created).toBeDefined();
    expect(created!.title).toBe("Helper");
    expect(created!.enabled).toBe(true);
  });

  it("updateCustomReminder patches fields, bumps updatedAt, preserves id", async () => {
    const id = addCustomReminder({ category: "custom", title: "Old", repeat: "daily", atTimeOfDay: "10:00" });
    const before = useNoorStore.getState().customReminders.find((r) => r.id === id)!;
    await new Promise((r) => setTimeout(r, 5));
    updateCustomReminder(id, { title: "New", atTimeOfDay: "11:30" });
    const after = useNoorStore.getState().customReminders.find((r) => r.id === id)!;
    expect(after.id).toBe(before.id);
    expect(after.title).toBe("New");
    expect(after.atTimeOfDay).toBe("11:30");
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.updatedAt >= before.updatedAt).toBe(true);
  });

  it("deleteCustomReminder removes by id and is no-op for unknown", () => {
    const a = addCustomReminder({ category: "custom", title: "A", repeat: "daily", atTimeOfDay: "08:00" });
    const b = addCustomReminder({ category: "custom", title: "B", repeat: "daily", atTimeOfDay: "09:00" });
    deleteCustomReminder("does-not-exist");
    expect(useNoorStore.getState().customReminders.map((r) => r.id).sort()).toEqual([a, b].sort());
    deleteCustomReminder(a);
    expect(useNoorStore.getState().customReminders.map((r) => r.id)).toEqual([b]);
    deleteCustomReminder(a);
    expect(useNoorStore.getState().customReminders.map((r) => r.id)).toEqual([b]);
  });

  it("toggleCustomReminder (helper) flips enabled and bumps updatedAt", async () => {
    const id = useNoorStore.getState().addCustomReminder({
      category: "custom",
      title: "T",
      enabled: false,
      repeat: "daily",
      atTimeOfDay: "12:00",
    });
    const before = useNoorStore.getState().customReminders[0]!;
    await new Promise((r) => setTimeout(r, 5));
    toggleCustomReminder(id, true);
    const after = useNoorStore.getState().customReminders[0]!;
    expect(after.enabled).toBe(true);
    expect(after.updatedAt >= before.updatedAt).toBe(true);
    toggleCustomReminder(id, false);
    expect(useNoorStore.getState().customReminders[0]!.enabled).toBe(false);
  });

  it("dismissTemplateFlag writes the flag (idempotent) + reads back", () => {
    dismissTemplateFlag("tmpl_welcome");
    expect(getSeenTemplateIds()).toEqual({ tmpl_welcome: true });
    dismissTemplateFlag("tmpl_welcome");
    expect(getSeenTemplateIds()).toEqual({ tmpl_welcome: true });
    dismissTemplateFlag("tmpl_quran");
    expect(getSeenTemplateIds()).toEqual({ tmpl_welcome: true, tmpl_quran: true });
  });

  it("exportState includes customReminders when present", () => {
    const id = addCustomReminder({ category: "custom", title: "E", repeat: "daily", atTimeOfDay: "05:00" });
    const blob = useNoorStore.getState().exportState() as unknown as {
      customReminders: unknown[];
    };
    expect(Array.isArray(blob.customReminders)).toBe(true);
    expect((blob.customReminders as { id: string }[])[0]?.id).toBe(id);
  });

  it("IDB-backed fields are NOT persisted to localStorage", async () => {
    addCustomReminder({ category: "custom", title: "L", repeat: "daily", atTimeOfDay: "06:00" });
    dismissTemplateFlag("tmpl_y");
    await flushCustomReminderWrites();
    if (useNoorStore.persist?.rehydrate) {
      await useNoorStore.persist.rehydrate();
    }
    await new Promise((r) => setTimeout(r, 10));
    const raw = localStorage.getItem("noor_store_v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.customReminders).toBeUndefined();
    expect(parsed.state.prefs).toBeDefined();
    expect(parsed.state.reminders).toBeDefined();
  });
});
