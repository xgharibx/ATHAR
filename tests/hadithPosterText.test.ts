import { describe, expect, it } from "vitest";
import { wrapHadithPosterText } from "@/lib/hadithPosterText";

describe("wrapHadithPosterText", () => {
  it("preserves Arabic word order while wrapping to the measured width", () => {
    const text = "إنما الأعمال بالنيات";
    const lines = wrapHadithPosterText(text, 12, (line) => line.length);

    expect(lines).toEqual(["إنما الأعمال", "بالنيات"]);
    expect(lines.join(" ")).toBe(text);
  });

  it("normalizes whitespace without dropping words", () => {
    expect(wrapHadithPosterText("كلمة\n  أخرى", 100, (line) => line.length)).toEqual([
      "كلمة أخرى",
    ]);
  });
});
