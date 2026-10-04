// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyHadith, verifyAnswer, verifyAnswerAsync } from "@/lib/companionKnowledge";
import { idbGetHadithPackEntry } from "@/lib/hadithIDB";

vi.mock("@/lib/hadithIDB", () => ({
  idbGetHadithPackEntry: vi.fn().mockResolvedValue(null),
}));

beforeEach(() => {
  vi.mocked(idbGetHadithPackEntry).mockResolvedValue(null);
});

function setCachedHadith(bookKey: string, number: number, text: string): void {
  vi.mocked(idbGetHadithPackEntry).mockResolvedValue({
    isFresh: true,
    data: {
      key: bookKey,
      title: "",
      titleEn: "",
      color: "",
      order: 1,
      grade: "sahih",
      description: "",
      count: 1,
      sections: [],
      hadiths: [{ n: number, a: number, s: 1, t: text, g: [] }],
    },
  });
}

const bukhariOneQuote = "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى";
const hadithBlock = (content: string) => `:::hadith\n${content}\n:::`;

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
  it("distinguishes a recognized book attribution from verified hadith wording", () => {
    const out = verifyAnswer("رواه البخاري في صحيحه، حديث رقم ١");
    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/لم أتحقق من لفظ الحديث/);
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

  it("does not treat a real collection name as proof of a quoted hadith", async () => {
    const out = await verifyAnswerAsync('قال النبي ﷺ: «نص مختلق لا يطابق حديثًا معروفًا» رواه البخاري');

    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/لم أتحقق من لفظ الحديث/);
    expect(out.notes.join(" ")).not.toMatch(/حديث مكذوب/);
  });

  it("warns when a recognised collector's wording has not been verified", async () => {
    const out = await verifyAnswerAsync('قال النبي ﷺ: «نص مختلق غير متحقق» رواه البيهقي');

    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/لم أتحقق من لفظ الحديث/);
  });

  it("warns when a marked hadith block cites books and numbers but no local source pack is cached", async () => {
    const out = await verifyAnswerAsync(`:::hadith
«إنما الأعمال بالنيات» — متفق عليه (البخاري ١، مسلم ١٩٠٧)
:::`);

    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/لم أتمكن من مطابقة/);
  });

  it("accepts a sufficiently long quote that matches the cited local hadith record", async () => {
    setCachedHadith("bukhari", 1, `قال رسول الله صلى الله عليه وسلم: «${bukhariOneQuote}»`);

    const out = await verifyAnswerAsync(hadithBlock(`«إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى» — البخاري ١`));

    expect(out).toEqual({ flagged: false, notes: [] });
  });

  it("uses the user-facing Arabic book number when it differs from the internal row number", async () => {
    vi.mocked(idbGetHadithPackEntry).mockResolvedValue({
      isFresh: true,
      data: {
        key: "muslim",
        title: "",
        titleEn: "",
        color: "",
        order: 2,
        grade: "sahih",
        description: "",
        count: 1,
        sections: [],
        hadiths: [{ n: 4927, a: "1907.01", s: 1, t: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّةِ وَإِنَّمَا لِامْرِئٍ مَا نَوَى", g: [] }],
      },
    });

    const out = await verifyAnswerAsync(hadithBlock("«إنما الأعمال بالنية وإنما لامرئ ما نوى» — مسلم ١٩٠٧"));

    expect(out).toEqual({ flagged: false, notes: [] });
  });

  it("requires every collection in a joint attribution to contain the quoted wording", async () => {
    vi.mocked(idbGetHadithPackEntry).mockImplementation(async (bookKey) => ({
      isFresh: true,
      data: {
        key: bookKey,
        title: "",
        titleEn: "",
        color: "",
        order: 1,
        grade: "sahih",
        description: "",
        count: 1,
        sections: [],
        hadiths: [{
          n: bookKey === "bukhari" ? 1 : 4927,
          a: bookKey === "bukhari" ? 1 : "1907.01",
          s: 1,
          t: bookKey === "bukhari" ? bukhariOneQuote : "نص آخر لا يطابق الاقتباس المنسوب",
          g: [],
        }],
      },
    }));

    const out = await verifyAnswerAsync(hadithBlock(`«${bukhariOneQuote}» — متفق عليه (البخاري ١، مسلم ١٩٠٧)`));

    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/لا يطابق السجل المحلي لـ «مسلم»/);
  });

  it("does not silently ignore a second citation from an unsupported collection", async () => {
    setCachedHadith("bukhari", 1, bukhariOneQuote);

    const out = await verifyAnswerAsync(hadithBlock(`«${bukhariOneQuote}» — البخاري ١، أحمد ٣`));

    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/الاقتباس أو المرجع غير مكتمل/);
  });

  it("does not silently ignore an unrecognized collector with a numbered citation", async () => {
    setCachedHadith("bukhari", 1, bukhariOneQuote);

    const out = await verifyAnswerAsync(hadithBlock(`«${bukhariOneQuote}» — البخاري ١، ابن خزيمة ٣`));

    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/الاقتباس أو المرجع غير مكتمل/);
  });

  it("does not silently ignore an unrecognized collector without a number", async () => {
    setCachedHadith("bukhari", 1, bukhariOneQuote);

    const out = await verifyAnswerAsync(hadithBlock(`«${bukhariOneQuote}» — البخاري ١، ابن خزيمة`));

    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/الاقتباس أو المرجع غير مكتمل/);
  });

  it("warns when a hadith block is left unterminated", async () => {
    const out = await verifyAnswerAsync(`:::hadith\n«${bukhariOneQuote}» — البخاري ١`);

    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/الاقتباس أو المرجع غير مكتمل/);
  });

  it("does not fall back to an internal row number when the display number is missing", async () => {
    vi.mocked(idbGetHadithPackEntry).mockResolvedValue({
      isFresh: true,
      data: {
        key: "bukhari",
        title: "",
        titleEn: "",
        color: "",
        order: 1,
        grade: "sahih",
        description: "",
        count: 1,
        sections: [],
        hadiths: [{ n: 1, a: undefined as unknown as number, s: 1, t: bukhariOneQuote, g: [] }],
      },
    });

    const out = await verifyAnswerAsync(hadithBlock(`«${bukhariOneQuote}» — البخاري ١`));

    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/لم أعثر على الحديث رقم ١/);
  });

  it("flags altered wording when the cited local hadith record is available", async () => {
    setCachedHadith("bukhari", 1, `قال رسول الله صلى الله عليه وسلم: «${bukhariOneQuote}»`);

    const out = await verifyAnswerAsync(hadithBlock("«إنما الأقوال بالنيات، وإنما لكل امرئ ما نوى» — البخاري ١"));

    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/لا يطابق السجل المحلي/);
  });

  it("does not treat a short common phrase as verified even when it appears in the record", async () => {
    setCachedHadith("bukhari", 1, `قال رسول الله صلى الله عليه وسلم: «${bukhariOneQuote}»`);

    const out = await verifyAnswerAsync(hadithBlock("«خير» — البخاري ١"));

    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/الاقتباس أو المرجع غير مكتمل/);
  });

  it("flags a cited number missing from an available local book pack", async () => {
    setCachedHadith("bukhari", 1, `«${bukhariOneQuote}»`);

    const out = await verifyAnswerAsync(hadithBlock("«إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى» — البخاري ٩٩٩٩"));

    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/لم أعثر على الحديث رقم ٩٩٩٩/);
  });

  it("does not verify wording from a stale local pack", async () => {
    const freshPack = vi.mocked(idbGetHadithPackEntry);
    freshPack.mockResolvedValue({
      isFresh: false,
      data: {
        key: "bukhari",
        title: "",
        titleEn: "",
        color: "",
        order: 1,
        grade: "sahih",
        description: "",
        count: 1,
        sections: [],
        hadiths: [{ n: 1, a: 1, s: 1, t: bukhariOneQuote, g: [] }],
      },
    });

    const out = await verifyAnswerAsync(hadithBlock(`«${bukhariOneQuote}» — البخاري ١`));

    expect(out.flagged).toBe(true);
    expect(out.notes.join(" ")).toMatch(/سجل محلي محمّل/);
  });
});
