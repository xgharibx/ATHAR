// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { searchSettings, SETTINGS_GROUPS, SETTINGS_ITEMS } from "@/lib/settingsCatalog";
import { adjustTimings, clampAdjust, shiftClock } from "@/lib/prayerAdjust";
import { forHijri, getHijriOffsetDays, setHijriOffsetDays } from "@/lib/hijri";
import { buildPrayerTopUpPlan } from "@/lib/prayerTopUp";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
if (!("ResizeObserver" in globalThis)) {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe("finding a setting", () => {
  it("finds the option itself for the words people type", () => {
    const first = (q: string) => searchSettings(q)[0]?.item.id;
    const adhan = searchSettings("الأذان").map((r) => r.item.id);
    expect(adhan.slice(0, 3)).toEqual(expect.arrayContaining(["prayer-alerts", "adhan-sound"]));
    expect(first("قفل")).toBe("app-lock");
    expect(first("اهتزاز")).toBe("haptics");
    expect(first("القارئ")).toBe("reciter");
    expect(first("الهجري")).toBe("hijri");
    expect(first("ترجمه")).toBe("translation");
    expect(first("نسخة احتياطية")).toBe("backup");
    expect(searchSettings("كلمة لا وجود لها")).toEqual([]);
    expect(searchSettings("   ")).toEqual([]);
  });

  it("files every option under a real group, with an anchor on its page", () => {
    const ids = new Set(SETTINGS_GROUPS.map((group) => group.id));
    const pages: Record<string, string> = {
      prayer: read("src/components/settings/groups/PrayerGroup.tsx"),
      reminders: read("src/components/settings/groups/RemindersGroup.tsx"),
      quran: read("src/components/settings/groups/QuranGroup.tsx"),
      tasbeeh: read("src/components/settings/groups/TasbeehGroup.tsx"),
      appearance: read("src/components/settings/groups/AppearanceGroup.tsx"),
      home: read("src/components/settings/groups/HomeGroup.tsx"),
      privacy: read("src/components/settings/groups/PrivacyGroup.tsx"),
      data: read("src/components/settings/groups/DataGroup.tsx"),
      about: read("src/components/settings/groups/AboutGroup.tsx"),
    };
    for (const item of SETTINGS_ITEMS) {
      expect(ids.has(item.group), item.id).toBe(true);
      const page = pages[item.group];
      expect(page.includes(`id="${item.id}"`) || page.includes(`setting-${item.id}`) || page.includes(`"${item.id}"`), item.id).toBe(true);
    }
  });
});

describe("moving prayer times by a few minutes", () => {
  it("moves each prayer within the day and keeps any time-zone label", () => {
    expect(shiftClock("04:32", 5)).toBe("04:37");
    expect(shiftClock("04:32 (EET)", -40)).toBe("03:52 (EET)");
    expect(shiftClock("23:58", 10)).toBe("23:59");
    expect(shiftClock("00:03", -10)).toBe("00:00");
    expect(clampAdjust(45)).toBe(30);
    expect(clampAdjust("x")).toBe(0);
    const timings = { Fajr: "04:30", Sunrise: "06:00", Dhuhr: "11:50", Asr: "15:00", Maghrib: "17:20", Isha: "18:45" };
    expect(adjustTimings(timings, { Fajr: 2, Isha: -3 })).toEqual({ ...timings, Fajr: "04:32", Isha: "18:42" });
    expect(adjustTimings(timings, {})).toBe(timings);
  });

  it("reaches the times the phone queues by itself", () => {
    const plan = buildPrayerTopUpPlan({
      scheduledThrough: "2026-11-18",
      coords: { lat: 30.0444, lng: 31.2357 },
      method: 5,
      school: 0,
      templates: {},
      slotCount: 10,
      slotOffset: 100,
      slotForDate: () => 0,
      planDays: 1,
      adjust: { Maghrib: 4 },
    });
    const plain = buildPrayerTopUpPlan({
      scheduledThrough: "2026-11-18",
      coords: { lat: 30.0444, lng: 31.2357 },
      method: 5,
      school: 0,
      templates: {},
      slotCount: 10,
      slotOffset: 100,
      slotForDate: () => 0,
      planDays: 1,
    });
    const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
    expect(minutes(plan.days[0].t.Maghrib) - minutes(plain.days[0].t.Maghrib)).toBe(4);
    expect(plan.days[0].t.Fajr).toBe(plain.days[0].t.Fajr);
  });
});

describe("adjusting the Hijri date", () => {
  afterEach(() => setHijriOffsetDays(0));

  it("shifts the date every Hijri calculation uses, by at most two days", () => {
    const day = new Date(2026, 10, 18, 12);
    expect(forHijri(day)).toBe(day);
    setHijriOffsetDays(1);
    expect(forHijri(day).getDate()).toBe(19);
    setHijriOffsetDays(-5);
    expect(getHijriOffsetDays()).toBe(-2);
    for (const file of ["src/lib/ramadan.ts", "src/lib/qadaa.ts", "src/lib/reminderRecurrence.ts", "src/data/islamicCalendar.ts", "src/pages/Home.tsx", "src/hooks/usePrayerTimes.ts", "src/lib/companionAI.ts", "src/lib/prayerWidget.ts"]) {
      expect(read(file), file).toContain("forHijri(");
    }
  });
});

describe("the Settings pages", () => {
  let container: HTMLDivElement | null = null;
  afterEach(() => {
    container?.remove();
    container = null;
  });

  async function render(path: string) {
    const { SettingsPage } = await import("@/pages/Settings");
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/settings/:group?" element={<SettingsPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    const text = container.textContent ?? "";
    await act(async () => root.unmount());
    return text;
  }

  it("lists the groups with what each is set to", async () => {
    const text = await render("/settings");
    for (const group of SETTINGS_GROUPS) expect(text).toContain(group.title);
    expect(text).toContain("الوضع الليلي");
    expect(text).not.toContain("أصوات التطبيق");
  });

  it.each(SETTINGS_GROUPS.map((group) => [group.id, group.title]))("opens the %s page", async (id, title) => {
    const text = await render(`/settings/${id}`);
    expect(text).toContain(title);
  });

  it("keeps the wording clean", () => {
    const files = [
      "src/pages/Settings.tsx",
      ...SETTINGS_GROUPS.map((group) => `src/components/settings/groups/${group.id[0].toUpperCase()}${group.id.slice(1)}Group.tsx`),
    ];
    for (const file of files) {
      const source = read(file);
      expect(source, file).not.toMatch(/[یک]/); // Persian letters
      expect(source, file).not.toContain("أو إن يضيفها");
      expect(source, file).not.toContain("APK");
      expect(source, file).not.toContain("enableSounds");
    }
  });
});

describe("night mode keeps your themes", () => {
  it("swaps between the last dark and light themes used", async () => {
    const { nightModeTheme, isDarkTheme } = await import("@/lib/settingsTheme");
    localStorage.clear();
    expect(isDarkTheme("faham")).toBe(true);
    expect(isDarkTheme("bustan")).toBe(false);
    expect(nightModeTheme("bustan", true)).toBe("dark");
    expect(nightModeTheme("layl", false)).toBe("bustan");
    expect(nightModeTheme("bustan", true)).toBe("layl");
  });
});
