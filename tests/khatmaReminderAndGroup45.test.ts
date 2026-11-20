import { describe, expect, it } from "vitest";
import {
  KHATMA_REMINDER_ROUTE,
  isKhatmaDayRead,
  khatmaReminderBody,
  khatmaReminderChange,
  khatmaReminderFields,
  newKhatmaReminder,
  type KhatmaPlanState,
} from "@/lib/khatmaReminder";
import { entryBadge } from "@/lib/knowledgeEntry";
import type { CustomReminder } from "@/data/reminderTypes";

const plan = (over: Partial<KhatmaPlanState> = {}): KhatmaPlanState => ({
  startISO: "2026-11-01",
  days: 30,
  version: 2,
  done: {},
  dailyAyahs: {},
  ...over,
});

function asReminder(fields: ReturnType<typeof newKhatmaReminder>): CustomReminder {
  return { ...fields!, id: "cr_1", enabled: true, createdAt: "", updatedAt: "" };
}

describe("Quran plan daily reminder", () => {
  it("names today's wird in Arabic and opens the mushaf", () => {
    const fresh = newKhatmaReminder(plan(), "2026-11-19", "20:00")!;
    expect(fresh.deeplink.route).toBe(KHATMA_REMINDER_ROUTE);
    expect(fresh.repeat).toBe("daily");
    expect(fresh.atTimeOfDay).toBe("20:00");
    // 6236 / 30 = 207.9: the plan's pace, rounded; 208 counts in the plural, like 8.
    expect(fresh.body).toBe("وردك اليوم نحو ٢٠٨ آيات — اضغط لتكمل من حيث توقفت");
    expect(fresh.endDate).toBe("2026-11-30");
    expect(fresh.startDate).toBeUndefined();
  });

  it("is exact for the older plans with a fixed daily target", () => {
    expect(khatmaReminderBody(plan({ version: 1, days: 730 }), "2026-11-19")).toBe("وردك اليوم ٩ آيات — اضغط لتكمل من حيث توقفت");
  });

  it("skips a day already read, whether marked or read in the mushaf", () => {
    expect(isKhatmaDayRead(plan({ done: { "2026-11-19": true } }), "2026-11-19")).toBe(true);
    expect(isKhatmaDayRead(plan({ dailyAyahs: { "2026-11-19": 500 } }), "2026-11-19")).toBe(true);
    expect(isKhatmaDayRead(plan({ dailyAyahs: { "2026-11-19": 3 } }), "2026-11-19")).toBe(false);
    expect(khatmaReminderFields(plan({ done: { "2026-11-19": true } }), "2026-11-19")?.startDate).toBe("2026-11-20");
  });

  it("waits for a plan that starts later", () => {
    expect(khatmaReminderFields(plan({ startISO: "2026-12-01" }), "2026-11-19")?.startDate).toBe("2026-12-01");
  });

  it("goes away with the plan: reset, run out, or finished", () => {
    const reminder = asReminder(newKhatmaReminder(plan(), "2026-11-19", "20:00"));
    expect(khatmaReminderChange(reminder, plan({ startISO: null, days: null }), "2026-11-19")).toEqual({ kind: "delete", id: "cr_1" });
    expect(khatmaReminderChange(reminder, plan(), "2026-12-05")).toEqual({ kind: "delete", id: "cr_1" });
    const allDone = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`2026-11-${String(i + 1).padStart(2, "0")}`, true]));
    expect(khatmaReminderChange(reminder, plan({ done: allDone }), "2026-11-19").kind).toBe("delete");
    // The last day, once read, leaves nothing to remind about.
    expect(khatmaReminderChange(reminder, plan({ done: { "2026-11-30": true } }), "2026-11-30").kind).toBe("delete");
  });

  it("changes only what moved, so it does not churn", () => {
    const reminder = asReminder(newKhatmaReminder(plan(), "2026-11-19", "20:00"));
    expect(khatmaReminderChange(reminder, plan(), "2026-11-19")).toEqual({ kind: "none" });
    expect(khatmaReminderChange(reminder, plan({ done: { "2026-11-19": true } }), "2026-11-19"))
      .toEqual({ kind: "update", id: "cr_1", patch: { startDate: "2026-11-20" } });
    expect(khatmaReminderChange(undefined, plan(), "2026-11-19")).toEqual({ kind: "none" });
  });
});

describe("knowledge entry circles", () => {
  it("shows a numbered entry's number, two digits included, and the name alone", () => {
    expect(entryBadge("10. شرب الخمر")).toEqual({ badge: "١٠", title: "شرب الخمر" });
    expect(entryBadge("1. الشرك بالله")).toEqual({ badge: "١", title: "الشرك بالله" });
    expect(entryBadge("جبريل عليه السلام")).toEqual({ badge: "ج", title: "جبريل عليه السلام" });
  });
});
