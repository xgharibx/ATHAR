import { describe, expect, it } from "vitest";
import { appLinksToMarkdown } from "@/lib/companionMarkdown";

describe("appLinksToMarkdown", () => {
  it("converts [/route label] into markdown link", () => {
    expect(appLinksToMarkdown("افتح [/quran القرآن] الآن"))
      .toBe("افتح [القرآن](/quran) الآن");
  });

  it("is case-insensitive on route", () => {
    expect(appLinksToMarkdown("[/C/Morning أذكار الصباح]"))
      .toContain("](/c/morning)");
  });

  it("falls back to a label for bare-bracket routes", () => {
    expect(appLinksToMarkdown("انتقل إلى [/quran/]"))
      .toContain("القرآن](/quran)");
    expect(appLinksToMarkdown("[library]"))
      .toContain("المكتبة](/library)");
  });

  it("leaves plain text alone", () => {
    expect(appLinksToMarkdown("ما فضل الاستغفار؟")).toBe("ما فضل الاستغفار؟");
  });

  it("handles multiple links in one message", () => {
    const out = appLinksToMarkdown("افتح [/c/morning أذكار الصباح] ثم [/sebha السبحة]");
    expect(out).toContain("أذكار الصباح](/c/morning)");
    expect(out).toContain("السبحة](/sebha)");
  });
});
