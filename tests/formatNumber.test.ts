// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { arNum, arTime, arFullDate, westernToArabicDigits, arabicizeNumber } from "@/lib/formatNumber";

describe("arNum — digit conversion", () => {
  it("converts every Western digit 0..9 to Arabic-Indic", () => {
    for (let d = 0; d <= 9; d++) {
      expect(arNum(d)).toBe(["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"][d]);
    }
  });

  it("converts two-digit numbers", () => {
    expect(arNum(42)).toBe("٤٢");
    expect(arNum(99)).toBe("٩٩");
    expect(arNum(10)).toBe("١٠");
  });

  it("adds thousands grouping with Arabic-Indic separator (٬)", () => {
    expect(arNum(1000)).toBe("١٬٠٠٠");
    expect(arNum(1234567)).toBe("١٬٢٣٤٬٥٦٧");
  });

  it("converts decimals with Arabic-Indic decimal point (٫)", () => {
    expect(arNum(1.5)).toBe("١٫٥");
    expect(arNum(0.25)).toBe("٠٫٢٥");
  });

  it("preserves negative sign before digits", () => {
    expect(arNum(-5)).toBe("-٥");
    expect(arNum(-1234)).toBe("-١٬٢٣٤");
  });

  it("preserves zero", () => {
    expect(arNum(0)).toBe("٠");
  });

  it("returns empty string for invalid / non-finite values", () => {
    expect(arNum(NaN)).toBe("");
    expect(arNum(Infinity)).toBe("");
    expect(arNum(-Infinity)).toBe("");
  });

  it("accepts numeric strings and arabicizes grouping + decimal + digits", () => {
    expect(arNum("1,234.5")).toBe("١٬٢٣٤٫٥");
    expect(arNum("0")).toBe("٠");
    expect(arNum("")).toBe("");
    expect(arNum("   ")).toBe("");
  });
});

describe("arNum — never leaks Western digits anywhere in the output", () => {
  const samples: Array<number | string> = [
    0, 1, 9, 10, 42, 100, 999, 1000, 1234, 1234567,
    1.5, 0.25, -1, -1234.5,
    "1,234.5", "999", "0",
  ];
  for (const s of samples) {
    it(`arNum(${JSON.stringify(s)}) has no Western digits`, () => {
      expect(arNum(s)).not.toMatch(/[0-9]/);
    });
  }
});

describe("westernToArabicDigits", () => {
  it("only rewrites digits, leaves punctuation alone", () => {
    expect(westernToArabicDigits("123-456")).toBe("١٢٣-٤٥٦");
    expect(westernToArabicDigits("12:30")).toBe("١٢:٣٠");
    expect(westernToArabicDigits("100%")).toBe("١٠٠%");
  });

  it("handles empty input", () => {
    expect(westernToArabicDigits("")).toBe("");
  });
});

describe("arabicizeNumber", () => {
  it("converts ASCII comma to ٬ and ASCII period to ٫", () => {
    expect(arabicizeNumber("1,234.5")).toBe("١٬٢٣٤٫٥");
    expect(arabicizeNumber("0")).toBe("٠");
    expect(arabicizeNumber("99,999")).toBe("٩٩٬٩٩٩");
  });
});

describe("arTime — Arabic-Indic weekday + HH:MM", () => {
  it("never contains a Western digit anywhere in the output", () => {
    const samples = [
      new Date(2026, 6, 15, 4, 30), // Wed 04:30
      new Date(2026, 0, 1, 0, 0),   // Thu 00:00
      new Date(2026, 11, 31, 23, 59), // Thu 23:59
      new Date(2026, 6, 18, 12, 0),   // Sat 12:00
    ];
    for (const d of samples) {
      const out = arTime(d);
      expect(out).not.toMatch(/[0-9]/);
      // Should contain a colon (kept as ASCII) — or only Arabic letters + digits
      // The : between hour and minute comes from toLocaleString itself; both
      // implementations either emit ":" or "٬" — we just want digits gone.
      expect(out.length).toBeGreaterThan(0);
    }
  });

  it("converts a Chrome-on-Linux style '4:30' into '٤:٣٠' even when the host falls back", () => {
    // Simulate a browser that emits ASCII digits by directly post-processing
    // with westernToArabicDigits (arTime calls it internally).
    const fakeChrome = "4:30";
    const post = westernToArabicDigits(fakeChrome);
    expect(post).toBe("٤:٣٠");
  });

  it("returns empty string for invalid date input", () => {
    expect(arTime(new Date("not-a-date"))).toBe("");
  });
});

describe("arFullDate — Arabic-Indic full long date+time", () => {
  it("never contains a Western digit anywhere in the output", () => {
    const samples = [
      new Date(2026, 6, 15, 4, 30),
      new Date(2026, 0, 1, 12, 0),
      new Date(2025, 11, 31, 23, 59),
    ];
    for (const d of samples) {
      const out = arFullDate(d);
      expect(out).not.toMatch(/[0-9]/);
      expect(out.length).toBeGreaterThan(0);
    }
  });

  it("returns empty string for invalid date input", () => {
    expect(arFullDate(new Date("not-a-date"))).toBe("");
  });
});