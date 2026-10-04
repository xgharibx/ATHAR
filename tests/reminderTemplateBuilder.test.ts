import { describe, expect, it } from "vitest";
import { REMINDER_TEMPLATES } from "@/data/reminderTemplates";
import { nextOccurrences } from "@/lib/reminderRecurrence";
import { buildReminderFromTemplate } from "@/lib/reminderTemplateBuilder";

const byId = (id: string) => {
  const template = REMINDER_TEMPLATES.find((item) => item.id === id);
  if (!template) throw new Error(`Missing reminder template: ${id}`);
  return template;
};

describe("fasting reminder templates", () => {
  it.each([
    ["fast-monday-thursday", "monday-thursday"],
    ["fast-shawwal", "shawwal"],
    ["fast-ayyam-al-beed", "ayyam-al-beed"],
    ["fast-arafah", "arafah"],
    ["fast-ashura", "ashura"],
    ["fast-dhul-hijjah", "dhul-hijjah"],
    ["fast-muharram", "muharram"],
    ["fast-ramadan", "ramadan"],
  ])("preserves the %s Hijri/weekday rule", (id, fastingPattern) => {
    const reminder = buildReminderFromTemplate(byId(id));

    expect(reminder).toMatchObject({ repeat: "fasting_aligned", fastingPattern });
  });

  it("keeps both Monday and Thursday when building the weekly fasting reminder", () => {
    const reminder = buildReminderFromTemplate(byId("fast-monday-thursday"));
    const occurrences = nextOccurrences({
      ...reminder,
      id: "monday-thursday",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }, { now: new Date(2026, 9, 4, 7), count: 4 });

    expect(occurrences.map((date) => date.getDay())).toEqual([1, 4, 1, 4]);
  });

  it("does not leave the Ayyam al-Beed reminder as a one-time monthly alarm", () => {
    const reminder = buildReminderFromTemplate(byId("fast-ayyam-al-beed"));
    const [next] = nextOccurrences({
      ...reminder,
      id: "ayyam-al-beed",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }, { now: new Date(2026, 9, 4, 7), count: 1 });

    expect(next?.getTime()).toBeGreaterThan(new Date(2026, 9, 4, 7).getTime());
  });
});
