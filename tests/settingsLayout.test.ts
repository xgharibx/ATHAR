// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  SECTIONS,
  filterSettingsSections,
  groupVisibleSectionsByCategory,
  firstVisibleSection,
  QUICK_TOGGLE_KEYS,
  isQuickToggleKey,
} from "@/lib/settingsLayout";

describe("settingsLayout section catalog + filter", () => {
  it("SECTIONS contains every anchor id used in Settings.tsx", () => {
    const required = [
      "summary",
      "appearance",
      "home-widgets",
      "reading",
      "quran",
      "translation",
      "tasbeeh",
      "offline-content",
      "reminders",
      "backup",
      "security",
      "content",
      "danger",
    ];
    for (const id of required) {
      expect(SECTIONS.some((s) => s.id === id)).toBe(true);
    }
  });

  it("empty query returns everything in canonical order", () => {
    expect(filterSettingsSections("")).toEqual(SECTIONS.map((s) => s.id));
    expect(filterSettingsSections("   ")).toEqual(SECTIONS.map((s) => s.id));
  });

  it("Arabic query matches section title", () => {
    expect(filterSettingsSections("القرآن")).toContain("quran");
    expect(filterSettingsSections("القرآن")).toContain("translation");
  });

  it("English query matches keywords + description", () => {
    const ids = filterSettingsSections("morning");
    expect(ids).toContain("reminders");
    expect(filterSettingsSections("translation")).toContain("translation");
  });

  it("query that matches nothing returns an empty list", () => {
    expect(filterSettingsSections("zzzz-no-such-thing")).toEqual([]);
  });

  it("firstVisibleSection returns first id from filter", () => {
    expect(firstVisibleSection("")).toBe(SECTIONS[0].id);
    expect(firstVisibleSection("zzzz")).toBeNull();
  });

  it("groupVisibleSectionsByCategory groups + preserves canonical order inside groups", () => {
    const grouped = groupVisibleSectionsByCategory(
      filterSettingsSections(""),
    );
    expect(grouped.length).toBeGreaterThan(0);
    for (const g of grouped) {
      const indices = g.sections.map((s) =>
        SECTIONS.findIndex((ss) => ss.id === s.id),
      );
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i]).toBeGreaterThan(indices[i - 1]!);
      }
    }
  });

  it("quick-toggle helpers expose exactly four entries", () => {
    expect(QUICK_TOGGLE_KEYS).toEqual([
      "enableHaptics",
      "enableSound",
      "darkMode",
      "soundProfile",
    ]);
    expect(isQuickToggleKey("enableHaptics")).toBe(true);
    expect(isQuickToggleKey("nope")).toBe(false);
  });
});
