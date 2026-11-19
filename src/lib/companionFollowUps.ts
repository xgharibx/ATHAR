/**
 * Questions offered after an answer. The server suggests them on the same
 * topic; an older server sends none, and then a few are matched to the words
 * of the question itself (never of the answer, whose quotations and names
 * matched unrelated topics). No match, no suggestions.
 */
const FOLLOW_UP_TOPICS: Array<[RegExp, string]> = [
  [/صبر|ابتلاء|مصيبة|حزن/, "ادعُ لي بالصبر على الابتلاء"],
  [/شكر|حمد|سعاد|فرح/, "اقترح لي أذكارًا للشكر"],
  [/استغفار|توبة|ذنب|ذنوب|مقصّر|مقصر/, "علّمني بابًا من أبواب التوبة العمليّة"],
  [/آية|تدبر|قرآن|سورة/, "اقترح آية قصيرة عن حالي"],
  [/صلاة|ركوع|سجود|إمام/, "علِّمني دعاءً يقال بعد الصلاة"],
  [/تسبيح|ذكر|أذكار/, "ما أفضل صيغ التسبيح الآن؟"],
  [/موت|ميت|فقد|فقدت|وفاة/, "ادعُ لي ولأهلي ولمن فقدتهم"],
  [/قلق|خوف|همّ|هم |ضيق|أرق/, "اقترح دعاءً يصرف الهم"],
  [/دراسة|امتحان|اختبار/, "ادعُ لي بالتيسير والتوفيق"],
  [/زواج|خطبة|زوجة|زوجي/, "اقترح دعاءً للتوفيق في أمر الزواج"],
  [/رزق|مال|وظيفة|عمل/, "ما أفضل دعاء لتوسعة الرزق؟"],
  [/ابني|بنتي|أولادي|أطفال/, "علّمني كيف أعلّم أطفالي الصلاة"],
  [/بر الوالدين|والدي|والدتي|أمي|أبي/, "ما فضل بر الوالدين عمليًا؟"],
];

export function followUpsFor(fromServer: string[], question: string): string[] {
  if (fromServer.length > 0) return fromServer.slice(0, 3);
  return FOLLOW_UP_TOPICS.filter(([pattern]) => pattern.test(question)).map(([, suggestion]) => suggestion).slice(0, 3);
}
