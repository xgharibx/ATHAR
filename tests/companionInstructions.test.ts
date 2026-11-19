import { describe, expect, it } from "vitest";
import { ReplyGuard, finalizeReply } from "../supabase/functions/companion/guard";
import { CREATE_REMINDER_TOOL, SERVER_SYSTEM_PROMPT, focusClientContext } from "../supabase/functions/companion/prompt";
import { buildTrustedResultsBlock } from "../supabase/functions/companion/sources";
import { formatHadithAttribution } from "../supabase/functions/companion/hadith";

const guard = () => new ReplyGuard({ quran: null, hadith: [], trustedTexts: [] });

describe("one consistent set of instructions", () => {
  it("has a single way to show a page button, and no tool for it", () => {
    expect(SERVER_SYSTEM_PROMPT).toContain(":::action(");
    expect(SERVER_SYSTEM_PROMPT).not.toContain("next_step");
  });

  it("orders the reminder confirmation before the tool, in the prompt and in the tool alike", () => {
    expect(SERVER_SYSTEM_PROMPT).toContain("اكتب جملة تأكيد واحدة تذكر اليوم والوقت، ثم استدعِ");
    expect(CREATE_REMINDER_TOOL.description).toContain("قبل الاستدعاء جملة تأكيد واحدة");
  });

  it("keeps supplications in the model's own words out of the Prophet's", () => {
    expect(SERVER_SYSTEM_PROMPT).toMatch(/دعاء قصير بعبارتك العامة/);
    expect(SERVER_SYSTEM_PROMPT).toMatch(/الدعاء المأثور يأتي من كتلة الحديث وحدها/);
  });

  it("allows a longer answer exactly when the reader asks for one", () => {
    expect(SERVER_SYSTEM_PROMPT).toMatch(/فإن طلب المستخدم تفصيلًا أو خاطرة فإلى نحو مئتي كلمة/);
  });

  it("never teaches the model to talk about its attachments", () => {
    expect(SERVER_SYSTEM_PROMPT).not.toMatch(/«الأدلة الموثَّقة» و«نتائج بحث/);
    expect(SERVER_SYSTEM_PROMPT).toContain("لا تذكر «المرفقات»");
  });

  it("does not tell the model to say it has no source when the web results are merely off topic", () => {
    const block = buildTrustedResultsBlock([{ title: "t", url: "https://islamweb.net/a", excerpt: "e" }]);
    expect(block).not.toContain("قل بوضوح إنك لا تملك مصدرًا موثوقًا");
    expect(block).toContain("واعتمد على الأدلة الموثَّقة إن وُجدت");
  });
});

describe("context from earlier app versions", () => {
  it("keeps the facts and drops claims and directions", () => {
    const old = [
      "اليوم: الخميس (2026-11-19)",
      "غدًا الجمعة: فرصة لقراءة سورة الكهف، والصلاة على النبي ﷺ، والدعاء في ساعة الإجابة.",
      "اليوم الخميس: صيامه مستحب (أبو أيوب الأنصاري رضي الله عنه).",
      "رمضان بعد 40 يومًا — إن أراد المستخدم خطة استعدادية فاقترح.",
      "الختمة: اليوم 3 من 30 — متأخر قليلًا (شجِّعه).",
      "",
      "حالة المستخدم: لم يُعرِّف نفسه بعد. اقترح عليه أول محادثة بنبرة ترحيب خفيفة ودافئة، ولا تُكثر الأسئلة.",
    ].join("\n");
    const focused = focusClientContext(old);
    expect(focused).toContain("اليوم: الخميس (2026-11-19)");
    expect(focused).toContain("غدًا الجمعة.");
    expect(focused).toContain("اليوم الخميس.");
    expect(focused).toContain("رمضان بعد 40 يومًا.");
    expect(focused).toContain("الختمة: اليوم 3 من 30 — متأخر قليلًا.");
    expect(focused).not.toMatch(/الكهف|مستحب|أبو أيوب|فاقترح|شجِّعه|اقترح عليه/);
  });
});

describe("the reply checker", () => {
  it("drops the model's outline lines", () => {
    const text = finalizeReply("فقرة ١: حمد الله على الأسبوع.\nالحمد لله الذي أعانك على خمسة أيام من الذكر هذا الأسبوع.\nختام بدعاء + نصيحة عملية.", guard());
    expect(text).toBe("الحمد لله الذي أعانك على خمسة أيام من الذكر هذا الأسبوع.");
  });

  it("drops a tip written out in prose when it also has its block, and any emoji", () => {
    const text = finalizeReply("ابدأ بذكر قصير بعد كل صلاة 👍\nنصيحة عملية: اقرأ الورد قبل المغرب.\n:::tip\nاقرأ الورد قبل المغرب.\n:::", guard());
    expect(text).not.toContain("👍");
    expect(text).not.toContain("نصيحة عملية:");
    expect(text).toContain(":::tip\nاقرأ الورد قبل المغرب.\n:::");
  });

  it("writes a grade without the encyclopedia's brackets", () => {
    expect(formatHadithAttribution({ text: "نص", narrator: "أنس", source: "صحيح البخاري", number: "13", grade: "[صحيح]", grader: "البخاري" } as never))
      .toContain("الدرجة: صحيح — البخاري");
  });
});

describe("a reply the model started over several times", () => {
  it("keeps only the last, fullest version of each restarted paragraph", async () => {
    const { readFileSync } = await import("node:fs");
    const { dropRestartedParagraphs } = await import("../supabase/functions/companion/guard");
    // A real reply from the live service (a Friday reflection, 19 Nov 2026).
    const raw = readFileSync("tests/fixtures_restarted_reply.txt", "utf8").trim();
    const { text, dropped } = dropRestartedParagraphs(raw);
    expect(dropped).toBeGreaterThanOrEqual(4);
    expect(text.match(/الحمد لله الذي/g)).toHaveLength(1);
    // The fullest version, with the adhkar days, is the one kept.
    expect(text).toContain("وأذكارُ المساء في يومين");
    expect(text).toContain("المصادر:");
  });

  it("leaves distinct paragraphs alone", async () => {
    const { dropRestartedParagraphs } = await import("../supabase/functions/companion/guard");
    const text = "الصيام يوم الجمعة وحده مكروه عند جمهور العلماء إلا لمن صام قبله.\n\nوالحكمة أن الجمعة عيد الأسبوع فلا يخص بعبادة دون غيره من الأيام.";
    expect(dropRestartedParagraphs(text)).toEqual({ text, dropped: 0 });
  });
});
