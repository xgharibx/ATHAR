import { describe, expect, it } from "vitest";
import { buildHifzWidgetPayload, sessionPagesOn } from "@/quran2/native/widget";
import { nextFireIsToday, parseTime, reminderBody } from "@/quran2/native/reminder";
import { buildPlan } from "@/quran2/hifz/plan";
import type { Q2HifzPage } from "@/quran2/store";

const DAY = 86_400_000;
// 9:00 local time, so "today" and "tomorrow" are plain to read.
const NOW = new Date(2026, 10, 25, 9, 0, 0).getTime();
const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function page(learnedDaysAgo: number, dueInMs: number, lastDaysAgo = learnedDaysAgo): Q2HifzPage {
  return { s: 10, d: 5, last: NOW - lastDaysAgo * DAY, due: NOW + dueInMs, reps: 2, lapses: 0, learnedAt: NOW - learnedDaysAgo * DAY };
}

describe("The memorisation widget's counts", () => {
  const prefs = { newPerDay: 1, direction: "end" as const, nearCount: 2 };
  const hifz: Record<number, Q2HifzPage> = {
    604: page(40, -2 * DAY), // overdue
    603: page(39, 8 * 3_600_000), // due this evening
    602: page(38, 2 * DAY), // due after tomorrow
    601: page(37, DAY + 3_600_000), // due tomorrow
    600: page(2, 5 * DAY), // near
    599: page(1, 5 * DAY), // near
  };

  it("agrees with the session on today's pages", () => {
    const payload = buildHifzWidgetPayload({ hifz, prefs, learnedLog: {}, now: NOW });
    const plan = buildPlan({ hifz, now: NOW, newCount: 1, direction: "end", nearCount: 2, learnedToday: [] });
    expect(payload).toMatchObject({ memorised: 6, day: dayKey(NOW), newToday: 1, near: 2, nearLater: 2 });
    expect(plan.far.sort()).toEqual([603, 604]); // due today, this evening included
    expect(sessionPagesOn(payload, NOW, 0)).toBe(plan.newPages.length + plan.near.length + plan.far.length);
  });

  it("counts tomorrow's session from the same data", () => {
    const payload = buildHifzWidgetPayload({ hifz, prefs, learnedLog: {}, now: NOW });
    // New lesson + both near pages + far: 604, 603 (still waiting) and 601.
    expect(sessionPagesOn(payload, NOW, 1)).toBe(1 + 2 + 3);
  });

  it("does not ask again today for a page revised today", () => {
    const revised = { ...hifz, 604: page(40, 3_600_000, 0) };
    const payload = buildHifzWidgetPayload({ hifz: revised, prefs, learnedLog: {}, now: NOW });
    const plan = buildPlan({ hifz: revised, now: NOW, newCount: 1, direction: "end", nearCount: 2, learnedToday: [] });
    expect(plan.far).toEqual([603]);
    expect(sessionPagesOn(payload, NOW, 0)).toBe(1 + 2 + 1);
  });

  it("leaves out pages first learned today and the new lesson once done", () => {
    const learnedLog = { [dayKey(NOW)]: [598] };
    const withToday = { ...hifz, 598: page(0, DAY) };
    const payload = buildHifzWidgetPayload({ hifz: withToday, prefs, learnedLog, now: NOW });
    expect(payload.newToday).toBe(0);
    expect(payload.memorised).toBe(7);
    expect(sessionPagesOn(payload, NOW, 0)).toBe(0 + 2 + 2);
  });

  it("is empty before anything is memorised", () => {
    const payload = buildHifzWidgetPayload({ hifz: {}, prefs, learnedLog: {}, now: NOW });
    expect(payload).toMatchObject({ memorised: 0, near: 0, nearLater: 0, dues: [] });
    expect(sessionPagesOn(payload, NOW, 1)).toBe(1);
  });
});

describe("The daily memorisation reminder", () => {
  it("reads a time of day", () => {
    expect(parseTime("06:30")).toEqual({ hour: 6, minute: 30 });
    expect(parseTime("21:05")).toEqual({ hour: 21, minute: 5 });
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("6.30")).toBeNull();
  });

  it("knows whether it rings later today or tomorrow", () => {
    expect(nextFireIsToday("10:00", NOW)).toBe(true);
    expect(nextFireIsToday("09:00", NOW)).toBe(false);
    expect(nextFireIsToday("06:30", NOW)).toBe(false);
  });

  it("says how many pages wait, in Arabic", () => {
    expect(reminderBody(1)).toBe("صفحة واحدة تنتظرك في جلسة اليوم.");
    expect(reminderBody(2)).toBe("صفحتان تنتظرانك في جلسة اليوم.");
    expect(reminderBody(5)).toBe("٥ صفحات تنتظرك في جلسة اليوم.");
    expect(reminderBody(13)).toBe("١٣ صفحة تنتظرك في جلسة اليوم.");
    expect(reminderBody(0)).toContain("درسك الجديد");
  });
});
