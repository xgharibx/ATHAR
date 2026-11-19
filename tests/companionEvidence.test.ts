import { describe, expect, it } from "vitest";
import { extractSources, isAcceptedGrade, parseHadithBlock, parseVerseBlock, replyToPlainText } from "@/lib/companionEvidence";

const reply = `الصيام يوم الجمعة وحده مكروه.

:::hadith
«لا يصم أحدكم يوم الجمعة إلا يوما قبله أو بعده»
— الراوي: أبو هريرة | المصدر: صحيح البخاري (1985) | الدرجة: صحيح — البخاري
:::

:::verse
﴿يا أيها الذين آمنوا كتب عليكم الصيام﴾ — سورة البقرة: 183
:::

:::tip
اجعله مع الخميس.
:::

:::action(/c/morning)
افتح أذكار الصباح
:::

:::reminder
{"title":"صيام الخميس","repeat":"weekly"}
:::

المصادر: [إسلام ويب](https://www.islamweb.net/ar/fatwa/1/)، [الدرر السنية](https://dorar.net/x)`;

describe("verified evidence blocks", () => {
  it("separates a hadith's text from its attribution", () => {
    expect(parseHadithBlock("«لا يصم أحدكم يوم الجمعة»\n— الراوي: أبو هريرة | المصدر: صحيح البخاري (1985) | الدرجة: صحيح — البخاري")).toEqual({
      text: "«لا يصم أحدكم يوم الجمعة»",
      narrator: "أبو هريرة",
      source: "صحيح البخاري",
      number: "١٩٨٥",
      grade: "صحيح",
      grader: "البخاري",
    });
  });

  it("keeps a hadith without the attribution line as it is", () => {
    expect(parseHadithBlock("«نص»")).toEqual({ text: "«نص»" });
  });

  it("separates a verse from its surah and number", () => {
    expect(parseVerseBlock("﴿قل هو الله أحد﴾ — سورة الإخلاص: ١")).toEqual({ text: "﴿قل هو الله أحد﴾", surah: "الإخلاص", ayah: "١" });
    expect(parseVerseBlock("﴿آية﴾ — سورة البقرة: 183-185")).toMatchObject({ surah: "البقرة", ayah: "١٨٣-١٨٥" });
  });

  it("tells accepted grades from weak ones", () => {
    expect(isAcceptedGrade("صحيح")).toBe(true);
    expect(isAcceptedGrade("حسن صحيح")).toBe(true);
    expect(isAcceptedGrade("إسناده ضعيف")).toBe(false);
    expect(isAcceptedGrade(undefined)).toBe(false);
  });

  it("reads the sources line as named links", () => {
    const { text, sources } = extractSources("الجواب.\nالمصادر: [إسلام ويب](https://www.islamweb.net/a)، [الدرر السنية](https://dorar.net/b)");
    expect(text).toBe("الجواب.");
    expect(sources).toEqual([{ name: "إسلام ويب", url: "https://www.islamweb.net/a" }, { name: "الدرر السنية", url: "https://dorar.net/b" }]);
  });
});

describe("a reply as plain text (copy, share, save)", () => {
  const plain = replyToPlainText(reply);
  it("has no block markers, links, buttons or reminder data", () => {
    expect(plain).not.toMatch(/:::|https?:|\]\(|افتح أذكار الصباح|"repeat"/);
  });
  it("keeps the evidence with its attribution and the sources by name", () => {
    expect(plain).toContain("«لا يصم أحدكم يوم الجمعة إلا يوما قبله أو بعده»\n(رواه أبو هريرة، صحيح البخاري ١٩٨٥، صحيح)");
    expect(plain).toContain("﴿يا أيها الذين آمنوا كتب عليكم الصيام﴾ [البقرة: ١٨٣]");
    expect(plain).toContain("اجعله مع الخميس.");
    expect(plain).toContain("المصادر: إسلام ويب، الدرر السنية");
    expect(plain.startsWith("الصيام يوم الجمعة وحده مكروه.")).toBe(true);
  });
});
