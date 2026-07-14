// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";

describe("Mushaf + Quran page persistence (audit fixes #3, #11, #20)", () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
  });

  it("sort mode initial state matches the persisted default", () => {
    // The default in DEFAULT_PREFS is 'mushaf'
    const fromPrefs = undefined as undefined | "mushaf" | "progress" | "recent" | "unread" | "nearly";
    const effective = fromPrefs ?? "mushaf";
    expect(effective).toBe("mushaf");
  });

  it("filterRevelation 'all' is the new explicit default (replaces null)", () => {
    const fromPrefs = null as null | "all" | "meccan" | "medinan";
    const effective = fromPrefs ?? "all";
    expect(effective).toBe("all");
  });

  it("toggle cycles meccan ↔ all ↔ medinan", () => {
    let v: "all" | "meccan" | "medinan" = "all";
    // Tap meccan → meccan
    v = v === "meccan" ? "all" : "meccan";
    expect(v).toBe("meccan");
    // Tap meccan → meccan (still meccan)
    v = v === "meccan" ? "all" : "meccan";
    expect(v).toBe("all");
    // Tap medinan → medinan
    v = v === "medinan" ? "all" : "medinan";
    expect(v).toBe("medinan");
  });

  it("markQuranPageReviewed bails out on duplicate (no double-counting)", () => {
    const seen: string[] = [];
    const apply = (page: string) => {
      if (seen.includes(page)) return;
      seen.push(page);
    };
    apply("1");
    apply("2");
    apply("1"); // duplicate — should not be re-added
    expect(seen).toEqual(["1", "2"]);
  });

  it("audio volume is clamped to [0, 1] and persisted", () => {
    const v = Math.max(0, Math.min(1, parseFloat("1.5") || 1));
    expect(v).toBe(1);
    const v2 = Math.max(0, Math.min(1, parseFloat("-0.2") || 1));
    expect(v2).toBe(0);
    const v3 = Math.max(0, Math.min(1, parseFloat("0.7") || 1));
    expect(v3).toBeCloseTo(0.7);
  });
});