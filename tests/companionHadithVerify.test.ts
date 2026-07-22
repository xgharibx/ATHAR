// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { verifyHadith, verifyAnswer, verifyAnswerAsync } from "@/lib/companionKnowledge";

describe("verifyHadith", () => {
  it("accepts recognised narrators like «رواه البخاري»", () => {
    const out = verifyHadith("رواه البخاري في صحيحه");
    expect(out.flagged).toBe(false);
    expect(out.plausible).toBe(true);
  });

  it("accepts «أخرجه مسلم»", () => {
    const out = verifyHadith("أخرجه مسلم عن أبي هريرة");
    expect(out.flagged).toBe(false);
  });

  it("flags an invented narrator like «أحمد بن محمد الفقيه»", () => {
    const out = verifyHadith("رواه أحمد بن محمد الفقيه في كتابه");
    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/أحمد بن محمد الفقيه/);
  });

  it("flags invented multi-word narrators like «عبد الله الفرضي الكبير»", () => {
    const out = verifyHadith("رواه عبد الله الفرضي الكبير في كتابه");
    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/عبد الله/);
  });

  it("flags long fabricated chains (multiple «بن»)", () => {
    const out = verifyHadith("رواه محمد بن علي بن عبد الله بن الفرضي");
    expect(out.flagged).toBe(true);
  });

  it("accepts «رواه البيهقي» (recognised compiler)", () => {
    const out = verifyHadith("أخرجه البيهقي");
    expect(out.flagged).toBe(false);
  });
});

describe("verifyAnswer (improved narrator check)", () => {
  it("passes a clean attribution", () => {
    const out = verifyAnswer("رواه البخاري في صحيحه، حديث رقم ١");
    expect(out.notes.some((n) => /البخاري/.test(n))).toBe(false);
  });

  it("flags an invented narrator in attribution phrase", () => {
    const out = verifyAnswer("رواه عبد الله بن عبد الجليل الفرضي الكبير");
    expect(out.flagged).toBe(true);
    expect(out.notes.length).toBeGreaterThan(0);
  });

  it("does not duplicate a note when both the inline attribution loop and verifyHadith() flag the same citation (regression)", () => {
    // verifyAnswer runs its own HADITH_ATTR_RE loop AND calls verifyHadith(),
    // which re-scans the same pattern — an unrecognized joint attribution
    // like "أبو داود والنسائي" used to produce the identical note twice.
    const out = verifyAnswer('قال النبي ﷺ: "أقم الصلاة" — رواه أبو داود والنسائي');
    const dupNotes = out.notes.filter((n) => /أبو داود والنسائي/.test(n));
    expect(dupNotes.length).toBe(1);
    expect(new Set(out.notes).size).toBe(out.notes.length);
  });
});

describe("verifyAnswerAsync", () => {
  it("returns empty report for plain text", async () => {
    const out = await verifyAnswerAsync("نص عادي بلا مراجع");
    expect(out.flagged).toBe(false);
    expect(out.notes).toEqual([]);
  });

  it("flags an invented narrator", async () => {
    const out = await verifyAnswerAsync("رواه محمد بن سعيد الكذّاب");
    expect(out.flagged).toBe(true);
    expect(out.notes.length).toBeGreaterThan(0);
  });
});
