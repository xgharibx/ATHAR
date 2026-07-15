// @vitest-environment jsdom
/**
 * `reminderStorage` is the IndexedDB adapter for user-defined
 * `CustomReminder` entries + "template seen" flags. It must round-trip
 * arrays cleanly, drop malformed rows, and write/read under correct
 * namespaced keys.
 */
import "fake-indexeddb/auto";
import { describe, expect, it, beforeEach } from "vitest";
import {
  loadCustomReminders,
  saveCustomReminders,
  loadCustomReminderTemplates,
  dismissTemplate,
  saveCustomReminderTemplates,
  _internal,
} from "@/lib/reminderStorage";
import type { CustomReminder } from "@/data/reminderTypes";

function makeReminder(overrides: Partial<CustomReminder> = {}): CustomReminder {
  const now = new Date().toISOString();
  return {
    id: "cr_test_1",
    category: "custom",
    title: "Drink water",
    description: "Remember hydration",
    enabled: true,
    repeat: "daily",
    atTimeOfDay: "08:30",
    deeplink: { route: "/health" },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("reminderStorage", () => {
  beforeEach(async () => {
    // Wipe IDB before each test so each case is hermetic.
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(_internal.REMINDERS_DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  });

  it("uses the noor_custom_reminders_v1 namespace prefix", () => {
    expect(_internal.REMINDERS_LIST_KEY.startsWith("noor_custom_reminders_v1")).toBe(true);
    expect(_internal.REMINDERS_TEMPLATES_KEY.startsWith("noor_custom_reminders_v1")).toBe(true);
  });

  it("loadCustomReminders returns [] when IDB is empty", async () => {
    const out = await loadCustomReminders();
    expect(out).toEqual([]);
  });

  it("saveCustomReminders + loadCustomReminders round-trips an array", async () => {
    const items = [
      makeReminder({ id: "a", title: "A" }),
      makeReminder({ id: "b", title: "B", enabled: false, atTimeOfDay: "23:00", repeat: "once" }),
    ];
    await saveCustomReminders(items);
    const out = await loadCustomReminders();
    expect(out).toHaveLength(2);
    expect(out[0]?.id).toBe("a");
    expect(out[1]?.enabled).toBe(false);
    expect(out[1]?.atTimeOfDay).toBe("23:00");
    expect(out[1]?.repeat).toBe("once");
  });

  it("drops rows missing required fields when reading malformed IDB entries", async () => {
    const raw = [
      makeReminder({ id: "good" }),
      // @ts-expect-error — testing missing required field
      { ...makeReminder({ id: undefined }), id: undefined },
      // @ts-expect-error — testing missing required field
      { ...makeReminder({ id: "noTitle" }), title: undefined },
      // @ts-expect-error — testing wrong type
      { ...makeReminder({ id: "noEnabled" }), enabled: "yes" },
    ];
    // Entries missing required scalars (id, title) are dropped; missing
    // optional fields (enabled, repeat, category) fall back to safe defaults
    // so the row survives.
    await saveCustomReminders(raw as unknown as CustomReminder[]);
    const out = await loadCustomReminders();
    expect(out.map((r) => r.id)).toEqual(["good"]);
  });

  it("defaults invalid `category` to \"custom\"", async () => {
    // @ts-expect-error — testing invalid category
    const item = makeReminder({ category: "evil" });
    await saveCustomReminders([item]);
    const out = await loadCustomReminders();
    expect(out[0]?.category).toBe("custom");
  });

  it("defaults invalid `repeat` to \"daily\"", async () => {
    // @ts-expect-error — testing invalid repeat
    const item = makeReminder({ repeat: "every-fortnight" });
    await saveCustomReminders([item]);
    const out = await loadCustomReminders();
    expect(out[0]?.repeat).toBe("daily");
  });

  it("clamps dayOfMonth to [1, 31] range, otherwise drops it", async () => {
    const a = makeReminder({ id: "dom-ok", repeat: "monthly", dayOfMonth: 15 });
    const b = makeReminder({ id: "dom-bad", repeat: "monthly", dayOfMonth: 0 });
    const c = makeReminder({ id: "dom-bad-32", repeat: "monthly", dayOfMonth: 32 });
    await saveCustomReminders([a, b, c]);
    const out = await loadCustomReminders();
    expect(out.find((r) => r.id === "dom-ok")?.dayOfMonth).toBe(15);
    expect(out.find((r) => r.id === "dom-bad")?.dayOfMonth).toBeUndefined();
    expect(out.find((r) => r.id === "dom-bad-32")?.dayOfMonth).toBeUndefined();
  });

  it("coerces string deeplink object {route} into proper deeplink shape", async () => {
    const item = makeReminder({
      id: "deeplink-route",
      deeplink: { route: "/fasting", hash: "tab-2" } as CustomReminder["deeplink"],
    });
    await saveCustomReminders([item]);
    const out = await loadCustomReminders();
    expect(out[0]?.deeplink).toEqual({ route: "/fasting", hash: "tab-2" });
  });

  it("loadCustomReminderTemplates returns {} when nothing is stored", async () => {
    expect(await loadCustomReminderTemplates()).toEqual({});
  });

  it("dismissTemplate sets a templateId flag and is idempotent", async () => {
    await dismissTemplate("tmpl_morning");
    expect(await loadCustomReminderTemplates()).toEqual({ tmpl_morning: true });
    await dismissTemplate("tmpl_morning");
    expect(await loadCustomReminderTemplates()).toEqual({ tmpl_morning: true });
  });

  it("dismissTemplate ignores empty / non-string inputs", async () => {
    await dismissTemplate("");
    await dismissTemplate(undefined as unknown as string);
    expect(await loadCustomReminderTemplates()).toEqual({});
  });

  it("saveCustomReminderTemplates only keeps boolean values", async () => {
    await saveCustomReminderTemplates({
      a: true,
      b: false,
      // @ts-expect-error — testing non-boolean values
      c: "yes",
      // @ts-expect-error — testing non-boolean values
      d: 1,
    });
    const out = await loadCustomReminderTemplates();
    expect(out).toEqual({ a: true, b: false });
  });

  it("survives IDB read failure and returns [] / {}", async () => {
    const list = await loadCustomReminders();
    const templates = await loadCustomReminderTemplates();
    expect(list).toEqual([]);
    expect(templates).toEqual({});
  });
});
