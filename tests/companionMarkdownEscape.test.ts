// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { appLinksToMarkdown } from "@/lib/companionMarkdown";

describe("appLinksToMarkdown — escape unescape", () => {
  it("turns \\*\\* into ** so bold renders", () => {
    const out = appLinksToMarkdown("قال \\*\\*قل هو الله أحد\\*\\* ثابت");
    expect(out).toBe("قال **قل هو الله أحد** ثابت");
    expect(out).not.toContain("\\*\\*");
  });

  it("handles mixed unescape + link replacement", () => {
    const out = appLinksToMarkdown("\\*\\*افتح\\*\\* [/quran القرآن] \\*\\*الآن\\*\\*");
    expect(out).toBe("**افتح** [القرآن](/quran) **الآن**");
  });

  it("does not double-touch valid markdown that was never escaped", () => {
    expect(appLinksToMarkdown("**bold** stay"))
      .toBe("**bold** stay");
  });

  it("unescapes other punctuation defensively", () => {
    expect(appLinksToMarkdown("\\# عنوان")).toBe("# عنوان");
    expect(appLinksToMarkdown("\\_underscore\\_")).toBe("_underscore_");
  });
});