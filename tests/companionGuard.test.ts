import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildEvidenceBlock, readEvidencePlan } from "../supabase/functions/companion/evidence";
import { GARBLED, REMOVAL_FOOTNOTE, REMOVED_HADITH_NOTE, REMOVED_VERSE_NOTE, ReplyGuard, finalizeReply, finalizeReplyDetailed, isUsableReply, selectCleanAttempt } from "../supabase/functions/companion/guard";
import { isAuthenticGrade, parseDorarResults, selectAuthentic } from "../supabase/functions/companion/hadith";
import { QuranCorpus } from "../supabase/functions/companion/quran";
import { guardMessage, guardSseEvent, newStreamState } from "../supabase/functions/companion/stream";
import { skeleton } from "../supabase/functions/companion/text";

const quran = new QuranCorpus(JSON.parse(readFileSync("public/data/quran.json", "utf8")));

const DORAR_HTML = `<div class="hadith" style="text-align:justify;">1 -  صيامُ يومِ عرفةَ يكفِّرُ سنتَينِ  .</div>
<div class="hadith-info">
    <span class="info-subtitle">الراوي:</span> -</span>
    <span class="info-subtitle">المحدث:</span> فلان
    <span class="info-subtitle">المصدر:</span>  كتاب ما
    <span class="info-subtitle">الصفحة أو الرقم:</span>  3/126
    <span class="info-subtitle">خلاصة حكم المحدث:</span>  <span >ضعيف</span>
</div>
--------------
<div class="hadith" style="text-align:justify;">2 -  <span class="search-keys">صِيامُ</span> يومِ عَرَفَةَ ، إِنِّي أحْتَسِبُ على اللهِ أنْ يُكَفِّرَ السنَةَ التي قَبلَهُ ، و السنَةَ التي بَعدَهُ  .</div>
<div class="hadith-info">
    <span class="info-subtitle">الراوي:</span> أبو قتادة</span>
    <span class="info-subtitle">المحدث:</span> الألباني
    <span class="info-subtitle">المصدر:</span>  صحيح الجامع
    <span class="info-subtitle">الصفحة أو الرقم:</span>  3853
    <span class="info-subtitle">خلاصة حكم المحدث:</span>  <span >صحيح</span>
</div>
--------------
<div class="hadith" style="text-align:justify;">3 -  إنَّما الأعمالُ بالنِّيَّاتِ، وإنَّما لِكُلِّ امرئٍ ما نَوَى  .</div>
<div class="hadith-info">
    <span class="info-subtitle">الراوي:</span> عمر بن الخطاب</span>
    <span class="info-subtitle">المحدث:</span> البخاري
    <span class="info-subtitle">المصدر:</span>  صحيح البخاري
    <span class="info-subtitle">الصفحة أو الرقم:</span>  1
    <span class="info-subtitle">خلاصة حكم المحدث:</span>  <span >[صحيح]</span>
</div>`;

const hadith = selectAuthentic(parseDorarResults(DORAR_HTML), 6);

function guarded(text: string, size = 7, trustedTexts: string[] = [], corpus: QuranCorpus | null = quran): string {
  const guard = new ReplyGuard({ quran: corpus, hadith, trustedTexts });
  let out = "";
  for (let index = 0; index < text.length; index += size) out += guard.push(text.slice(index, index + size));
  return out + guard.flush();
}

describe("Arabic matching", () => {
  it("matches everyday spelling against Uthmani spelling", () => {
    expect(skeleton("ويقيمون الصلاة")).toBe(skeleton("وَيُقِيمُونَ ٱلصَّلَوٰةَ"));
    expect(skeleton("بالآخرة")).toBe(skeleton("بِٱلْءَاخِرَةِ"));
    expect(skeleton("والليل إذا يغشى")).toBe(skeleton("وَٱلَّيْلِ إِذَا يَغْشَىٰ"));
  });
});

describe("Quran corpus", () => {
  it("returns exact text by reference, without the basmala prefix", () => {
    expect(skeleton(quran.byReference("112:1")?.text ?? "")).toBe(skeleton("قل هو الله أحد"));
    expect(quran.byReference("١:١")?.text).toContain("بِسْمِ");
    expect(quran.byReference("2:300")).toBeNull();
    expect(quran.byReference("115:1")).toBeNull();
  });

  it("locates a typed quotation and returns the canonical words", () => {
    const found = quran.findQuote("ألا بذكر الله تطمئن القلوب");
    expect(found).toMatchObject({ surah: 13, from: 28, to: 28 });
    // Only the quoted words come back, not the whole ayah, and with full vowels.
    expect(skeleton(found?.text ?? "")).toBe(skeleton("ألا بذكر الله تطمئن القلوب"));
    expect(found?.text.length).toBeGreaterThan("ألا بذكر الله تطمئن القلوب".length);
  });

  it("does not find text that is not in the Quran", () => {
    expect(quran.findQuote("من حفظ التطبيق دخل الجنة بغير حساب")).toBeNull();
  });
});

describe("hadith evidence", () => {
  it("keeps only narrations graded authentic", () => {
    expect(hadith.map((item) => item.source)).toEqual(["صحيح البخاري", "صحيح الجامع"]);
    expect(isAuthenticGrade("صحيح")).toBe(true);
    expect(isAuthenticGrade("إسناده ضعيف")).toBe(false);
    expect(isAuthenticGrade("لا يصح")).toBe(false);
    expect(isAuthenticGrade("غير صحيح")).toBe(false);
    expect(isAuthenticGrade("")).toBe(false);
  });

  it("reads a plan and discards unsafe queries", () => {
    const plan = readEvidencePlan([{
      type: "tool_use",
      name: "find_evidence",
      input: { hadith_queries: ["صيام يوم عرفة", "x<script>", 5], quran_refs: ["2:183", 9] },
    }]);
    expect(plan).toEqual({ hadithQueries: ["صيام يوم عرفة"], quranReferences: ["2:183"], needsSources: false, wantsWording: false });
  });

  it("tells the model plainly when no hadith was found", () => {
    expect(buildEvidenceBlock([], [])).toContain("فلا تورد أي حديث بلفظه");
    expect(buildEvidenceBlock(hadith, [])).toContain("[H1] «إنما الأعمال بالنيات");
  });
});

describe("reply guard", () => {
  it.each([1, 3, 7, 50, 5000])("inserts the exact verse for a reference (fragment size %i)", (size) => {
    const out = guarded("تأمل هذه الآية:\n:::verse(13:28)\n:::\nوالله أعلم.", size);
    expect(out).toContain(`:::verse\n﴿${quran.byReference("13:28")?.text}﴾ — سورة الرعد: ٢٨\n:::`);
    expect(out).toContain("والله أعلم.");
  });

  it("replaces a typed verse with the canonical text", () => {
    const out = guarded(":::verse\n﴿الا بذكر الله تطمئن القلوب﴾ — سورة البقرة ٥\n:::\n");
    expect(out).toContain(`﴿${quran.findQuote("ألا بذكر الله تطمئن القلوب")?.text}﴾`);
    expect(out).toContain("سورة الرعد: ٢٨");
    expect(out).not.toContain("البقرة");
  });

  it("removes an invented verse, in a block or inline", () => {
    expect(guarded(":::verse\n﴿ومن يتبع التطبيق فله أجر عظيم مضاعف﴾\n:::\n")).toBe(`${REMOVED_VERSE_NOTE}\n`);
    expect(guarded("قال تعالى: ﴿ومن يتبع التطبيق فله أجر عظيم مضاعف﴾ فتأمل.")).toBe(`قال تعالى: ${REMOVED_VERSE_NOTE} فتأمل.`);
  });

  it("shows a gathered hadith in its source wording with its grading", () => {
    const out = guarded(":::hadith(H2)\n:::\n");
    expect(out).toBe(
      ":::hadith\n«صِيامُ يومِ عَرَفَةَ ، إِنِّي أحْتَسِبُ على اللهِ أنْ يُكَفِّرَ السنَةَ التي قَبلَهُ ، و السنَةَ التي بَعدَهُ»\n" +
      "— الراوي: أبو قتادة | المصدر: صحيح الجامع (3853) | الدرجة: صحيح — الألباني\n:::\n",
    );
  });

  it("swaps a paraphrased hadith for the authentic wording", () => {
    const out = guarded(":::hadith\n«إنما الأعمال بالنيات وإنما لكل امرئ ما نوى» — رواه مسلم (٩٩٩٩)\n:::\n");
    expect(out).toContain("«إنَّما الأعمالُ بالنِّيَّاتِ، وإنَّما لِكُلِّ امرئٍ ما نَوَى»");
    expect(out).toContain("المصدر: صحيح البخاري (1)");
    expect(out).not.toContain("٩٩٩٩");
  });

  it("removes an invented hadith block and an unknown evidence id", () => {
    expect(guarded(":::hadith\n«من استعمل التطبيق كل يوم غفر له ما تقدم من ذنبه» — رواه البخاري\n:::\n")).toBe(`${REMOVED_HADITH_NOTE}\n`);
    expect(guarded(":::hadith(H9)\n:::\n")).toBe(`${REMOVED_HADITH_NOTE}\n`);
  });

  it("removes an invented hadith quoted inline, with the attribution before or after", () => {
    const invented = "«من استعمل التطبيق كل يوم غفر له ما تقدم من ذنبه»";
    expect(guarded(`قال النبي ﷺ: ${invented} وهذا فضل عظيم.`)).toBe(`قال النبي ﷺ: ${REMOVED_HADITH_NOTE} وهذا فضل عظيم.`);
    expect(guarded(`ورد ${invented} رواه مسلم.`)).toBe(`ورد ${REMOVED_HADITH_NOTE} رواه مسلم.`);
    expect(guarded(`قال رسول الله ﷺ: «من استعمل التطبيق كل يوم غفر له`)).toContain(REMOVED_HADITH_NOTE);
  });

  it("keeps an inline hadith that matches gathered evidence", () => {
    const text = "قال النبي ﷺ: «إنما الأعمال بالنيات» فأخلص نيتك.";
    expect(guarded(text)).toBe(text);
  });

  it("keeps a hadith that appears word for word in the app's own library excerpt", () => {
    const library = "مقطع: «الطهور شطر الإيمان والحمد لله تملأ الميزان» رواه مسلم";
    const text = "قال النبي ﷺ: «الطهور شطر الإيمان والحمد لله تملأ الميزان» فحافظ على وضوئك.";
    expect(guarded(text, 7, [library])).toBe(text);
    expect(guarded(text)).toContain(REMOVED_HADITH_NOTE);
  });

  it("leaves ordinary quotations and other blocks alone", () => {
    const text = "قال أحد الحكماء: «من عرف نفسه استراح من عناء كثير» وهذه حكمة.\n:::tip\nابدأ بدقيقة واحدة كل صباح.\n:::\n:::action(/c/morning)\nافتح أذكار الصباح\n:::\n";
    expect(guarded(text)).toBe(text);
  });

  it("strips evidence labels echoed into prose but not from links", () => {
    expect(guarded("كما في الحديث (H1) السابق، راجع [إسلام ويب](https://www.islamweb.net/ar/fatwa/h1/x).")).toBe(
      "كما في الحديث السابق، راجع [إسلام ويب](https://www.islamweb.net/ar/fatwa/h1/x).",
    );
  });

  it("never shows a verse when the corpus is unavailable", () => {
    expect(guarded(":::verse(2:255)\n:::\n", 7, [], null)).toBe(`${REMOVED_VERSE_NOTE}\n`);
  });

  it("streams prose sentence by sentence", () => {
    const guard = new ReplyGuard({ quran, hadith, trustedTexts: [] });
    expect(guard.push("الحمد لله رب العالمين. وبعد فهذا")).toBe("الحمد لله رب العالمين.");
    expect(guard.push(" جواب مختصر. ثم")).toBe(" وبعد فهذا جواب مختصر.");
    expect(guard.flush()).toBe(" ثم");
  });

  it("cuts a line where the output breaks down and drops the restarted answer", () => {
    const text = "صيام يوم عرفة سنة مستحبة لغير الحاج. ولا يلزم النية قبل[]سأ، . . . ' 1/2 .صيام يوم عرفة سنة مستحبة لغير الحاج مرة أخرى.\nوالله أعلم بالصواب.";
    expect(guarded(text)).toBe("صيام يوم عرفة سنة مستحبة لغير الحاج.\nوالله أعلم بالصواب.");
  });

  it("does not repeat a sentence the reply already contains", () => {
    const sentence = "صيام يوم عرفة سنة مستحبة لغير الحاج ويكفر الله به سنتين.";
    expect(guarded(`${sentence} وهذا من فضل الله.\n${sentence} فاحرص عليه.`)).toBe(`${sentence} وهذا من فضل الله.\n فاحرص عليه.`);
  });

  it("marks stray foreign words for removal but keeps link addresses", () => {
    expect(guarded("راجع [موقع ابن baz](https://binbaz.org.sa/fatwas/1) وهو additionally نافع.")).toBe(
      `راجع [موقع ابن ](https://binbaz.org.sa/fatwas/1) وهو ${GARBLED} نافع.`,
    );
  });
});

describe("stream filter", () => {
  const finalizeWith = (guard: ReplyGuard) => async (text: string) => finalizeReply(text, guard);

  const sse = (type: string, data: Record<string, unknown>) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}`;
  const delta = (index: number, text: string) => sse("content_block_delta", { index, delta: { type: "text_delta", text } });
  const textOf = (events: string) => events.split("\n\n").filter((event) => event.includes("text_delta"))
    .map((event) => JSON.parse(event.split("data: ")[1]!).delta.text).join("");

  it("holds a reply until the message is complete, then sends the verified text", async () => {
    const finalize = finalizeWith(new ReplyGuard({ quran, hadith, trustedTexts: [] }));
    const state = newStreamState();
    const start = sse("content_block_start", { index: 1, content_block: { type: "text", text: "" } });
    expect(await guardSseEvent(start, finalize, state)).toBe(`${start}\n\n`);
    const thinking = sse("content_block_delta", { index: 0, delta: { type: "thinking_delta", thinking: "x" } });
    expect(await guardSseEvent(thinking, finalize, state)).toBe(`${thinking}\n\n`);
    expect(await guardSseEvent(delta(1, "النية أساس العمل.\n:::hadith(H1)\n"), finalize, state)).toBe("");
    expect(await guardSseEvent(delta(1, ":::\n"), finalize, state)).toBe("");
    const stop = sse("content_block_stop", { index: 1 });
    expect(await guardSseEvent(stop, finalize, state)).toBe("");
    const end = sse("message_delta", { delta: { stop_reason: "end_turn" } });
    const released = await guardSseEvent(end, finalize, state);
    expect(released.endsWith(`${stop}\n\n${end}\n\n`)).toBe(true);
    expect(textOf(released)).toContain("النية أساس العمل.");
    expect(textOf(released)).toContain("صحيح البخاري");
  });

  it("treats two text blocks as one reply: a restart is not shown twice", async () => {
    const finalize = finalizeWith(new ReplyGuard({ quran, hadith, trustedTexts: [] }));
    const state = newStreamState();
    const answer = "النية أساس كل عمل صالح، وبها يتفاضل الناس عند الله.\n:::hadith(H1)\n:::\n";
    for (const index of [0, 2]) {
      await guardSseEvent(sse("content_block_start", { index, content_block: { type: "text", text: "" } }), finalize, state);
      await guardSseEvent(delta(index, answer), finalize, state);
      await guardSseEvent(sse("content_block_stop", { index }), finalize, state);
    }
    const released = await guardSseEvent(sse("message_stop", {}), finalize, state);
    const text = textOf(released);
    expect(text.match(/:::hadith/g)).toHaveLength(1);
    expect(text.match(/النية أساس كل عمل صالح/g)).toHaveLength(1);
    expect(released.match(/event: content_block_stop/g)).toHaveLength(2);
  });

  it("guards a complete message", async () => {
    const finalize = finalizeWith(new ReplyGuard({ quran, hadith, trustedTexts: [] }));
    const message = await guardMessage({
      content: [{ type: "text", text: "الإخلاص شرط قبول العمل. قال ﷺ: «من استعمل التطبيق كل يوم غفر له ما تقدم»" }],
    }, finalize) as { content: Array<{ text: string }> };
    expect(message.content[0]?.text).toBe(`الإخلاص شرط قبول العمل.\n\n${REMOVAL_FOOTNOTE}`);
  });
});

describe("the model's own sentences", () => {
  const finalize = (text: string, userTexts: string[] = []) =>
    finalizeReplyDetailed(text, new ReplyGuard({ quran, hadith, trustedTexts: [], userTexts }));

  it("drops a clause that holds a word in another script, and keeps the rest", () => {
    const reply = finalize("نعم، يجوز المسح على الجوربين في الوضوء، وقد practiced الصحابة ذلك، وهو قول جمهور أهل العلم.");
    expect(reply.text).toBe("نعم، يجوز المسح على الجوربين في الوضوء، وهو قول جمهور أهل العلم.");
    expect(reply.damage).toBe(1);
  });

  it("drops a report of the Prophet's practice written in the model's own words", () => {
    const reply = finalize("قراءة سورة الكهف يوم الجمعة مستحبة. وقد ورد في صحيح مسلم أن النبي ﷺ كان يقرأ في فجر الجمعة سورة الكهف. فاحرص عليها كل أسبوع.");
    expect(reply.text).toBe("قراءة سورة الكهف يوم الجمعة مستحبة. فاحرص عليها كل أسبوع.");
  });

  it("drops a report whatever the word order", () => {
    expect(finalize("ومن فوائدها أنها وقاية من الفتن. فقد كان النبي ﷺ يأمر بفواتحها من يخاف الفتنة. فاحفظ أولها.").text)
      .toBe("ومن فوائدها أنها وقاية من الفتن. فاحفظ أولها.");
  });

  it("keeps the answer and cuts only the unverified report that follows it", () => {
    expect(finalize("نعم، يجوز الجمع بين الصلاتين للمسافر، وقد ثبت عن النبي ﷺ أنه جمع في أسفاره كلها دائمًا.").text)
      .toBe("نعم، يجوز الجمع بين الصلاتين للمسافر.");
  });

  it("keeps an introduction that is followed by a verified hadith, and drops one that is not", () => {
    expect(finalize("النية أساس العمل، كما في الحديث:\n:::hadith(H1)\n:::").text).toContain("كما في الحديث:\n:::hadith");
    expect(finalize("النية أساس العمل. كما في حديث عائشة رضي الله عنها:\n:::hadith(H9)\n:::\nفأخلص نيتك لله.").text)
      .toBe(`النية أساس العمل.\nفأخلص نيتك لله.\n\n${REMOVAL_FOOTNOTE}`);
  });

  it("drops a tip the model garbled, and a sentence whose quotation failed verification", () => {
    const reply = finalize("الخشوع ثمرة حضور القلب.\n:::tip\nاجعل لصلاتك وقتًا مع الت commitment\n:::\nقال النبي ﷺ: «من خشع في تطبيقه دخل الجنة بلا حساب» فتأمل.");
    expect(reply.text).toBe(`الخشوع ثمرة حضور القلب.\n\n${REMOVAL_FOOTNOTE}`);
  });

  it("does not treat ordinary religious wording as a report", () => {
    const text = "الصلاة على النبي ﷺ من أفضل الأذكار، فأكثر منها يوم الجمعة. وجاء في القرآن الأمر بالصبر والصلاة. واحرص على اتباع سنة النبي ﷺ في يومك.";
    expect(finalize(text).text).toBe(text);
  });

  it("removes a supplication typed out in quotation marks, even with no source named", () => {
    const reply = finalize("دعاء الاستخارة معروف.\n«اللهم إني أستخيرك بعلمك وأستقدرك بقدرتك فاطرد عني الشر بقدرتك وأمانتك».\nفاحرص عليه.");
    expect(reply.text).toBe(`دعاء الاستخارة معروف.\nفاحرص عليه.\n\n${REMOVAL_FOOTNOTE}`);
  });

  it("removes a misquotation of a gathered hadith from running text", () => {
    const reply = finalize("النية أصل العمل. وقل دائمًا «إنما الأعمال بالنيات والله يغفر لكل امرئ ما نوى» قبل كل عمل. فأخلص نيتك لله وحده.");
    expect(reply.text).toBe(`النية أصل العمل. فأخلص نيتك لله وحده.\n\n${REMOVAL_FOOTNOTE}`);
  });

  it("drops a tip that states a virtue, a ruling or a count, and keeps a practical one", () => {
    expect(finalize("اقرأ قبل نومك.\n:::tip\nلا تنم قبل قراءة ثلاث آيات من آخر سورة البقرة فهي حرز لك.\n:::").text).toBe("اقرأ قبل نومك.");
    const practical = "اقرأ قبل نومك.\n:::tip\nضع المصحف قرب سريرك وأبعد الهاتف قبل النوم.\n:::";
    expect(finalize(practical).text).toBe(practical);
  });

  it("keeps a short everyday quotation", () => {
    const text = "قل لنفسك كل صباح «سأبدأ بذكر الله ثم أمضي» ثم امضِ في يومك.";
    expect(finalize(text).text).toBe(text);
  });

  it("lets the reply repeat a narration the user asked about", () => {
    const reply = "حديث «اطلبوا العلم ولو في الصين» لا يصح عن النبي ﷺ.";
    expect(finalize(reply, ["هل حديث اطلبوا العلم ولو في الصين صحيح؟"]).text).toBe(reply);
  });
});

describe("reply usability", () => {
  it("accepts Arabic replies, including short ones and tool-only replies", () => {
    expect(isUsableReply("وعليكم السلام ورحمة الله")).toBe(true);
    expect(isUsableReply("")).toBe(true);
    expect(isUsableReply("الجواب كذا.\nالمصادر: [إسلام ويب](https://www.islamweb.net/ar/fatwa/1/some-long-english-slug)")).toBe(true);
  });

  it("rejects a reply that drifted into another language", () => {
    expect(isUsableReply("The hadith is not authentic; scholars such as al-Albani graded it as fabricated.")).toBe(false);
    expect(isUsableReply("الحديث is graded by scholars as mawdu and it has no sound chain of narration at all")).toBe(false);
  });
});

describe("hadith grading filter", () => {
  it.each(["صحيح", "[صحيح]", "إسناده صحيح", "حسن", "حسن صحيح", "ثابت", "إسناده جيد"])("accepts %s", (grade) => {
    expect(isAuthenticGrade(grade)).toBe(true);
  });

  it.each([
    "له شاهد في صحيح مسلم",
    "صحيح لغيره",
    "حسن غريب",
    "أصله في صحيح مسلم",
    "رجاله رجال الصحيح",
    "صحيح إن شاء الله",
    "اختلف في إسناده لكنه صحيح من وجوه",
    "صحيحه بعضهم وضعفه آخرون",
    "لا يصح",
  ])("rejects %s", (grade) => {
    expect(isAuthenticGrade(grade)).toBe(false);
  });
});

describe("breakdown recovery", () => {
  const answer = "صيام يوم عرفة سنة مستحبة لغير الحاج، وفيه فضل عظيم ثابت.\nأما الحاج فالسنة له أن يفطر ذلك اليوم ليتقوى على الدعاء.";

  it("returns a clean reply unchanged", () => {
    expect(selectCleanAttempt(answer)).toBe(answer);
  });

  it("keeps the final attempt when the model broke down and restarted", () => {
    const broken = "صيام يوم عرفة سنة مستحبة لغير الحاج، وفيه فضل. أما الحاج فلا يصوم؛ إ.。“”。" + answer +
      "\n\n     ? .\n\n       ?     ,   .    ,   .\n\n'   110 " + answer;
    expect(selectCleanAttempt(broken)).toBe(answer);
  });

  it("keeps the longer attempt when the final one was cut short", () => {
    expect(selectCleanAttempt(`${answer}\n . . . ' 1/2 .\nصيام يوم عرفة سنة مستحبة لغير الحاج ولكن`)).toBe(answer);
  });

  it("does not treat block markers or citations as a breakdown", () => {
    const reply = ":::hadith(H1)\n:::\n:::verse(2:255)\n:::\n- نقطة أولى.\n- نقطة ثانية.\nالمصادر: [إسلام ويب](https://www.islamweb.net/ar/fatwa/1)";
    expect(selectCleanAttempt(reply)).toBe(reply);
  });
});

describe("a narration the user asked about", () => {
  const asked = "هل حديث اطلبوا العلم ولو في الصين صحيح؟";
  const reply = "حديث «اطلبوا العلم ولو في الصين» لا يصح عن النبي ﷺ.";

  it("may be repeated back in a sentence", () => {
    const guard = new ReplyGuard({ quran, hadith, trustedTexts: [], userTexts: [asked] });
    expect(finalizeReply(reply, guard)).toBe(reply);
  });

  it("is still never shown as a verified hadith block", () => {
    const guard = new ReplyGuard({ quran, hadith, trustedTexts: [], userTexts: [asked] });
    expect(finalizeReply("هذا الحديث لا يصح.\n:::hadith\n«اطلبوا العلم ولو في الصين» — رواه البخاري\n:::", guard))
      .toBe(`هذا الحديث لا يصح.\n\n${REMOVAL_FOOTNOTE}`);
  });
});

describe("source links", () => {
  const finalize = (text: string, sourceUrls: string[]) =>
    finalizeReply(text, new ReplyGuard({ quran, hadith, trustedTexts: [], sourceUrls }));
  const fatwa = "https://binbaz.org.sa/fatwas/7561/x";

  it("names a trusted site correctly, whatever the model called it", () => {
    expect(finalize(`الجواب كذا.\nالمصادر: [محمد بن إبراهيم](${fatwa})`, [fatwa])).toBe(
      `الجواب كذا.\n\nالمصادر: [موقع الشيخ ابن باز](${fatwa})`,
    );
  });

  it("labels a bare line of links as the sources line, and shows one link per site", () => {
    const second = "https://binbaz.org.sa/fatwas/7562/y";
    expect(finalize(`الجواب كذا.\n- [أ](${fatwa}) [ب](${second})`, [fatwa, second])).toBe(
      `الجواب كذا.\n\nالمصادر: [موقع الشيخ ابن باز](${fatwa})`,
    );
  });

  it("gathers links from several lines into one sources line at the end", () => {
    const second = "https://www.islamweb.net/ar/fatwa/1/x";
    expect(finalize(`الجواب كذا.\n[أ](${fatwa})\n[ب](${second})\nوالله أعلم.`, [fatwa, second])).toBe(
      `الجواب كذا.\nوالله أعلم.\n\nالمصادر: [موقع الشيخ ابن باز](${fatwa})، [إسلام ويب](${second})`,
    );
  });

  it("removes links to other sites and to pages the search did not return", () => {
    const text = `الجواب كذا.\nالمصادر: [موقع](https://example.com/a) [ابن باز](https://binbaz.org.sa/fatwas/9999/invented)`;
    expect(finalize(text, [fatwa])).toBe("الجواب كذا.");
  });
});

describe("choosing among versions of one hadith", () => {
  const short = "إنما الأعمال بالنيات وإنما لكل امرئ ما نوى";
  const long = "إنما الأعمال بالنيات وإنما لكل امرئ ما نوى فمن كانت هجرته إلى الله ورسوله فهجرته إلى الله ورسوله ومن كانت هجرته لدنيا يصيبها أو امرأة ينكحها فهجرته إلى ما هاجر إليه";
  const results = [short, long].map((text) => ({ text, narrator: "عمر", grader: "الألباني", source: "صحيح الجامع", number: "1", grade: "صحيح" }));

  it("prefers the shortest by default and the fullest when the wording was asked for", () => {
    expect(selectAuthentic(results, 3).map((item) => item.text)).toEqual([short]);
    expect(selectAuthentic(results, 3, true).map((item) => item.text)).toEqual([long]);
  });
});
