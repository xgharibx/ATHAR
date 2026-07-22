// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { splitHadithText } from "@/lib/hadithText";

describe("splitHadithText", () => {
  it("splits at the LAST marker before the quote, not the first, in a multi-narrator chain", () => {
    // Two "قال:" occurrences — the old (buggy) behavior split at the first
    // one and left the second narrator link sitting inside "matn".
    const text = 'حدثنا آدم قال: حدثنا شعبة عن سعيد عن أبي هريرة قال: "إنما الأعمال بالنيات"';
    const { isnad, matn } = splitHadithText(text);
    expect(isnad).toBe("حدثنا آدم قال: حدثنا شعبة عن سعيد عن أبي هريرة قال:");
    expect(isnad).toContain("شعبة");
    expect(matn).toBe("إنما الأعمال بالنيات");
  });

  it("falls back to the bare quote mark when no marker is present", () => {
    const text = 'رسول الله صلى الله عليه وسلم "من كان يؤمن بالله واليوم الآخر فليقل خيرا أو ليصمت"';
    const { isnad, matn } = splitHadithText(text);
    expect(isnad).toBe("رسول الله صلى الله عليه وسلم");
    expect(matn).toBe("من كان يؤمن بالله واليوم الآخر فليقل خيرا أو ليصمت");
  });

  it("strips the wrapping quote marks and trailing period from matn", () => {
    const text = 'حدثنا أبو هريرة قال: "الطهور شطر الإيمان".';
    const { matn } = splitHadithText(text);
    expect(matn).toBe("الطهور شطر الإيمان");
    expect(matn.includes('"')).toBe(false);
  });

  it("does not pick up a قال marker that occurs INSIDE the quoted matn itself (reported speech within reported speech)", () => {
    const text = 'حدثنا أبو هريرة قال: "سمعت النبي صلى الله عليه وسلم قال: من صلى علي واحدة صلى الله عليه عشرا"';
    const { isnad, matn } = splitHadithText(text);
    // The isnad-side marker (right before the opening quote) wins — not the
    // "قال:" that reappears later, inside the quoted matn itself.
    expect(isnad).toBe("حدثنا أبو هريرة قال:");
    expect(matn).toBe("سمعت النبي صلى الله عليه وسلم قال: من صلى علي واحدة صلى الله عليه عشرا");
  });

  it("returns the whole text as matn with empty isnad when there is no marker and no quote", () => {
    const text = "نص بلا أي علامة فصل";
    const { isnad, matn } = splitHadithText(text);
    expect(isnad).toBe("");
    expect(matn).toBe(text);
  });

  it("handles an empty string without throwing", () => {
    expect(splitHadithText("")).toEqual({ isnad: "", matn: "" });
  });
});
